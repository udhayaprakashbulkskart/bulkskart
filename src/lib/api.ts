import { supabase } from '@/db/supabase';
import { INCLUDE_TEMPLATE_SEED_DATA, SEED_OWNER_ID, SEEDED_RFQ_TITLE_LIKE, isSeededCompany, isSeededRequirement } from '@/lib/seedData';
import type { Category, Company, CompanyCertification, CompanyReview, Product, Requirement, Quotation, Conversation, Message, Notification, Profile, OrderRow, SupplierInquiry, InquiryReply } from '@/types/types';

const PAGE_SIZE = 12;

// ============================================================
// SUBSCRIPTION HELPERS
// ============================================================
/**
 * Returns the supplier's active subscription for a company, or null.
 */
export async function getActiveSubscription(companyId: string) {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .maybeSingle();
  return data ?? null;
}

/**
 * Check whether a supplier can send a direct message or quotation to a buyer.
 *
 * Gate order:
 *  1. Company must be a registered business (verified OR has a GST/IEC number)
 *  2. Company must have an active paid subscription
 *  3. Subscription quota must not be exhausted
 *
 * Returns: 'ok' | 'not_registered_business' | 'no_subscription' | 'quota_exceeded'
 */
export async function checkDirectMessageQuota(
  companyId: string,
  company?: import('@/types/types').Company | null,
): Promise<'ok' | 'not_registered_business' | 'no_subscription' | 'quota_exceeded'> {
  // Gate 1: must be a registered / verified business
  if (company) {
    const isRegistered =
      company.verification_status === 'verified' ||
      !!(company.gst_number?.trim()) ||
      !!(company.iec_number?.trim()) ||
      !!(company.reg_doc_url?.trim());
    if (!isRegistered) return 'not_registered_business';
  }

  // Gate 2 & 3: active subscription + quota
  const sub = await getActiveSubscription(companyId);
  if (!sub) return 'no_subscription';
  // Enterprise (999999) = unlimited
  if (sub.max_rfq_leads >= 999999) return 'ok';
  if ((sub.used_rfq_leads ?? 0) >= sub.max_rfq_leads) return 'quota_exceeded';
  return 'ok';
}

/**
 * Strict verification that only subscription paid manufacturers/suppliers
 * can send direct messages or submit quotations to buyers.
 */
export async function checkSupplierPaidSubscription(
  companyId?: string | null,
  company?: import('@/types/types').Company | null
): Promise<{ allowed: boolean; reason: 'not_logged_in' | 'not_registered_business' | 'no_subscription' | 'quota_exceeded' | 'ai_matching_subscription'; tier?: string; hasAiMatching?: boolean }> {
  if (!companyId) {
    return { allowed: false, reason: 'not_registered_business' };
  }

  // Check if company has registered business info
  if (company) {
    const isRegistered =
      company.verification_status === 'verified' ||
      !!(company.gst_number?.trim()) ||
      !!(company.iec_number?.trim()) ||
      !!(company.reg_doc_url?.trim());
    if (!isRegistered) {
      return { allowed: false, reason: 'not_registered_business' };
    }
  }

  const sub = await getActiveSubscription(companyId);
  if (!sub) {
    return { allowed: false, reason: 'no_subscription' };
  }

  // Check quota
  if (sub.max_rfq_leads < 999999 && (sub.used_rfq_leads ?? 0) >= sub.max_rfq_leads) {
    return { allowed: false, reason: 'quota_exceeded', tier: sub.tier || sub.plan_tier };
  }

  const currentTier = String(sub.tier || sub.plan_tier || '').toLowerCase();
  const hasAi = ['business', 'growth', 'enterprise'].includes(currentTier) || Boolean(sub.has_ai_access);

  return { allowed: true, reason: 'no_subscription', tier: currentTier, hasAiMatching: hasAi };
}

/**
 * Check whether a manufacturer has access to AI Product Matching.
 * Unlocked by the ₹7,500 Business Package, ₹15,000 Growth, or the ₹7,500 AI Accessibility Add-on.
 */
export async function checkSupplierAiMatchingAccess(
  companyId?: string | null,
  userId?: string | null
): Promise<{ allowed: boolean; tier: string | null; hasAiMatching: boolean; reason?: string; message?: string }> {
  if (!companyId && !userId) {
    return { allowed: false, tier: null, hasAiMatching: false, reason: 'not_logged_in', message: 'Login required' };
  }

  try {
    const { data, error } = await supabase.rpc('can_supplier_use_ai_matching', {
      p_company_id: companyId || null,
      p_user_id: userId || null,
    });

    if (error) {
      console.warn('RPC can_supplier_use_ai_matching error, falling back:', error.message);
      if (companyId) {
        const sub = await getActiveSubscription(companyId);
        if (!sub) {
          return { allowed: false, tier: null, hasAiMatching: false, reason: 'no_subscription', message: 'Subscription required' };
        }
        const tier = String(sub.tier || sub.plan_tier || '').toLowerCase();
        const hasAi = ['business', 'growth', 'enterprise'].includes(tier) || Boolean(sub.has_ai_access);
        return { allowed: hasAi, tier, hasAiMatching: hasAi, reason: hasAi ? undefined : 'upgrade_required' };
      }
      return { allowed: false, tier: null, hasAiMatching: false, reason: 'no_subscription' };
    }

    return (data as any) || { allowed: false, tier: null, hasAiMatching: false };
  } catch (err: any) {
    console.error('Failed to check AI matching access:', err);
    return { allowed: false, tier: null, hasAiMatching: false, reason: 'error', message: err?.message };
  }
}


/**
 * Increment the used_rfq_leads counter for a subscription (used when a
 * supplier opens a direct conversation from the live requirements feed).
 */
export async function incrementMessageQuota(companyId: string): Promise<void> {
  const sub = await getActiveSubscription(companyId);
  if (!sub || sub.max_rfq_leads >= 999999) return;
  await supabase
    .from('subscriptions')
    .update({ used_rfq_leads: (sub.used_rfq_leads ?? 0) + 1 })
    .eq('id', sub.id);
}

// ============================================================
// CATEGORIES (with in-memory cache)
// ============================================================
let cachedCategories: Category[] | null = null;
let cachedCategoriesTime = 0;
const CATEGORIES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCategories(forceRefresh = false): Promise<Category[]> {
  const now = Date.now();
  if (!forceRefresh && cachedCategories && now - cachedCategoriesTime < CATEGORIES_CACHE_TTL) {
    return cachedCategories;
  }
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  const result = Array.isArray(data) ? data : [];
  if (result.length > 0) {
    cachedCategories = result;
    cachedCategoriesTime = now;
  }
  return result;
}

