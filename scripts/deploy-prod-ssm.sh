#!/usr/bin/env bash
# Deploy BulkSkart frontend to production via S3 + AWS SSM (no SSH required).
# Works from a local CLI, Cursor/AI, or GitHub Actions.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Fill any unset vars from deploy/bulkskart/prod.env without clobbering
# values already provided by the shell or GitHub Actions.
if [[ -f "$ROOT/deploy/bulkskart/prod.env" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "$line" || "$line" != *=* ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    if [[ -z "${!key:-}" ]]; then
      printf -v "$key" '%s' "$val"
      export "$key"
    fi
  done < "$ROOT/deploy/bulkskart/prod.env"
fi

AWS_REGION="${AWS_REGION:-ap-south-1}"
INSTANCE_ID="${INSTANCE_ID:-i-0984845bd6a4b06b1}"
DEPLOY_BUCKET="${DEPLOY_BUCKET:-bulkskart-deploy-prod-446333449297}"
DEPLOY_PREFIX="${DEPLOY_PREFIX:-frontend/dist}"
STACK_DIR="${STACK_DIR:-/opt/bulkskart/stack}"

# Use the dedicated deploy profile only on a laptop that has it.
# GitHub Actions injects AWS_ACCESS_KEY_ID and must not switch profiles.
if [[ -z "${AWS_PROFILE:-}" && -z "${AWS_ACCESS_KEY_ID:-}" ]] \
  && aws configure list-profiles 2>/dev/null | grep -qx 'bulkskart-ai'; then
  AWS_PROFILE=bulkskart-ai
fi
export AWS_REGION INSTANCE_ID AWS_PROFILE

AWS_ARGS=(--region "$AWS_REGION")
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_ARGS+=(--profile "$AWS_PROFILE")
fi

aws_cli() {
  aws "${AWS_ARGS[@]}" "$@"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

wait_ssm() {
  local cmd_id="$1"
  local status=""
  local i
  for i in $(seq 1 120); do
    status="$(aws_cli ssm get-command-invocation \
      --command-id "$cmd_id" \
      --instance-id "$INSTANCE_ID" \
      --query Status --output text 2>/dev/null || true)"
    case "$status" in
      Success|Cancelled|TimedOut|Failed) echo "$status"; return 0 ;;
    esac
    sleep 3
  done
  echo "${status:-Unknown}"
}

dump_ssm() {
  local cmd_id="$1"
  echo "----- SSM stdout -----"
  aws_cli ssm get-command-invocation --command-id "$cmd_id" --instance-id "$INSTANCE_ID" \
    --query StandardOutputContent --output text || true
  echo "----- SSM stderr -----"
  aws_cli ssm get-command-invocation --command-id "$cmd_id" --instance-id "$INSTANCE_ID" \
    --query StandardErrorContent --output text || true
}

echo "==> Verifying AWS identity"
aws_cli sts get-caller-identity --query 'Arn' --output text \
  || die "AWS credentials are missing. On a laptop use profile bulkskart-ai. In GitHub, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."

echo "==> Target instance ${INSTANCE_ID} bucket ${DEPLOY_BUCKET}"
PING="$(aws_cli ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
  --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)"
[[ "$PING" == "Online" ]] || die "SSM agent is not Online on ${INSTANCE_ID} (status=${PING:-missing})."

echo "==> Reading production ANON_KEY via SSM"
ANON_CMD_ID="$(aws_cli ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "bulkskart-read-anon-key" \
  --parameters 'commands=["grep ^ANON_KEY= /opt/bulkskart/stack/.env | cut -d= -f2-"]' \
  --timeout-seconds 60 \
  --query 'Command.CommandId' --output text)"
ANON_STATUS="$(wait_ssm "$ANON_CMD_ID")"
PROD_ANON="$(aws_cli ssm get-command-invocation --command-id "$ANON_CMD_ID" --instance-id "$INSTANCE_ID" \
  --query StandardOutputContent --output text | tr -d '\r' | head -n1 | tr -d '\n' || true)"
if [[ -z "$PROD_ANON" || "$PROD_ANON" == "None" || "$ANON_STATUS" != "Success" ]]; then
  dump_ssm "$ANON_CMD_ID"
  die "Failed to read ANON_KEY from production (status=${ANON_STATUS})."
fi

export VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-https://www.bulkskart.com}"
export VITE_SUPABASE_ANON_KEY="$PROD_ANON"
export VITE_GTM_ID="${VITE_GTM_ID:-GTM-T4HWCGKD}"
export VITE_APP_ID="${VITE_APP_ID:-app-egd29h5g4zcx}"

echo "==> Building frontend"
rm -rf dist
pnpm_ok=0
if command -v pnpm >/dev/null 2>&1 && pnpm --version >/dev/null 2>&1; then
  pnpm_ok=1
fi
if [[ "$pnpm_ok" == 1 && -f pnpm-lock.yaml ]]; then
  pnpm install --frozen-lockfile
  pnpm exec vite build --outDir dist --logLevel error
elif [[ -x node_modules/.bin/vite ]]; then
  echo "pnpm is unavailable; building with the local Vite binary"
  node_modules/.bin/vite build --outDir dist --logLevel error
else
  npm install --no-fund --no-audit
  npx vite build --outDir dist --logLevel error
fi
test -f dist/index.html || die "Build did not produce dist/index.html"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD 2>/dev/null || echo local)"
S3_URI="s3://${DEPLOY_BUCKET}/${DEPLOY_PREFIX}/${STAMP}"
APPLY_URI="s3://${DEPLOY_BUCKET}/releases/apply/${STAMP}.sh"
echo "==> Uploading dist to ${S3_URI}"
aws_cli s3 sync dist/ "$S3_URI/" --delete --only-show-errors

