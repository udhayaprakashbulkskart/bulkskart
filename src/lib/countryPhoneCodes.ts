/**
 * Country Phone & Dialing Codes Helper
 * Maps countries to international calling prefixes, timezones, and authentic formats.
 */

export interface CountryPhoneMeta {
  dialCode: string;
  countryName: string;
  flag: string;
  timezone: string;
  guestMask: string;
}

export const COUNTRY_PHONE_META: Record<string, CountryPhoneMeta> = {
  uae: {
    dialCode: '+971',
    countryName: 'United Arab Emirates',
    flag: '🇦🇪',
    timezone: 'GST (UTC+4)',
    guestMask: '+971 50 XXX XXXX',
  },
  'united arab emirates': {
    dialCode: '+971',
    countryName: 'United Arab Emirates',
    flag: '🇦🇪',
    timezone: 'GST (UTC+4)',
    guestMask: '+971 50 XXX XXXX',
  },
  dubai: {
    dialCode: '+971',
    countryName: 'United Arab Emirates',
    flag: '🇦🇪',
    timezone: 'GST (UTC+4)',
    guestMask: '+971 4 3XX XXXX',
  },
  india: {
    dialCode: '+91',
    countryName: 'India',
    flag: '🇮🇳',
    timezone: 'IST (UTC+5:30)',
    guestMask: '+91 98XXX XXXXX',
  },
  usa: {
    dialCode: '+1',
    countryName: 'United States',
    flag: '🇺🇸',
    timezone: 'EST/PST',
    guestMask: '+1 415 XXX XXXX',
  },
  'united states': {
    dialCode: '+1',
    countryName: 'United States',
    flag: '🇺🇸',
    timezone: 'EST/PST',
    guestMask: '+1 415 XXX XXXX',
  },
  germany: {
    dialCode: '+49',
    countryName: 'Germany',
    flag: '🇩🇪',
    timezone: 'CET (UTC+1)',
    guestMask: '+49 89 XXXX XXXX',
  },
  japan: {
    dialCode: '+81',
    countryName: 'Japan',
    flag: '🇯🇵',
    timezone: 'JST (UTC+9)',
    guestMask: '+81 3 XXXX XXXX',
  },
  uk: {
    dialCode: '+44',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    timezone: 'GMT/BST',
    guestMask: '+44 20 XXXX XXXX',
  },
  'united kingdom': {
    dialCode: '+44',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    timezone: 'GMT/BST',
    guestMask: '+44 20 XXXX XXXX',
  },
  china: {
    dialCode: '+86',
    countryName: 'China',
    flag: '🇨🇳',
    timezone: 'CST (UTC+8)',
    guestMask: '+86 571 XXXX XXXX',
  },
  vietnam: {
    dialCode: '+84',
    countryName: 'Vietnam',
    flag: '🇻🇳',
    timezone: 'ICT (UTC+7)',
    guestMask: '+84 28 XXXX XXXX',
  },
  turkey: {
    dialCode: '+90',
    countryName: 'Turkey',
    flag: '🇹🇷',
    timezone: 'TRT (UTC+3)',
    guestMask: '+90 212 XXX XXXX',
  },
  'south korea': {
    dialCode: '+82',
    countryName: 'South Korea',
    flag: '🇰🇷',
    timezone: 'KST (UTC+9)',
    guestMask: '+82 2 XXXX XXXX',
  },
  korea: {
    dialCode: '+82',
    countryName: 'South Korea',
    flag: '🇰🇷',
    timezone: 'KST (UTC+9)',
    guestMask: '+82 2 XXXX XXXX',
  },
  italy: {
    dialCode: '+39',
    countryName: 'Italy',
    flag: '🇮🇹',
    timezone: 'CET (UTC+1)',
    guestMask: '+39 02 XXXX XXXX',
  },
  singapore: {
    dialCode: '+65',
    countryName: 'Singapore',
    flag: '🇸🇬',
    timezone: 'SGT (UTC+8)',
    guestMask: '+65 67XX XXXX',
  },
  france: {
    dialCode: '+33',
    countryName: 'France',
    flag: '🇫🇷',
    timezone: 'CET (UTC+1)',
    guestMask: '+33 1 XX XX XX XX',
  },
  australia: {
    dialCode: '+61',
    countryName: 'Australia',
    flag: '🇦🇪',
    timezone: 'AEST (UTC+10)',
    guestMask: '+61 2 XXXX XXXX',
  },
  canada: {
    dialCode: '+1',
    countryName: 'Canada',
    flag: '🇨🇦',
    timezone: 'EST (UTC-5)',
    guestMask: '+1 416 XXX XXXX',
  },
  brazil: {
    dialCode: '+55',
    countryName: 'Brazil',
    flag: '🇧🇷',
    timezone: 'BRT (UTC-3)',
    guestMask: '+55 11 XXXX XXXX',
  },
  kenya: {
    dialCode: '+254',
    countryName: 'Kenya',
    flag: '🇰🇪',
    timezone: 'EAT (UTC+3)',
    guestMask: '+254 20 XXX XXXX',
  },
  spain: {
    dialCode: '+34',
    countryName: 'Spain',
    flag: '🇪🇸',
    timezone: 'CET (UTC+1)',
    guestMask: '+34 91 XXX XXXX',
  },
};

/**
 * Get country metadata by country name
 */
export function getCountryMeta(country?: string | null): CountryPhoneMeta {
  if (!country) return COUNTRY_PHONE_META.india;
  const key = country.trim().toLowerCase();
  return COUNTRY_PHONE_META[key] || COUNTRY_PHONE_META.india;
}

/**
 * Get dialing code for country (e.g. '+971' for UAE)
 */
export function getCountryDialCode(country?: string | null): string {
  return getCountryMeta(country).dialCode;
}

/**
 * Get timezone display for country (e.g. 'GST (UTC+4)' for UAE, 'IST' for India)
 */
export function getCountryTimezone(country?: string | null): string {
  return getCountryMeta(country).timezone;
}

/**
 * Get guest phone mask for country (e.g. '+971 50 XXX XXXX' for UAE)
 */
export function getCountryGuestMask(country?: string | null): string {
  return getCountryMeta(country).guestMask;
}

/**
 * The phone number a supplier actually stored on their company profile, or null when they have not
 * stored one. Numbers are never generated: a made-up number would send a buyer to a stranger.
 */
export function getCompanyDisplayPhone(company?: {
  contact_phone?: string | null;
} | null): string | null {
  const raw = company?.contact_phone?.trim();
  return raw ? raw : null;
}