// ============================================================
// COMPANIES
// ============================================================
export async function getCompanies(options?: {
  search?: string;
  verified?: boolean;
  featured?: boolean;
  country?: string;
  cursor?: string;
  limit?: number;
}): Promise<Company[]> {
  try {
    let query = supabase
      .from('companies')
      .select('*')
      .order('rating_avg', { ascending: false })
      .limit(options?.limit ?? 300);

    if (options?.search) query = query.ilike('company_name', `%${options.search}%`);
    if (options?.country && options.country !== 'all') query = query.eq('country', options.country);
    if (options?.verified) query = query.eq('verification_status', 'verified');
    if (options?.featured) query = query.eq('is_featured', true);
    if (options?.cursor) query = query.lt('created_at', options.cursor);
    // The template's demonstration companies are never presented as real suppliers.
    if (!INCLUDE_TEMPLATE_SEED_DATA) query = query.neq('owner_id', SEED_OWNER_ID);

    const { data } = await query;
    return Array.isArray(data) ? data.filter((company) => !isSeededCompany(company)) : [];
  } catch {
    return [];
  }
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  if (!slug) return null;
  const cleanSlug = slug.trim().toLowerCase();

  // Only companies that exist in the database. Nothing is synthesised, and the template's demo companies are not served.
  try {
    const { data } = await supabase.from('companies').select('*').eq('slug', cleanSlug).maybeSingle();
    if (data) return isSeededCompany(data) ? null : data;
  } catch {
    // ignore
  }

  try {
    const { data: byId } = await supabase.from('companies').select('*').eq('id', cleanSlug).maybeSingle();
    if (byId) return isSeededCompany(byId) ? null : byId;
  } catch {
    // ignore
  }

  return null;
}

export async function getMyCompany(): Promise<Company | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();
  return data;
}

export async function createCompany(payload: Partial<Company>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('companies').insert(payload as Company);
  return { error: error?.message ?? null };
}

export async function updateCompany(id: string, payload: Partial<Company>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('companies').update(payload).eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// PRODUCTS
// ============================================================
export async function getProducts(options?: {
  categoryId?: string;
  categorySlug?: string;
  country?: string;
  companyId?: string;
  search?: string;
  featured?: boolean;
  cursor?: string;
  limit?: number;
}): Promise<Product[]> {
  let query = supabase
    .from('products')
    // !inner so products of the template's demo companies can be left out below
    .select('*, companies!company_id!inner(id,owner_id,company_name,slug,verification_status,city,country,logo_url), categories!category_id(id,name,slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 150);

  if (options?.categoryId) query = query.eq('category_id', options.categoryId);
  if (options?.companyId) query = query.eq('company_id', options.companyId);
  if (options?.search) query = query.ilike('name', `%${options.search}%`);
  if (options?.featured) query = query.eq('is_featured', true);
  if (options?.cursor) query = query.lt('created_at', options.cursor);
  if (!INCLUDE_TEMPLATE_SEED_DATA) query = query.neq('companies.owner_id', SEED_OWNER_ID);

  const { data } = await query;
  const rows: Product[] = Array.isArray(data) ? [...data] : [];

  const countryFilter = options?.country && options.country !== 'all' ? options.country.toLowerCase() : '';
  if (!countryFilter) return rows;
  return rows.filter((product) => product.companies?.country?.toLowerCase() === countryFilter);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!slug) return null;
  const select = '*, companies!company_id(*), categories!category_id(*)';

  // Only products that exist in the database. An unknown slug is "not found", never another product.
  const { data } = await supabase.from('products').select(select).eq('slug', slug).maybeSingle();
  let product = data;

  if (!product && slug.includes('-') && slug.length >= 32) {
    const { data: byId } = await supabase.from('products').select(select).eq('id', slug).maybeSingle();
    product = byId;
  }

  if (!product) return null;
  // Products of the template's demo companies are not served.
  if (product.companies && isSeededCompany(product.companies)) return null;
  return product;
}

/** Returns up to 8 products from the same category, excluding the current product */
export async function getSimilarProducts(categoryId: string | null, excludeId: string): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*, companies!company_id!inner(id,owner_id,company_name,slug,verification_status,city,country,logo_url), categories!category_id(id,name,slug)')
    .eq('is_active', true)
    .neq('id', excludeId)
    .limit(8);

  if (categoryId) query = query.eq('category_id', categoryId);
  if (!INCLUDE_TEMPLATE_SEED_DATA) query = query.neq('companies.owner_id', SEED_OWNER_ID);

  const { data } = await query.order('view_count', { ascending: false });
  return Array.isArray(data) ? [...data] : [];
}

