import { describe, expect, it } from 'vitest';
import { getCompanyDisplayPhone } from '@/lib/countryPhoneCodes';

describe('getCompanyDisplayPhone', () => {
  it('returns the number the supplier stored, trimmed', () => {
    expect(getCompanyDisplayPhone({ contact_phone: '  +971 4 398 5210 ' })).toBe('+971 4 398 5210');
  });

  it('keeps a stored number even when it does not start with the country dial code', () => {
    // The old code replaced these with a number made up from the company slug.
    expect(getCompanyDisplayPhone({ contact_phone: '98765 43210' })).toBe('98765 43210');
  });

  it('returns null, never a generated number, when nothing is stored', () => {
    expect(getCompanyDisplayPhone(null)).toBeNull();
    expect(getCompanyDisplayPhone(undefined)).toBeNull();
    expect(getCompanyDisplayPhone({})).toBeNull();
    expect(getCompanyDisplayPhone({ contact_phone: '' })).toBeNull();
    expect(getCompanyDisplayPhone({ contact_phone: '   ' })).toBeNull();
  });
});