APPLY_LOCAL="$(mktemp)"
cat > "$APPLY_LOCAL" <<EOF
#!/bin/bash
set -euo pipefail
export AWS_DEFAULT_REGION=${AWS_REGION}
TMP=\$(mktemp -d)
aws s3 sync ${S3_URI}/ "\$TMP/" --delete --only-show-errors --region ${AWS_REGION}
test -f "\$TMP/index.html"
mkdir -p ${STACK_DIR}/frontend/dist
# mktemp is mode 700; do not copy that onto the web root or nginx returns 403.
rsync -a --delete --chmod=D755,F644 "\$TMP/" ${STACK_DIR}/frontend/dist/
chmod -R a+rX ${STACK_DIR}/frontend/dist
docker restart bulkskart-web
rm -rf "\$TMP"
echo DEPLOY_OK ${STAMP}
EOF
aws_cli s3 cp "$APPLY_LOCAL" "$APPLY_URI" --only-show-errors
rm -f "$APPLY_LOCAL"

echo "==> Applying release on EC2 via SSM"
PARAMS_FILE="$(mktemp)"
python3 - "$PARAMS_FILE" "$APPLY_URI" "$AWS_REGION" <<'PY'
import json, sys
path, apply_uri, region = sys.argv[1:]
cmd = f"aws s3 cp {apply_uri} /tmp/bulkskart-apply.sh --region {region} && bash /tmp/bulkskart-apply.sh"
with open(path, "w") as fh:
    json.dump({"commands": [cmd]}, fh)
PY
APPLY_CMD_ID="$(aws_cli ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment "bulkskart-apply-frontend" \
  --timeout-seconds 300 \
  --parameters "file://${PARAMS_FILE}" \
  --query 'Command.CommandId' --output text)"
rm -f "$PARAMS_FILE"

APPLY_STATUS="$(wait_ssm "$APPLY_CMD_ID")"
dump_ssm "$APPLY_CMD_ID"
if [[ "$APPLY_STATUS" != "Success" ]]; then
  die "SSM apply failed with status=${APPLY_STATUS} command=${APPLY_CMD_ID}"
fi

echo "==> Checking live site"
HTTP_CODE="$(curl -sS -o /dev/null -w "%{http_code}" https://www.bulkskart.com/ || true)"
echo "live_http=${HTTP_CODE}"
if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "301" && "$HTTP_CODE" != "302" ]]; then
  die "Live site returned HTTP ${HTTP_CODE}"
fi
echo "Deploy complete: ${STAMP}"