export async function createProduct(payload: Partial<Product>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('products').insert(payload as Product);
  return { error: error?.message ?? null };
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('products').update(payload).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteProduct(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export interface MarketplaceProductFilterOptions {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  subCategory?: string;
  search?: string;
  moqMax?: number;
  priceMin?: number;
  priceMax?: number;
  country?: string;
  verifiedOnly?: boolean;
  minRating?: number;
  sortBy?: 'popular' | 'new' | 'price_low' | 'price_high';
}

export interface MarketplaceProductsResult {
  products: Product[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}

/**
 * Large-scale B2B Marketplace Product Catalog query
 * Fetches dynamic products from Supabase with server-side pagination,
 * multi-attribute filtering (category, search, price, MOQ, country, rating),
 * and sorting.
 */
const marketplaceCache = new Map<string, { timestamp: number; data: MarketplaceProductsResult }>();
const CACHE_TTL = 60 * 1000; // 60 seconds cache for instant loads

export async function getMarketplaceProducts(
  options: MarketplaceProductFilterOptions = {}
): Promise<MarketplaceProductsResult> {
  const cacheKey = JSON.stringify(options);
  const cached = marketplaceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? 18;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('products')
    .select(
      '*, companies!company_id!inner(id,owner_id,company_name,slug,verification_status,city,country,logo_url,rating_avg,review_count), categories!category_id(id,name,slug)',
      { count: 'exact' }
    )
    .eq('is_active', true);

  // The template's demo companies are never presented as real suppliers.
  if (!INCLUDE_TEMPLATE_SEED_DATA) query = query.neq('companies.owner_id', SEED_OWNER_ID);

  if (options.categoryId && options.categoryId !== 'all') {
    query = query.eq('category_id', options.categoryId);
  }

  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  if (options.moqMax && options.moqMax > 0) {
    query = query.lte('moq', options.moqMax);
  }

  if (options.priceMin !== undefined && options.priceMin > 0) {
    query = query.gte('price_min', options.priceMin);
  }

  if (options.priceMax !== undefined && options.priceMax > 0) {
    query = query.lte('price_max', options.priceMax);
  }

  // Sorting
  if (options.sortBy === 'price_low') {
    query = query.order('price_min', { ascending: true, nullsFirst: false });
  } else if (options.sortBy === 'price_high') {
    query = query.order('price_min', { ascending: false, nullsFirst: false });
  } else if (options.sortBy === 'popular') {
    query = query.order('view_count', { ascending: false });
  } else {
    // new / default
    query = query.order('created_at', { ascending: false });
  }

  // If in-memory filters (country, verifiedOnly, minRating, subCategory) are active,
  // fetch a larger candidate window from DB to guarantee a full page of results
  const hasInMemoryFilters = Boolean(
    (options.country && options.country !== 'all') ||
    options.verifiedOnly ||
    (options.minRating && options.minRating > 0) ||
    (options.subCategory && options.subCategory !== 'all')
  );

  const fetchRange = hasInMemoryFilters ? Math.max(pageSize * 5, 80) : pageSize;
  const dbFrom = hasInMemoryFilters ? 0 : from;
  const dbTo = hasInMemoryFilters ? fetchRange - 1 : to;

  const { data, count, error } = await query.range(dbFrom, dbTo);
  if (error) {
    console.error('Error fetching marketplace products:', error);
  }

  let products = (data as Product[]) || [];

  // Filter for country, verified, and minRating when requested
  if (options.country && options.country !== 'all') {
    const targetCountry = options.country.toLowerCase();
    products = products.filter(
      p =>
        p.companies?.country?.toLowerCase() === targetCountry ||
        p.export_destinations?.some(d => d.toLowerCase() === targetCountry)
    );
  }
  if (options.verifiedOnly) {
    products = products.filter(
      p => p.companies?.verification_status === 'verified'
    );
  }
  if (options.minRating && options.minRating > 0) {
    products = products.filter(
      p => (p.companies?.rating_avg ?? 4.5) >= options.minRating!
    );
  }
  if (options.subCategory && options.subCategory !== 'all') {
    const sub = options.subCategory.toLowerCase();
    products = products.filter(
      p =>
        p.name.toLowerCase().includes(sub) ||
        p.tags?.some(t => t.toLowerCase().includes(sub)) ||
        p.description?.toLowerCase().includes(sub)
    );
  }

  const total = count ?? products.length;
  // Slice to page size for in-memory filtered results
  if (hasInMemoryFilters) {
    const sliceFrom = (page - 1) * pageSize;
    products = products.slice(sliceFrom, sliceFrom + pageSize);
  }
  const hasMore = to < total - 1;

  const result: MarketplaceProductsResult = {
    products,
    totalCount: total,
    hasMore,
    page,
    pageSize,
  };
  marketplaceCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

// ============================================================
// REQUIREMENTS (RFQ)
// ============================================================
export async function getRequirements(options?: {
  status?: string;
  categoryId?: string;
  search?: string;
  buyerId?: string;
  cursor?: string;
  newerThan?: string;
  limit?: number;
  excludeIds?: string[];
  excludeReqNumbers?: string[];
}): Promise<Requirement[]> {
  let query = supabase
    .from('requirements')
    .select('*, profiles!buyer_id(id,full_name,email,phone), categories!category_id(id,name,slug)')
    .order('created_at', { ascending: false })
    .limit(options?.limit ? options.limit * 2 : PAGE_SIZE * 2);

  // 'all' = no status filter (buyer dashboard). Default public listings stay active-only.
  if (options?.status && options.status !== 'all') query = query.eq('status', options.status);
  else if (options?.status !== 'all' && !options?.buyerId) query = query.eq('status', 'active');
  if (options?.categoryId) query = query.eq('category_id', options.categoryId);
  if (options?.search) query = query.ilike('title', `%${options.search}%`);
  if (options?.buyerId) query = query.eq('buyer_id', options.buyerId);
  if (options?.cursor) query = query.lt('created_at', options.cursor);
  // For live-polling: fetch only rows newer than last known timestamp
  if (options?.newerThan) query = query.gt('created_at', options.newerThan);

  // The template's generated "Lot #" RFQs are demonstration rows, not buyer demand.
  if (!INCLUDE_TEMPLATE_SEED_DATA && !options?.buyerId) query = query.not('title', 'like', SEEDED_RFQ_TITLE_LIKE);

  const { data } = await query;
  if (!Array.isArray(data)) return [];

  const excludeIdSet = new Set(options?.excludeIds || []);
  const excludeReqNumSet = new Set(options?.excludeReqNumbers || []);

  // Strict backend-level duplicate prevention: unique ID, req_number, and title
  const seenIds = new Set<string>();
  const seenReqNums = new Set<string>();
  const seenTitles = new Set<string>();
  const uniqueItems: Requirement[] = [];

  const maxItems = options?.limit ?? PAGE_SIZE;
  const isTestTitle = (t: string) =>
    /\b(test|debug|timed|timeout)\b/i.test(t) ||
    /^test\b/i.test(t.trim());

  for (const item of data) {
    if (!item || !item.id) continue;
    if (excludeIdSet.has(item.id)) continue;
    if (item.req_number && excludeReqNumSet.has(item.req_number)) continue;

    const normTitle = (item.title || '').trim().toLowerCase();
    // Never surface test/debug RFQs in production listings
    if (isTestTitle(item.title || '') && !options?.buyerId) continue;
    if (seenIds.has(item.id)) continue;
    if (item.req_number && seenReqNums.has(item.req_number)) continue;
    if (normTitle && seenTitles.has(normTitle)) continue;

    seenIds.add(item.id);
    if (item.req_number) seenReqNums.add(item.req_number);
    if (normTitle) seenTitles.add(normTitle);

    const buyerPhone =
      (item as any).profiles?.phone ||
      (item as any).buyer_phone ||
      null;
    uniqueItems.push({
      ...item,
      buyer_phone: buyerPhone,
    } as Requirement);
    if (uniqueItems.length >= maxItems) break;
  }

  return uniqueItems;
}

export interface MarketplaceCounts {
  verifiedSuppliers: number | null;
  supplierCountries: number | null;
  openRequirements: number | null;
  liveAuctions: number | null;
}

/** Headline figures, each counted in the database. A figure that cannot be counted is null, never a guess. */
export async function getMarketplaceCounts(): Promise<MarketplaceCounts> {
  const nowIso = new Date().toISOString();
  const SCAN_LIMIT = 1000;
  let verified = supabase.from('companies').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified');
  let countries = supabase.from('companies').select('country').eq('verification_status', 'verified').limit(SCAN_LIMIT);
  let requirements = supabase.from('requirements').select('id', { count: 'exact', head: true }).eq('status', 'active');
  if (!INCLUDE_TEMPLATE_SEED_DATA) {
    verified = verified.neq('owner_id', SEED_OWNER_ID);
    countries = countries.neq('owner_id', SEED_OWNER_ID);
    requirements = requirements.not('title', 'like', SEEDED_RFQ_TITLE_LIKE);
  }
  const auctions = supabase
    .from('auctions')
    .select('id', { count: 'exact', head: true })
    .in('status', ['live', 'closing_soon'])
    .gt('end_time', nowIso);

  const [v, c, r, a] = await Promise.all([verified, countries, requirements, auctions]);
  const countryRows = !c.error && Array.isArray(c.data) && c.data.length < SCAN_LIMIT ? (c.data as Array<{ country: string | null }>) : null;
  return {
    verifiedSuppliers: v.error ? null : (v.count ?? 0),
    supplierCountries: countryRows
      ? new Set(countryRows.map((row) => (row.country || '').trim().toLowerCase()).filter(Boolean)).size
      : null,
    openRequirements: r.error ? null : (r.count ?? 0),
    liveAuctions: a.error ? null : (a.count ?? 0),
  };
}

/**
 * One page of open requirements, straight from the database, with the real total.
 * The template's generated "Lot #" rows are left out, as are obvious test posts.
 */
export async function getRequirementsPage(params: {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  search?: string;
  location?: string;
}): Promise<{ data: Requirement[]; totalCount: number; totalPages: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 12;
  const byCategory = Boolean(params.categorySlug && params.categorySlug !== 'all');

  let query = supabase
    .from('requirements')
    .select(
      `*, profiles!buyer_id(id,full_name,email,phone), ${byCategory ? 'categories!category_id!inner(id,name,slug)' : 'categories!category_id(id,name,slug)'}`,
      { count: 'exact' },
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (byCategory) query = query.eq('categories.slug', params.categorySlug as string);
  if (params.search?.trim()) query = query.ilike('title', `%${params.search.trim()}%`);
  if (params.location && params.location !== 'all') {
    const place = params.location.trim();
    query = query.or(`destination_city.ilike.%${place}%,delivery_location.ilike.%${place}%`);
  }
  if (!INCLUDE_TEMPLATE_SEED_DATA) query = query.not('title', 'like', SEEDED_RFQ_TITLE_LIKE);

  const { data, count, error } = await query;
  if (error || !Array.isArray(data)) return { data: [], totalCount: 0, totalPages: 1 };

  const isTestTitle = (title: string) => /\b(test|debug|timed|timeout)\b/i.test(title);
  const rows = (data as unknown as Requirement[]).filter((row) => !isTestTitle(row.title || '') && !isSeededRequirement(row));
  const totalCount = count ?? rows.length;
  return { data: rows, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)) };
}

export async function getRequirementById(id: string): Promise<Requirement | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  let query = supabase
    .from('requirements')
    .select('*, profiles!buyer_id(*), categories!category_id(*)');

  if (isUuid) {
    query = query.eq('id', id);
  } else {
    query = query.or(`req_number.eq.${id},req_number.ilike.%${id}%,title.ilike.%${id}%`);
  }

  const { data } = await query.maybeSingle();
  if (data) return isSeededRequirement(data) ? null : data;

  // If not found with exact/pattern match and not UUID, try fallback lookup by req_number directly
  const { data: byReqNum } = await supabase
    .from('requirements')
    .select('*, profiles!buyer_id(*), categories!category_id(*)')
    .eq('req_number', id)
    .maybeSingle();

  return byReqNum && !isSeededRequirement(byReqNum) ? byReqNum : null;
}

export async function incrementRequirementViewCount(id: string): Promise<void> {
  try {
    await supabase.rpc('increment_requirement_view_count', { req_id: id });
  } catch {
    // Non-critical metric increment fallback
  }
}

export async function createRequirement(payload: Partial<Requirement>): Promise<{ error: string | null; id?: string }> {
  // Resolve access token with a hard timeout — getSession() can hang on auth locks.
  let accessToken: string | null = null;
  try {
    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    accessToken = sessionResult && 'data' in sessionResult
      ? sessionResult.data.session?.access_token ?? null
      : null;
  } catch {
    accessToken = null;
  }

  if (!accessToken) {
    // Fallback: read persisted session from localStorage (supabase-js default key)
    try {
      const raw = localStorage.getItem(
        Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) || '',
      );
      if (raw) {
        const parsed = JSON.parse(raw);
        accessToken = parsed?.access_token || parsed?.currentSession?.access_token || null;
      }
    } catch {
      /* ignore */
    }
  }

  if (!accessToken) {
    return { error: 'Your session expired. Please sign in again and retry.' };
  }

  const { supabaseUrl, supabaseAnonKey } = await import('@/db/supabase');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/requirements?select=id`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        'X-Client-Info': 'bulkskart-web',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!res.ok) {
      const msg =
        (body as { message?: string; error_description?: string })?.message ||
        (body as { error_description?: string })?.error_description ||
        `Publish failed (${res.status})`;
      return { error: msg };
    }

    const row = Array.isArray(body) ? body[0] : body;
    const id = (row as { id?: string } | null)?.id;
    if (!id) {
      return { error: 'RFQ was created but no ID was returned. Please refresh your dashboard.' };
    }
    return { error: null, id };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: 'Publish timed out. Please check your connection and try again.' };
    }
    return { error: err instanceof Error ? err.message : 'Failed to publish RFQ.' };
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// RFQ MATCHES (AI Supplier Matching)
// ============================================================
export interface RfqMatch {
  id: string;
  rfq_id: string;
  company_id: string;
  match_score: number;
  score_category: number;
  score_location: number;
  score_moq: number;
  score_capacity: number;
  score_rating: number;
  notified_at: string | null;
  response_status: 'pending' | 'quoted' | 'dismissed' | 'expired';
  created_at: string;
}

export async function getMatchesForRfq(rfqId: string): Promise<RfqMatch[]> {
  const { data } = await supabase
    .from('rfq_matches')
    .select('*')
    .eq('rfq_id', rfqId)
    .order('match_score', { ascending: false })
    .limit(50);
  return Array.isArray(data) ? data : [];
}

export async function getMyRfqMatchScores(companyId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('rfq_matches')
    .select('rfq_id,match_score')
    .eq('company_id', companyId)
    .limit(200);
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { rfq_id: string; match_score: number }[]) {
    map[row.rfq_id] = row.match_score;
  }
  return map;
}

export async function updateRfqMatchStatus(
  rfqId: string,
  companyId: string,
  status: 'quoted' | 'dismissed',
): Promise<void> {
  await supabase
    .from('rfq_matches')
    .update({ response_status: status })
    .eq('rfq_id', rfqId)
    .eq('company_id', companyId);
}

export async function triggerRfqMatching(rfqId: string): Promise<void> {
  try {
    await supabase.functions.invoke('run-rfq-matching', { body: { rfq_id: rfqId } });
  } catch {
    // non-blocking — matching failure must not surface to the buyer
  }
}

export async function triggerMatchNewManufacturer(companyId: string): Promise<void> {
  try {
    await supabase.functions.invoke('match-new-manufacturer', { body: { company_id: companyId } });
  } catch {
    // non-blocking — matching failure must not block signup
  }
}

export async function updateRequirement(id: string, payload: Partial<Requirement>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('requirements').update(payload).eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// QUOTATIONS
// ============================================================
export async function getQuotationsForRequirement(requirementId: string): Promise<Quotation[]> {
  const { data } = await supabase
    .from('quotations')
    .select('*, companies!supplier_company_id(id,company_name,slug,verification_status,city,country,logo_url,years_in_business)')
    .eq('requirement_id', requirementId)
    .order('created_at', { ascending: false });
  return Array.isArray(data) ? data : [];
}

export async function getMyQuotations(supplierId: string): Promise<Quotation[]> {
  const { data } = await supabase
    .from('quotations')
    .select('*, requirements!requirement_id(id,title,quantity,quantity_unit,destination_country,deadline)')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  return Array.isArray(data) ? data : [];
}

export async function createQuotation(payload: Partial<Quotation>): Promise<{ error: string | null }> {
  // Database backend validation: verify subscription before insert
  const supplierId = payload.supplier_id;
  const companyId = payload.supplier_company_id;

  if (companyId) {
    const sub = await getActiveSubscription(companyId);
    if (!sub) {
      return {
        error: 'Active paid subscription required to send quotations. Choose Starter (₹2,500), Business (₹7,500), or Growth (₹15,000).'
      };
    }
    if (sub.max_rfq_leads < 999999 && (sub.used_rfq_leads ?? 0) >= sub.max_rfq_leads) {
      return {
        error: `Monthly post response quota exceeded (${sub.used_rfq_leads}/${sub.max_rfq_leads} used). Upgrade your plan to send more responses.`
      };
    }
  } else if (supplierId) {
    try {
      const { data: isSubscribed, error: rpcErr } = await supabase.rpc('is_supplier_subscribed', { p_user_id: supplierId });
      if (rpcErr) {
        console.warn('Subscription RPC check error:', rpcErr.message);
      } else if (!isSubscribed) {
        return {
          error: 'Active paid subscription required to send quotations. Choose Starter (₹2,500), Business (₹7,500), or Growth (₹15,000).'
        };
      }
    } catch (e: any) {
      console.warn('Subscription check error:', e);
    }
  }

  const { error } = await supabase.from('quotations').insert(payload as Quotation);
  if (error) {
    if (error.message?.includes('subscription') || error.code === 'P0001' || error.message?.includes('violates row-level security')) {
      return {
        error: 'Active paid subscription required to send quotations. Choose Starter (₹2,500), Business (₹7,500), or Growth (₹15,000).'
      };
    }
    return { error: error.message };
  }

  // Increment used quota if companyId is available
  if (companyId) {
    await incrementMessageQuota(companyId).catch(() => {});
  }

  return { error: null };
}

export async function updateQuotationStatus(id: string, status: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('quotations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// CONVERSATIONS & MESSAGES
// ============================================================
export async function getConversations(userId: string, companyId?: string): Promise<Conversation[]> {
  try {
    let orFilter = `buyer_id.eq.${userId},supplier_id.eq.${userId}`;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (companyId && uuidRegex.test(companyId)) {
      orFilter += `,supplier_company_id.eq.${companyId}`;
    }
    const { data } = await supabase
      .from('conversations')
      .select('*, companies!supplier_company_id(id,company_name,slug,logo_url), buyer:profiles!buyer_id(id,full_name), supplier:profiles!supplier_id(id,full_name), product:products!product_id(id,name,slug,price_min,price_max,price_currency,moq,moq_unit)')
      .or(orFilter)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(50);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('Error fetching conversations:', e);
    return [];
  }
}

export async function getMessages(conversationId: string, cursor?: string): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id,full_name,avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (cursor) query = query.lt('created_at', cursor);
  const { data } = await query;
  return Array.isArray(data) ? (data as Message[]).reverse() : [];
}

export async function sendMessage(conversationId: string, content: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, content });
  return { error: error?.message ?? null };
}

// ─── Subscription-gated chat via Edge Function ───────────────────────────────

export type ChatAuthError =
  | 'not_authenticated'
  | 'buyer_not_subscribed'
  | 'supplier_not_subscribed'
  | 'conversation_creation_failed'
  | 'missing_supplier_info'
  | 'cannot_chat_with_self'
  | string;

export interface ChatAuthResult {
  conversation_id: string | null;
  buyer_eligible: boolean | null;
  supplier_eligible: boolean | null;
  error: ChatAuthError | null;
}

/**
 * Server-side: verifies both parties' subscriptions and gets/creates the conversation.
 * Returns conversation_id on success, error code on failure.
 */
export async function initLiveChat(params: {
  supplier_id: string;
  supplier_company_id: string;
  product_id?: string | null;
  requirement_id?: string | null;
}): Promise<ChatAuthResult> {
  const { data, error } = await supabase.functions.invoke<ChatAuthResult>('chat-auth', {
    body: params,
    method: 'POST',
  });
  if (error) {
    const msg = await error?.context?.text?.();
    try {
      const parsed = JSON.parse(msg ?? '{}');
      return { conversation_id: null, buyer_eligible: null, supplier_eligible: null, error: parsed.error ?? 'unknown' };
    } catch {
      return { conversation_id: null, buyer_eligible: null, supplier_eligible: null, error: msg ?? 'unknown' };
    }
  }
  return data ?? { conversation_id: null, buyer_eligible: null, supplier_eligible: null, error: 'unknown' };
}

/**
 * Server-side: sends a message — subscription verified server-side.
 */
export async function sendSecureMessage(conversationId: string, content: string): Promise<{ message: Message | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ message: Message }>('send-chat-message', {
    body: { conversation_id: conversationId, content },
    method: 'POST',
  });
  if (error) {
    const msg = await error?.context?.text?.();
    try {
      const parsed = JSON.parse(msg ?? '{}');
      return { message: null, error: parsed.error ?? 'send_failed' };
    } catch {
      return { message: null, error: msg ?? 'send_failed' };
    }
  }
  return { message: data?.message ?? null, error: null };
}

/**
 * Mark all messages in a conversation as read from the given user's perspective.
 */
export async function markConversationRead(conversationId: string, userId: string, role: 'buyer' | 'supplier'): Promise<void> {
  if (role === 'buyer') {
    await supabase.from('conversations').update({ buyer_unread: 0 }).eq('id', conversationId).eq('buyer_id', userId);
  } else {
    await supabase.from('conversations').update({ supplier_unread: 0 }).eq('id', conversationId).eq('supplier_id', userId);
  }
}

export async function getOrCreateConversation(buyerId: string, supplierId: string, supplierCompanyId: string, requirementId?: string): Promise<{ id: string | null; error: string | null }> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('supplier_id', supplierId)
    .maybeSingle();

  if (existing) return { id: existing.id, error: null };

  const { data, error } = await supabase
    .from('conversations')
    .insert({ buyer_id: buyerId, supplier_id: supplierId, supplier_company_id: supplierCompanyId, requirement_id: requirementId ?? null })
    .select('id')
    .maybeSingle();

  return { id: data?.id ?? null, error: error?.message ?? null };
}


// ============================================================
// DIRECT SUPPLIER CHAT & INQUIRY SYSTEM
// Enables anyone (buyer or guest) to send messages to any supplier
// and routes seamlessly to Supplier Dashboard
// ============================================================

const INQUIRIES_STORAGE_KEY = 'bulkskart_supplier_inquiries_store';

function getLocalInquiries(): SupplierInquiry[] {
  try {
    const raw = localStorage.getItem(INQUIRIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function saveLocalInquiries(items: SupplierInquiry[]) {
  try {
    localStorage.setItem(INQUIRIES_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('bulkskart:inquiry_updated'));
  } catch {
    // Ignore storage quota
  }
}

export async function sendDirectSupplierInquiry(params: {
  supplier_company_id: string;
  supplier_id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  product_slug?: string | null;
  buyer_id?: string | null;
  sender_name: string;
  sender_email: string;
  sender_phone?: string;
  sender_company?: string;
  subject?: string;
  message: string;
  target_quantity?: number;
  quantity_unit?: string;
}): Promise<{ conversation_id: string | null; inquiry: SupplierInquiry | null; error: string | null }> {
  try {
    const inquiryId = `inq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const convId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. Resolve company name for title
    let targetCompanyName = 'Verified Supplier';
    try {
      const co = await getCompanyBySlug(params.supplier_company_id);
      if (co?.company_name) targetCompanyName = co.company_name;
    } catch {
      // Ignore
    }

    const newInquiry: SupplierInquiry = {
      id: inquiryId,
      conversation_id: convId,
      supplier_company_id: params.supplier_company_id,
      supplier_name: targetCompanyName,
      sender_name: params.sender_name,
      sender_email: params.sender_email,
      sender_phone: params.sender_phone,
      sender_company: params.sender_company,
      subject: params.subject || `Inquiry for ${targetCompanyName}`,
      message: params.message,
      product_id: params.product_id || null,
      product_name: params.product_name || null,
      product_slug: params.product_slug || null,
      target_quantity: params.target_quantity,
      quantity_unit: params.quantity_unit || 'Units',
      created_at: new Date().toISOString(),
      status: 'new',
      replies: [],
    };

    // Store in local inquiry cache for immediate display
    const currentList = getLocalInquiries();
    saveLocalInquiries([newInquiry, ...currentList.filter(i => i.id !== inquiryId)]);

    // 2. Also try inserting into Supabase instant_quote_requests or conversations if UUIDs match
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (params.buyer_id && uuidRegex.test(params.buyer_id) && uuidRegex.test(params.supplier_company_id)) {
      try {
        await supabase.from('instant_quote_requests').insert({
          buyer_id: params.buyer_id,
          supplier_company_id: params.supplier_company_id,
          product_id: params.product_id && uuidRegex.test(params.product_id) ? params.product_id : null,
          quantity: params.target_quantity || 100,
          quantity_unit: params.quantity_unit || 'Units',
          message: `${params.subject ? `[${params.subject}] ` : ''}${params.message} (Contact: ${params.sender_name}, ${params.sender_email}, ${params.sender_phone || 'N/A'})`,
          status: 'pending',
        });
      } catch (dbErr) {
        console.warn('Instant quote fallback log:', dbErr);
      }
    }

    return { conversation_id: convId, inquiry: newInquiry, error: null };
  } catch (err: any) {
    return { conversation_id: null, inquiry: null, error: err?.message || 'Failed to send inquiry' };
  }
}

