import { describe, expect, it } from 'vitest';
import { isSeededCompany, isSeededRequirement, SEED_OWNER_ID, SEEDED_RFQ_TITLE_LIKE } from '@/lib/seedData';

describe('template seed data', () => {
  it('recognises the placeholder owner given to every demo company', () => {
    expect(isSeededCompany({ owner_id: SEED_OWNER_ID })).toBe(true);
  });

  it('recognises the worldwide demo companies by id', () => {
    expect(isSeededCompany({ id: 'e1000001-0000-0000-0000-000000000007', owner_id: 'anything' })).toBe(true);
  });

  it('keeps a company owned by a real user', () => {
    expect(isSeededCompany({ id: '5d1f0c52-9b0e-4f0c-8f43-0d6a1d7e3a11', owner_id: '17e26280-f765-4e40-ae9f-698b8e645260' })).toBe(false);
    expect(isSeededCompany({})).toBe(false);
  });

  it('recognises the generated RFQs by their title or their boilerplate description', () => {
    expect(isSeededRequirement({ title: 'Bulk Cotton Fabric Roll - Lot #50123' })).toBe(true);
    expect(
      isSeededRequirement({
        title: 'Steel pipes',
        description: 'Requirement from India. Looking for verified manufacturers for bulk supply. Quality: Export grade.',
      }),
    ).toBe(true);
  });

  it('keeps a real RFQ, even one that mentions a lot', () => {
    expect(isSeededRequirement({ title: 'Need 20 tonnes of HR coil', description: 'Looking for mill test certificates.' })).toBe(false);
    expect(isSeededRequirement({ title: 'Lot of 500 carton boxes' })).toBe(false);
  });

  it('exposes the SQL pattern used to filter on the server', () => {
    expect(SEEDED_RFQ_TITLE_LIKE).toBe('% - Lot #%');
  });
});
