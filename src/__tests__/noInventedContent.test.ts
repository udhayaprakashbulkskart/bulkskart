import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const srcDir = path.resolve(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx|json)$/.test(entry.name) ? [full] : [];
  });
}

const files = sourceFiles(srcDir);
const text = new Map(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));

/** Things that used to be shown to visitors as if they were real, and must not come back. */
const BANNED: Array<[string, string]> = [
  ['98201 44892', 'a hard-coded phone number used as every bidder\'s contact'],
  ['98450 12894', 'a hard-coded phone number for an invented bidder'],
  ['INFOPOD', 'a developer name rewritten on screen'],
  ['BK-SHIP-', 'a random shipment reference for a request nobody received'],
  ['Partner Dispatched', 'a status badge for a request nobody received'],
  ['Pune Heavy Machinery Tech', 'an invented "verified" supplier'],
  ['Gujarat Precision Hydraulics', 'an invented "verified" supplier'],
  ['Metro Cable & Power Corp', 'an invented bidder profile'],
  ['bs_reports', 'reports saved only in the visitor\'s own browser'],
  ['deterministic authentic phone', 'phone numbers made up from a company slug'],
  ['expandedGlobalProducts', 'the 3 MB generated product catalogue'],
  ['alibabaVerifiedSuppliers', 'the generated "verified supplier" list'],
  ['largeRequirementsDataset', 'the generated RFQ list'],
  ['buyerProfilesPool', 'the generated buyer names'],
  ['LiveBuyerOrderAlert', 'the simulated "someone just ordered" pop-up'],
  ['Simulate send', 'a contact form that sent nothing'],
  ['BS-RFQ-1042', 'a sample RFQ shown as the buyer\'s own'],
];

describe('invented content stays out of the app', () => {
  for (const [needle, why] of BANNED) {
    it(`no "${needle}" (${why})`, () => {
      const hits = [...text].filter(([, content]) => content.includes(needle)).map(([file]) => path.relative(srcDir, file));
      expect(hits).toEqual([]);
    });
  }

  it('bundles no generated data set: no data file is over 300 KB', () => {
    const big = files.filter((file) => /[\\/](data|lib)[\\/]/.test(file) && fs.statSync(file).size > 300 * 1024).map((file) => path.relative(srcDir, file));
    expect(big).toEqual([]);
  });
});
