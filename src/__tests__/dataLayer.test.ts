import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A stand-in for the Supabase query builder: every method records its call and returns the same
 * object, and awaiting it yields the canned result.
 */
function builder(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const calls: Array<[string, unknown[]]> = [];
  const proxy: any = new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === 'then') return (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null, count: null, ...result });
      if (prop === 'calls') return calls;
      return (...args: unknown[]) => {
        calls.push([String(prop), args]);
        return proxy;
      };
    },
  });
  return proxy as { calls: Array<[string, unknown[]]> };
}

const from = vi.fn();
vi.mock('@/db/supabase', () => ({ supabase: { from: (...args: unknown[]) => from(...args), rpc: vi.fn(), auth: {} } }));

import { getCompanies, getMarketplaceCounts, getProductBySlug, getProducts, getRequirements } from '@/lib/api';
import { SEED_OWNER_ID, SEEDED_RFQ_TITLE_LIKE } from '@/lib/seedData';

const has = (b: { calls: Array<[string, unknown[]]> }, method: string, ...args: unknown[]) =>
  b.calls.some(([name, a]) => name === method && args.every((arg, i) => a[i] === arg));

beforeEach(() => from.mockReset());

describe('product pages', () => {
  it('an unknown slug is "not found", never some other product', async () => {
    from.mockReturnValue(builder({ data: null }));
    await expect(getProductBySlug('this-product-does-not-exist')).resolves.toBeNull();
  });

  it('a product of a template demo company is not served', async () => {
    from.mockReturnValue(
      builder({ data: { id: 'p1', slug: 'demo', companies: { id: 'e1000001-0000-0000-0000-000000000003', owner_id: SEED_OWNER_ID } } }),
    );
    await expect(getProductBySlug('demo')).resolves.toBeNull();
  });

  it('a real product is returned', async () => {
    const product = { id: 'p2', slug: 'real', companies: { id: 'c1', owner_id: 'u1' } };
    from.mockReturnValue(builder({ data: product }));
    await expect(getProductBySlug('real')).resolves.toEqual(product);
  });
});

describe('listings leave the template demo rows out', () => {
  it('companies', async () => {
    const q = builder({
      data: [
        { id: 'e1000001-0000-0000-0000-000000000001', owner_id: SEED_OWNER_ID, company_name: 'Demo' },
        { id: 'real-1', owner_id: 'u1', company_name: 'Real Works' },
      ],
    });
    from.mockReturnValue(q);
    const rows = await getCompanies();
    expect(has(q, 'neq', 'owner_id', SEED_OWNER_ID)).toBe(true);
    expect(rows.map((c) => c.company_name)).toEqual(['Real Works']);
  });

  it('products', async () => {
    const q = builder({ data: [] });
    from.mockReturnValue(q);
    await getProducts();
    expect(has(q, 'neq', 'companies.owner_id', SEED_OWNER_ID)).toBe(true);
  });

  it('requirements', async () => {
    const q = builder({ data: [] });
    from.mockReturnValue(q);
    await getRequirements();
    expect(has(q, 'not', 'title', 'like', SEEDED_RFQ_TITLE_LIKE)).toBe(true);
  });
});

describe('marketplace counts', () => {
  it('reports a figure it could not count as null, not as a made-up number', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'boom' }, count: null }));
    await expect(getMarketplaceCounts()).resolves.toEqual({
      verifiedSuppliers: null,
      supplierCountries: null,
      openRequirements: null,
      liveAuctions: null,
    });
  });

  it('reports what the database counted', async () => {
    from.mockImplementation((table: string) =>
      table === 'companies'
        ? builder({ data: [{ country: 'India' }, { country: 'india ' }, { country: 'UAE' }], count: 3 })
        : builder({ data: [], count: 5 }),
    );
    const counts = await getMarketplaceCounts();
    expect(counts.verifiedSuppliers).toBe(3);
    expect(counts.supplierCountries).toBe(2);
    expect(counts.openRequirements).toBe(5);
    expect(counts.liveAuctions).toBe(5);
  });
});
