// ─── Country, Currency, Tax & Transaction Fee Configuration ───────────────────

export interface CountryPlanPricing {
  starter: number;
  business: number;
  growth: number;
  enterprise?: number;
}

export interface CountryConfig {
  code: string; // ISO 2-letter, e.g. "IN", "US", "AE"
  name: string; // Full name, e.g. "India", "United States"
  flag: string; // Emoji flag, e.g. "🇮🇳"
  currency: string; // Currency code, e.g. "INR", "USD"
  symbol: string; // Symbol, e.g. "₹", "$"
  locale: string; // Locale string for Intl, e.g. "en-IN"
  primaryLang: string; // Language code, e.g. "en", "ar", "de"
  taxName: string; // "GST", "VAT", "Sales Tax"
  taxRate: number; // Decimal (0.18 for 18%)
  taxLabel: string; // "18% GST", "5% VAT"
  feePercent: number; // Processing fee percentage (e.g. 0.02 for 2%)
  feeFixed: number; // Fixed fee in local currency
  feeDescription: string; // "UPI & NetBanking (2.0%)" or "Card Processing (2.9% + $0.30)"
  plans: CountryPlanPricing;
}


export interface AddonServiceConfig {
  id: string;
  name: string;
  price_inr: number;
  period: string;
  tagline: string;
  badge?: string;
  features: string[];
}

export const ADDON_SERVICES: Record<string, AddonServiceConfig> = {
  ai_accessibility: {
    id: 'ai_accessibility',
    name: 'AI Accessibility Add-on',
    price_inr: 7500,
    period: '/month',
    tagline: 'Enable AI trade assistant, automated quotation builder & AI sourcing on any tier',
    badge: '⚡ AI Powered',
    features: [
      'AI Product Matching (94%+ Spec Match)',
      '1-Click Automated Quotation Generator',
      'AI Sourcing & Buyer Requirement Matcher',
      'Smart Chat Suggestions & Auto-Drafting',
      'Priority AI Lead Routing & Notifications',
    ],
  },
  flash_sell_24h: {
    id: 'flash_sell_24h',
    name: '24 Hours Sell Products',
    price_inr: 5000,
    period: '/24 Hours',
    tagline: 'Flash 24-hour marketplace spotlight & instant buyer notification broadcast',
    badge: '🔥 Fast Liquidation',
    features: [
      'Top Homepage & Marketplace 24H Spotlight',
      'Broadcast your offer to buyers on BulkSkart',
      'Direct Factory WhatsApp / Call Priority',
      'High Urgency 24-Hour Deal Banner',
      'Zero Commission on Bulk Orders',
    ],
  },
};