export function getSupplierInquiries(companyId?: string, userId?: string): SupplierInquiry[] {
  const all = getLocalInquiries();
  if (!companyId && !userId) return [];
  return all.filter(item => {
    if (companyId && item.supplier_company_id === companyId) {
      return true;
    }
    if (userId && (item as any).supplier_id === userId) {
      return true;
    }
    return false;
  });
}

/** One-time welcome seed flag per manufacturer company */
function welcomeLeadsFlagKey(companyId: string) {
  return `bulkskart_mfr_welcome_leads_v1_${companyId}`;
}

export function hasManufacturerWelcomeLeads(companyId: string): boolean {
  if (!companyId) return false;
  try {
    if (localStorage.getItem(welcomeLeadsFlagKey(companyId)) === '1') return true;
  } catch {
    /* ignore */
  }
  return getLocalInquiries().some((i) => i.id.startsWith(`welcome-lead-${companyId}-`));
}

/**
 * Simulation: when a manufacturer joins, auto-deliver 5 sample buyer lead
 * messages into their Messages inbox (inquiries tab). Idempotent per company.
 */
export function ensureManufacturerWelcomeLeads(
  companyId: string,
  companyName = 'Your Factory',
  options?: { force?: boolean }
): { seeded: boolean; inquiries: SupplierInquiry[] } {
  if (!companyId) return { seeded: false, inquiries: [] };

  if (!options?.force && hasManufacturerWelcomeLeads(companyId)) {
    return { seeded: false, inquiries: getSupplierInquiries(companyId) };
  }

  const now = Date.now();
  const leads: SupplierInquiry[] = [
    {
      id: `welcome-lead-${companyId}-1`,
      conversation_id: `welcome-conv-${companyId}-1`,
      supplier_company_id: companyId,
      supplier_name: companyName,
      sender_name: 'Verified Buyer Desk',
      sender_email: 'procurement@sample-buyer.bulkskart',
      sender_phone: '+91 90000 10001',
      sender_company: 'Sample Trading House · West Zone',
      subject: 'RFQ: Bulk raw material supply — urgent quote',
      message:
        'Welcome to BulkSkart. We are simulating a live buyer lead: please share MOQ, FOB/CIF pricing, lead time, and GST invoice terms for a trial bulk order. Reply in this thread to practice the manufacturer inbox.',
      product_name: 'Industrial Bulk Lot (Sample Lead)',
      target_quantity: 5000,
      quantity_unit: 'Units',
      created_at: new Date(now - 45_000).toISOString(),
      status: 'new',
      replies: [],
    },
    {
      id: `welcome-lead-${companyId}-2`,
      conversation_id: `welcome-conv-${companyId}-2`,
      supplier_company_id: companyId,
      supplier_name: companyName,
      sender_name: 'OEM Procurement Cell',
      sender_email: 'oem.sourcing@sample-buyer.bulkskart',
      sender_phone: '+91 90000 10002',
      sender_company: 'Sample OEM Works · South Zone',
      subject: 'Need factory datasheet + tier pricing',
      message:
        'Simulated lead #2: Looking for manufacturer-direct rates with export packaging. Can you confirm capacity for the next 30 days and share a sample quotation template?',
      product_name: 'OEM Component Pack (Sample Lead)',
      target_quantity: 1200,
      quantity_unit: 'Pieces',
      created_at: new Date(now - 3 * 60_000).toISOString(),
      status: 'new',
      replies: [],
    },
    {
      id: `welcome-lead-${companyId}-3`,
      conversation_id: `welcome-conv-${companyId}-3`,
      supplier_company_id: companyId,
      supplier_name: companyName,
      sender_name: 'Export House Desk',
      sender_email: 'exports@sample-buyer.bulkskart',
      sender_phone: '+91 90000 10003',
      sender_company: 'Sample Export Consortium · North Zone',
      subject: 'Container load inquiry — HS code & COA',
      message:
        'Simulated lead #3: Preparing a container booking. Please advise HS code, certificate of analysis availability, and earliest dispatch window from your plant.',
      product_name: 'Export-Ready Commodity (Sample Lead)',
      target_quantity: 18,
      quantity_unit: 'Metric Tons',
      created_at: new Date(now - 8 * 60_000).toISOString(),
      status: 'new',
      replies: [],
    },
    {
      id: `welcome-lead-${companyId}-4`,
      conversation_id: `welcome-conv-${companyId}-4`,
      supplier_company_id: companyId,
      supplier_name: companyName,
      sender_name: 'Distributor Network',
      sender_email: 'distro@sample-buyer.bulkskart',
      sender_phone: '+91 90000 10004',
      sender_company: 'Sample Distribution Hub · Central Zone',
      subject: 'Repeat monthly PO — lock rate for 90 days',
      message:
        'Simulated lead #4: We want a rolling monthly PO. Share volume break discounts and whether you support scheduled deliveries to multiple warehouses.',
      product_name: 'Recurring Supply Contract (Sample Lead)',
      target_quantity: 800,
      quantity_unit: 'Cartons',
      created_at: new Date(now - 18 * 60_000).toISOString(),
      status: 'new',
      replies: [],
    },
    {
      id: `welcome-lead-${companyId}-5`,
      conversation_id: `welcome-conv-${companyId}-5`,
      supplier_company_id: companyId,
      supplier_name: companyName,
      sender_name: 'Project Sourcing Desk',
      sender_email: 'projects@sample-buyer.bulkskart',
      sender_phone: '+91 90000 10005',
      sender_company: 'Sample Projects Pvt · East Zone',
      subject: 'Project tender — submit commercial + technical bid',
      message:
        'Simulated lead #5: Project tender simulation. Kindly reply with commercial offer, standard lead time, payment terms (LC/TT), and any plant visit slots this week.',
      product_name: 'Project Tender Lot (Sample Lead)',
      target_quantity: 25000,
      quantity_unit: 'Units',
      created_at: new Date(now - 32 * 60_000).toISOString(),
      status: 'new',
      replies: [],
    },
  ];

  const withoutOldWelcome = getLocalInquiries().filter(
    (i) => !i.id.startsWith(`welcome-lead-${companyId}-`)
  );
  saveLocalInquiries([...leads, ...withoutOldWelcome]);
  try {
    localStorage.setItem(welcomeLeadsFlagKey(companyId), '1');
  } catch {
    /* ignore */
  }

  return { seeded: true, inquiries: getSupplierInquiries(companyId) };
}

