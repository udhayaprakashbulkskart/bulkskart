import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A query that names a column the table does not have fails with HTTP 400, and the page quietly shows nothing.
 * (The bidder pop-up once asked the companies table for a phone number it does not store.)
 * This checks the plain columns of every explicit `from('companies').select('...')` against the schema file.
 */
const root = path.resolve(__dirname, '../..');
const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');

function columnsOf(table: string): Set<string> {
  const body = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS "public"\\."${table}" \\(([\\s\\S]*?)\\n\\);`))?.[1] ?? '';
  return new Set([...body.matchAll(/^\s+"([a-z_0-9]+)"/gm)].map((m) => m[1]));
}

function topLevelColumns(select: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of select) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p && !/[()*:!]/.test(p));
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('database queries only name columns that exist', () => {
  const companyColumns = columnsOf('companies');

  it('the schema file describes the companies table', () => {
    expect(companyColumns.has('company_name')).toBe(true);
    // Suppliers' contact numbers are not stored on companies, so no page may select one from there.
    expect(companyColumns.has('contact_phone')).toBe(false);
  });

  it('every explicit select on companies uses existing columns', () => {
    const problems: string[] = [];
    for (const file of sourceFiles(path.join(root, 'src'))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\.from\(\s*'companies'\s*\)\s*\.select\(\s*'([^']+)'/g)) {
        for (const column of topLevelColumns(m[1])) {
          if (!companyColumns.has(column)) problems.push(`${path.relative(root, file)}: companies.${column}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
