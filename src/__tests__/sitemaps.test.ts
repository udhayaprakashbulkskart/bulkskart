import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const publicDir = path.resolve(__dirname, '../../public');
const read = (name: string) => fs.readFileSync(path.join(publicDir, name), 'utf8');
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

describe('sitemaps', () => {
  const index = locs(read('sitemap.xml'));

  it('the index lists only sitemap files that exist', () => {
    expect(index.length).toBeGreaterThan(0);
    for (const url of index) {
      const file = url.replace('https://www.bulkskart.com/', '');
      expect(fs.existsSync(path.join(publicDir, file)), file).toBe(true);
    }
  });

  it('no generated product, company or RFQ sitemaps are left behind', () => {
    for (const name of ['sitemap-products.xml', 'sitemap-companies.xml', 'sitemap-rfqs.xml']) {
      expect(fs.existsSync(path.join(publicDir, name)), name).toBe(false);
    }
  });

  it('every listed page is a route the app really has, and none is a detail page for a made-up record', () => {
    const routes = [...fs.readFileSync(path.resolve(__dirname, '../routes.tsx'), 'utf8').matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
    const matchers = routes.map((route) => new RegExp(`^${route.replace(/:[^/]+/g, '[^/]+')}$`));
    const blogSource = fs.readFileSync(path.resolve(__dirname, '../pages/BlogDetailPage.tsx'), 'utf8');
    for (const url of locs(read('sitemap-main.xml'))) {
      const pathname = new URL(url).pathname.replace(/\/$/, '') || '/';
      expect(
        routes.includes(pathname) || matchers.some((m) => m.test(pathname)),
        pathname,
      ).toBe(true);
      expect(pathname).not.toMatch(/^\/(products|manufacturers|requirements|companies)\/[^/]+/);
      const blogSlug = pathname.match(/^\/blog\/([^/]+)$/)?.[1];
      if (blogSlug) expect(blogSource, blogSlug).toContain(`slug: '${blogSlug}'`);
    }
  });
});