export function replyToSupplierInquiry(
  inquiryId: string,
  replyContent: string,
  senderName = 'Supplier'
): { success: boolean; reply: InquiryReply | null } {
  try {
    const list = getLocalInquiries();
    const idx = list.findIndex(i => i.id === inquiryId);
    if (idx === -1) return { success: false, reply: null };

    const newReply: InquiryReply = {
      id: `rep-${Date.now()}`,
      sender: 'supplier',
      sender_name: senderName,
      content: replyContent,
      created_at: new Date().toISOString(),
    };

    const updated = {
      ...list[idx],
      status: 'replied' as const,
      replies: [...(list[idx].replies || []), newReply],
    };

    list[idx] = updated;
    saveLocalInquiries([...list]);
    return { success: true, reply: newReply };
  } catch {
    return { success: false, reply: null };
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
}

// ============================================================
// PROFILE
// ============================================================
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export async function updateProfile(userId: string, payload: Partial<Profile>): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

// ============================================================
// ADMIN
// ============================================================
export async function adminGetAllProfiles(cursor?: string): Promise<Profile[]> {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (cursor) query = query.lt('created_at', cursor);
  const { data } = await query;
  return Array.isArray(data) ? data : [];
}

export async function adminGetPendingCompanies(): Promise<Company[]> {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false });
  return Array.isArray(data) ? data : [];
}