export const COUNTRIES: Record<string, CountryConfig> = {
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    symbol: '₹',
    locale: 'en-IN',
    primaryLang: 'en',
    taxName: 'GST',
    taxRate: 0.18,
    taxLabel: '18% GST',
    feePercent: 0.02,
    feeFixed: 0,
    feeDescription: 'Local Gateway Fee (2.0% + GST)',
    plans: {
      starter: 2500,
      business: 7500,
      growth: 15000,
      enterprise: 35000,
    },
  },
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    symbol: '$',
    locale: 'en-US',
    primaryLang: 'en',
    taxName: 'Sales Tax',
    taxRate: 0.075,
    taxLabel: '7.5% Digital Tax',
    feePercent: 0.029,
    feeFixed: 0.30,
    feeDescription: 'Card Processing (2.9% + $0.30)',
    plans: {
      starter: 29,
      business: 79,
      growth: 149,
      enterprise: 399,
    },
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: 'AED',
    symbol: 'د.إ',
    locale: 'ar-AE',
    primaryLang: 'ar',
    taxName: 'VAT',
    taxRate: 0.05,
    taxLabel: '5% UAE VAT',
    feePercent: 0.029,
    feeFixed: 1.0,
    feeDescription: 'Card Processing (2.9% + 1.00 AED)',
    plans: {
      starter: 99,
      business: 275,
      growth: 499,
      enterprise: 1499,
    },
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    symbol: '£',
    locale: 'en-GB',
    primaryLang: 'en',
    taxName: 'VAT',
    taxRate: 0.20,
    taxLabel: '20% UK VAT',
    feePercent: 0.025,
    feeFixed: 0.20,
    feeDescription: 'UK Processing (2.5% + £0.20)',
    plans: {
      starter: 25,
      business: 65,
      growth: 125,
      enterprise: 320,
    },
  },
  DE: {
    code: 'DE',
    name: 'Germany / Europe',
    flag: '🇩🇪',
    currency: 'EUR',
    symbol: '€',
    locale: 'de-DE',
    primaryLang: 'de',
    taxName: 'MwSt / VAT',
    taxRate: 0.19,
    taxLabel: '19% EU VAT',
    feePercent: 0.025,
    feeFixed: 0.25,
    feeDescription: 'EU SEPA & Card (2.5% + €0.25)',
    plans: {
      starter: 28,
      business: 75,
      growth: 139,
      enterprise: 350,
    },
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD',
    symbol: 'A$',
    locale: 'en-AU',
    primaryLang: 'en',
    taxName: 'GST',
    taxRate: 0.10,
    taxLabel: '10% AU GST',
    feePercent: 0.026,
    feeFixed: 0.30,
    feeDescription: 'AU Gateway (2.6% + A$0.30)',
    plans: {
      starter: 45,
      business: 119,
      growth: 229,
      enterprise: 599,
    },
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    currency: 'SGD',
    symbol: 'S$',
    locale: 'en-SG',
    primaryLang: 'en',
    taxName: 'GST',
    taxRate: 0.09,
    taxLabel: '9% SG GST',
    feePercent: 0.028,
    feeFixed: 0.50,
    feeDescription: 'PayNow & Card (2.8% + S$0.50)',
    plans: {
      starter: 39,
      business: 99,
      growth: 199,
      enterprise: 499,
    },
  },
  CN: {
    code: 'CN',
    name: 'China',
    flag: '🇨🇳',
    currency: 'CNY',
    symbol: '¥',
    locale: 'zh-CN',
    primaryLang: 'zh',
    taxName: 'VAT',
    taxRate: 0.06,
    taxLabel: '6% VAT',
    feePercent: 0.015,
    feeFixed: 0,
    feeDescription: 'Alipay / WeChat Pay (1.5%)',
    plans: {
      starter: 199,
      business: 549,
      growth: 1099,
      enterprise: 2799,
    },
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    currency: 'JPY',
    symbol: '¥',
    locale: 'ja-JP',
    primaryLang: 'ja',
    taxName: 'Consumption Tax',
    taxRate: 0.10,
    taxLabel: '10% JCT',
    feePercent: 0.032,
    feeFixed: 0,
    feeDescription: 'Card Processing (3.2%)',
    plans: {
      starter: 4200,
      business: 11500,
      growth: 21900,
      enterprise: 55000,
    },
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD',
    symbol: 'C$',
    locale: 'en-CA',
    primaryLang: 'en',
    taxName: 'HST / GST',
    taxRate: 0.13,
    taxLabel: '13% HST/GST',
    feePercent: 0.029,
    feeFixed: 0.30,
    feeDescription: 'Interac & Card (2.9% + C$0.30)',
    plans: {
      starter: 39,
      business: 105,
      growth: 199,
      enterprise: 499,
    },
  },
};

export const DEFAULT_COUNTRY: CountryConfig = COUNTRIES.IN;

export const COUNTRY_LIST: CountryConfig[] = Object.values(COUNTRIES);

/**
 * Normalizes country string (e.g. "India", "IN", "United States", "US") to CountryConfig
 */
export function resolveCountry(input?: string | null): CountryConfig {
  if (!input) return DEFAULT_COUNTRY;
  const clean = input.trim();
  const upper = clean.toUpperCase();

  // 1. Direct code match (e.g. "IN", "US")
  if (COUNTRIES[upper]) return COUNTRIES[upper];

  // 2. Full name match (case insensitive)
  const byName = COUNTRY_LIST.find(c => c.name.toLowerCase() === clean.toLowerCase());
  if (byName) return byName;

  // 3. Substring match
  const bySubstring = COUNTRY_LIST.find(c =>
    clean.toLowerCase().includes(c.name.toLowerCase()) ||
    c.name.toLowerCase().includes(clean.toLowerCase())
  );
  if (bySubstring) return bySubstring;

  // 4. Default
  return DEFAULT_COUNTRY;
}

/**
 * Calculates full transparent breakdown for a subscription or order price
 */
export function calculateCountryPricing(basePrice: number, country: CountryConfig) {
  const taxAmount = Math.round(basePrice * country.taxRate * 100) / 100;
  const taxableSubtotal = basePrice + taxAmount;
  const feeAmount = Math.round((taxableSubtotal * country.feePercent + country.feeFixed) * 100) / 100;
  const totalPayable = Math.round((taxableSubtotal + feeAmount) * 100) / 100;

  return {
    basePrice,
    taxRate: country.taxRate,
    taxName: country.taxName,
    taxLabel: country.taxLabel,
    taxAmount,
    feePercent: country.feePercent,
    feeFixed: country.feeFixed,
    feeDescription: country.feeDescription,
    feeAmount,
    totalPayable,
    currency: country.currency,
    symbol: country.symbol,
  };
}