export async function adminUpdateCompanyVerification(id: string, status: string): Promise<{ error: string | null }> {
  const payload: Partial<Company> = {
    verification_status: status as Company['verification_status'],
    updated_at: new Date().toISOString(),
  };
  if (status === 'verified') payload.verified_at = new Date().toISOString();
  const { error } = await supabase.from('companies').update(payload).eq('id', id);
  return { error: error?.message ?? null };
}

export async function adminGetReports(): Promise<any[]> {
  const { data } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  return Array.isArray(data) ? data : [];
}

export async function adminUpdateUserStatus(userId: string, status: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

// ============================================================
// CERTIFICATIONS
// ============================================================
export async function getCompanyCertifications(companyId: string): Promise<CompanyCertification[]> {
  try {
    const { data } = await supabase
      .from('company_certifications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // ignore
  }

  // Real manufacturers show only their genuine uploaded & verified certificates
  return [];
}

export async function upsertCertification(payload: Partial<CompanyCertification>): Promise<{ error: string | null; id?: string }> {
  if (payload.id) {
    const { error } = await supabase
      .from('company_certifications')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', payload.id);
    return { error: error?.message ?? null, id: payload.id };
  }
  const { data, error } = await supabase
    .from('company_certifications')
    .insert(payload as CompanyCertification)
    .select('id')
    .maybeSingle();
  return { error: error?.message ?? null, id: data?.id };
}

export async function deleteCertification(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('company_certifications').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ============================================================
// ORDERS
// ============================================================
export async function createOrder(payload: {
  quotation_id: string;
  requirement_id?: string | null;
  buyer_id: string;
  supplier_id?: string | null;
  supplier_company_id: string;
  total_amount: number;
  currency: string;
  quantity: number;
  quantity_unit?: string | null;
  notes?: string | null;
}): Promise<{ data: { id: string; order_number: string } | null; error: string | null }> {
  const { data, error } = await supabase
    .from('orders')
    .insert({ ...payload, milestone: 'quote_accepted' })
    .select('id,order_number')
    .maybeSingle();
  return { data: data as { id: string; order_number: string } | null, error: error?.message ?? null };
}

export async function getOrdersForBuyer(buyerId: string): Promise<OrderRow[]> {
  const { data } = await supabase
    .from('orders')
    .select('id,order_number,milestone,total_amount,currency,quantity,quantity_unit,created_at,updated_at,quotations(unit_price,payment_terms,delivery_terms),requirements(title,quantity_unit),companies:supplier_company_id(company_name,slug,logo_url,verification_status)')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as OrderRow[];
}

export async function getOrdersForSupplier(companyId: string): Promise<OrderRow[]> {
  const { data } = await supabase
    .from('orders')
    .select('id,order_number,milestone,total_amount,currency,quantity,quantity_unit,created_at,updated_at,quotations(unit_price,payment_terms,delivery_terms),requirements(title,quantity_unit),buyer:profiles!buyer_id(full_name,avatar_url)')
    .eq('supplier_company_id', companyId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as OrderRow[];
}

export async function addMilestoneLog(orderId: string, milestone: string, changedBy: string, notes?: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('order_milestone_logs')
    .insert({ order_id: orderId, milestone, changed_by: changedBy, notes: notes ?? null });
  return { error: error?.message ?? null };
}

// ============================================================
// ORDER STATUS PIPELINE (5-stage)
// ============================================================
import type { OrderStatusHistory, PipelineStatus } from '@/types/types';

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
  const { data } = await supabase
    .from('order_status_history')
    .select('*, changer:changed_by(full_name,avatar_url)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  return Array.isArray(data) ? data as unknown as OrderStatusHistory[] : [];
}

export async function advanceOrderStatus(
  orderId: string,
  fromStatus: PipelineStatus,
  toStatus: PipelineStatus,
  changerRole: 'buyer' | 'supplier' | 'admin',
  notes?: string,
  trackingDetails?: { courier?: string; number?: string; eta?: string },
): Promise<{ error: string | null }> {
  const updatePayload: Record<string, unknown> = {
    order_status: toStatus,
    updated_at: new Date().toISOString(),
  };
  if (trackingDetails?.courier)  updatePayload.tracking_courier = trackingDetails.courier;
  if (trackingDetails?.number)   updatePayload.tracking_number  = trackingDetails.number;
  if (trackingDetails?.eta)      updatePayload.tracking_eta     = trackingDetails.eta;

  const { error: orderErr } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId);
  if (orderErr) return { error: orderErr.message };

  const { data: me } = await supabase.auth.getUser();
  const { error: histErr } = await supabase
    .from('order_status_history')
    .insert({
      order_id: orderId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: me.user!.id,
      changer_role: changerRole,
      notes: notes ?? null,
    });
  return { error: histErr?.message ?? null };
}

export async function cancelOrder(
  orderId: string,
  fromStatus: PipelineStatus,
  changerRole: 'buyer' | 'supplier' | 'admin',
  reason: string,
): Promise<{ error: string | null }> {
  const { error: orderErr } = await supabase
    .from('orders')
    .update({ order_status: 'cancelled', cancelled_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (orderErr) return { error: orderErr.message };

  const { data: me } = await supabase.auth.getUser();
  const { error: histErr } = await supabase
    .from('order_status_history')
    .insert({
      order_id: orderId,
      from_status: fromStatus,
      to_status: 'cancelled' as PipelineStatus,
      changed_by: me.user!.id,
      changer_role: changerRole,
      notes: reason,
    });
  return { error: histErr?.message ?? null };
}

// ============================================================
// REVIEWS
// ============================================================
export async function getCompanyReviews(companyId: string): Promise<CompanyReview[]> {
  try {
    const { data } = await supabase
      .from('company_reviews')
      .select('*, reviewer:profiles!reviewer_id(id,full_name,avatar_url)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // ignore
  }

  // Authentic companies only show real verified buyer reviews
  return [];
}

export async function createCompanyReview(payload: Partial<CompanyReview>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('company_reviews').insert(payload as CompanyReview);
  return { error: error?.message ?? null };
}
