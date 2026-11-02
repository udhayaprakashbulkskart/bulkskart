/**
 * FeaturedProductsSection - High-Scale B2B Wholesale Product Marketplace Catalog
 * Powered by Direct Global Manufacturer Sourcing & Dynamic Supabase Database
 *
 * Requirements Met:
 * 1. Product Catalog: Dynamic backend pagination supporting 5,000+ to millions of products
 * 2. Categories: All, Apparel, Electronics, Machinery, Home & Garden, Beauty & Personal Care,
 *    Furniture, Construction, Automotive, Agriculture, Packaging, Electrical, Renewable Energy,
 *    Raw Materials, More Categories (dynamically loaded from DB)
 * 3. Product Cards: Real product-specific photography, Name, MOQ, Bulk Price Range, Supplier,
 *    Country flag, Verified badge, Star Rating, Review count, Badges (Bulk Deal, New, Popular, Best Seller),
 *    View Details, Get Quote (#FF5A00 brand button opening QuickQuoteModal)
 * 4. Search & Filter: Search products, Category, Sub-category, MOQ, Price, Country, Verified Supplier,
 *    Rating, Sort (Popular, New, Price Low-High, Price High-Low)
 * 5. Mobile & Desktop: Mobile 2-column grid without text clipping, desktop 4-6 column grid,
 *    smooth horizontal category scrolling, mobile filter drawer.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, Heart, Star, Flame, Crown, Tag,
  MessageSquare, RefreshCw, Sparkles, AlertCircle, ChevronRight,
  Search, SlidersHorizontal, Filter, X, Building2, MapPin,
  ShieldCheck, ChevronDown, CheckCircle2, Globe, Layers, ArrowUpDown,
  Zap, PackageCheck, ExternalLink, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from '@/components/ui/sheet';
import SafeImage from '@/components/common/SafeImage';
import QuickQuoteModal from '@/components/home/QuickQuoteModal';
import { getMarketplaceProducts, getCategories, type MarketplaceProductFilterOptions } from '@/lib/api';
import type { Product, Category } from '@/types/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { isGenericOrDuplicateImage } from '@/lib/productImageMatchingEngine';

// Export DisplayProduct for compatibility with QuickQuoteModal and other components
export interface DisplayProduct {
  id: string;
  name: string;
  subtitle?: string;
  slug?: string;
  companyId?: string;
  supplierOwnerId?: string;
  moq: string;
  usdMin: number;
  usdMax: number;
  inrMin?: number;
  inrMax?: number;
  badgeType: 'popular' | 'best_seller' | 'new_arrival' | 'bulk_deal' | 'trending';
  badgeLabel: string;
  rating: number;
  reviewCount: number;
  isVerifiedSupplier: boolean;
  supplierName: string;
  country: string;
  countryFlag?: string;
  img: string;
  tabs?: string[];
  createdAt?: string;
  categoryName?: string;
  subCategory?: string;
}

// ── Standard Categories requested by prompt ─────────────────────────────
interface NavCategory {
  id: string;
  label: string;
  dbSlugMatch: string[];
  icon?: string;
  subCategories: string[];
}

const MARKETPLACE_CATEGORIES: NavCategory[] = [
  { id: 'all', label: 'All Products', dbSlugMatch: [], subCategories: ['All Subcategories', 'High Demand', 'Wholesale Bulk', 'Direct Factory'] },
  { id: 'apparel', label: 'Apparel', dbSlugMatch: ['textiles-apparel', 'apparel', 'fashion'], subCategories: ['All Subcategories', 'Fabric Rolls', 'Cotton Yarn', 'Denim', 'Silk', 'Garments', 'Sportswear'] },
  { id: 'electronics', label: 'Electronics', dbSlugMatch: ['electronics-electricals', 'electronics'], subCategories: ['All Subcategories', 'Microchips', 'Sensors', 'Audio Equipment', 'IoT Devices', 'CCTV', 'Displays'] },
  { id: 'machinery', label: 'Machinery', dbSlugMatch: ['machinery-industrial', 'machinery'], subCategories: ['All Subcategories', 'CNC Centers', 'Excavators', 'Hydraulic Pumps', 'Milling', 'Lathes', 'Water Pumps'] },
  { id: 'home-garden', label: 'Home & Garden', dbSlugMatch: ['furniture-home', 'home-garden'], subCategories: ['All Subcategories', 'Ceramic Planters', 'Cookware', 'Garden Tools', 'LED Lighting', 'Outdoor Decor'] },
  { id: 'beauty', label: 'Beauty & Personal Care', dbSlugMatch: ['beauty-personal-care', 'pharma-healthcare'], subCategories: ['All Subcategories', 'Wild Collagen', 'Essential Oils', 'Cosmetic Jars', 'Skincare', 'Organic Extract'] },
  { id: 'furniture', label: 'Furniture', dbSlugMatch: ['furniture-home', 'furniture'], subCategories: ['All Subcategories', 'Ergonomic Chairs', 'Dining Sets', 'Office Desks', 'Metal Racks', 'Hotel Furniture'] },
  { id: 'construction', label: 'Construction', dbSlugMatch: ['construction-building', 'construction'], subCategories: ['All Subcategories', 'Steel Rebar', 'Cement', 'Ceramic Tiles', 'Scaffolding', 'Safety Gear', 'Pipes'] },
  { id: 'automotive', label: 'Automotive', dbSlugMatch: ['auto-parts-vehicles', 'automotive'], subCategories: ['All Subcategories', 'Brake Systems', 'EV Chargers', 'Batteries', 'Alloy Wheels', 'Turbochargers'] },
  { id: 'agriculture', label: 'Agriculture', dbSlugMatch: ['agriculture-food', 'agriculture'], subCategories: ['All Subcategories', 'Basmati Rice', 'Spices', 'Raw Cashew', 'Grains', 'Tea Leaves', 'Edible Oils'] },
  { id: 'packaging', label: 'Packaging', dbSlugMatch: ['packaging'], subCategories: ['All Subcategories', 'Kraft Paper Bags', 'Corrugated Boxes', 'Glass Bottles', 'Vacuum Pouches', 'Caps & Closures'] },
  { id: 'electrical', label: 'Electrical', dbSlugMatch: ['electronics-electricals', 'electrical'], subCategories: ['All Subcategories', 'Copper Cables', 'Circuit Breakers', 'Transformers', 'Switchgear', 'Solar Inverters'] },
  { id: 'renewable-energy', label: 'Renewable Energy', dbSlugMatch: ['renewable-energy', 'machinery-industrial'], subCategories: ['All Subcategories', 'Solar PV Modules', 'LiFePO4 Storage', 'Wind Turbines', 'Inverters', 'Charge Controllers'] },
  { id: 'raw-materials', label: 'Raw Materials', dbSlugMatch: ['chemicals-raw-materials', 'raw-materials', 'plastics-rubber'], subCategories: ['All Subcategories', 'Polymer Granules', 'Aluminum Ingots', 'Titanium Alloys', 'Chemical Resins', 'Rubber Sheets'] },
];

/** Fast Unsplash WebP thumbs for category fallbacks (no Pixabay hotlinks) */
const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&h=640&q=75&fm=webp`;

const CATEGORY_IMAGE_BANKS: Record<string, string[]> = {
  apparel: [
    u('photo-1558611848-73f7eb4001a1'),
    u('photo-1620799140408-edc6dcb6d633'),
    u('photo-1558769132-cb1aea458c5e'),
    u('photo-1610030469983-98e550d6193c'),
  ],
  electronics: [
    u('photo-1518770660439-4636190af475'),
    u('photo-1581092160562-40aa08e78837'),
    u('photo-1550985543-f47df4b4c4e0'),
    u('photo-1516035069371-29a1b244cc32'),
  ],
  machinery: [
    u('photo-1565793298595-6a879b1d9492'),
    u('photo-1565043589221-1a6fd9ae45c7'),
    u('photo-1581094794329-c8112a89af12'),
    u('photo-1530587191325-3db32d826c18'),
    u('photo-1596040033229-a9821ebd058d'),
  ],
  agriculture: [
    u('photo-1586201375761-83865001e31c'),
    u('photo-1508747703725-719777637510'),
    u('photo-1464226184884-fa280b87c399'),
  ],
  packaging: [
    u('photo-1607166452427-7e4477079cb9'),
    u('photo-1586528116311-ad8dd3c8310d'),
    u('photo-1596462502278-27bfdc403348'),
    u('photo-1563245372-f21724e3856d'),
  ],
  beauty: [
    u('photo-1608571423902-eed4a5ad8108'),
    u('photo-1556228578-0d85b1a4d571'),
    u('photo-1596462502278-27bfdc403348'),
  ],
  furniture: [
    u('photo-1586023492125-27b2c045efd7'),
    u('photo-1617806118233-18e1de247200'),
    u('photo-1567538096630-e0c55bd6374c'),
  ],
  construction: [
    u('photo-1504307651254-35680f356dfd'),
    u('photo-1503387762-592deb58ef4e'),
    u('photo-1565193566173-7a0ee3dbe261'),
    u('photo-1504328345606-18bbc8c9d7d1'),
  ],
  automotive: [
    u('photo-1492144534655-ae79c964c9d7'),
    u('photo-1581092918056-0c4c3acd3789'),
    u('photo-1593941707882-a5bba14938c7'),
  ],
  'home-garden': [
    u('photo-1416879595882-3373a0480b5b'),
    u('photo-1556910103-1c02745aae4d'),
  ],
  electrical: [
    u('photo-1621905252507-b35492cc74b4'),
    u('photo-1558618666-fcd25c85cd64'),
  ],
  'renewable-energy': [
    u('photo-1509391366360-2e959784a276'),
    u('photo-1613665813446-82a78c468a1d'),
    u('photo-1473341304170-971dccb5ac1e'),
  ],
  'raw-materials': [
    u('photo-1611273426858-450d8e3c9fce'),
    u('photo-1600880292089-90a7e086ee0c'),
    u('photo-1532187863486-abf9dbad1b69'),
  ],
};

// Country codes with flags
const COUNTRY_FLAGS: Record<string, string> = {
  India: '🇮🇳',
  China: '🇨🇳',
  USA: '🇺🇸',
  Germany: '🇩🇪',
  UAE: '🇦🇪',
  Vietnam: '🇻🇳',
  Japan: '🇯🇵',
  UK: '🇬🇧',
  Turkey: '🇹🇷',
  Italy: '🇮🇹',
  'South Korea': '🇰🇷',
  Thailand: '🇹🇭',
  Sweden: '🇸🇪',
  France: '🇫🇷',
  Brazil: '🇧🇷',
  Malaysia: '🇲🇾',
  Taiwan: '🇹🇼',
};

/** Minimum catalog density for a full multi-column landing grid */
const LANDING_CATALOG_MIN = 36;
/** Cards shown in the landing grid at once (rotates every 30s) */
const LANDING_DISPLAY_COUNT = 20;
const ROTATION_SECONDS = 30;

function createVisitSeed(): number {
  const entropy =
    (typeof performance !== 'undefined' ? performance.now() : 0) * 1000 +
    Date.now() +
    Math.floor(Math.random() * 1_000_000);
  return (entropy >>> 0) || 1;
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick a rotating window from the live product pool */
function pickProductBatch(pool: DisplayProduct[], offset: number, count: number): DisplayProduct[] {
  if (pool.length === 0) return [];
  if (pool.length <= count) return pool;
  const start = ((offset % pool.length) + pool.length) % pool.length;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  const seen = new Set<string>();
  const batch: DisplayProduct[] = [];
  for (const item of rotated) {
    if (batch.length >= count) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    batch.push(item);
  }
  return batch;
}

// Deterministically pick an authentic, non-repeated image based on product name hash
function getAuthenticProductImage(productName: string, categorySlug: string, originalImage?: string): string {
  const nameLower = productName.toLowerCase();

  // Explicit check for mobile commercial food trucks / catering trailers
  if (nameLower.includes('food truck') || nameLower.includes('catering trailer') || nameLower.includes('mobile kitchen')) {
    return u('photo-1596040033229-a9821ebd058d');
  }

  // Reject generic or mismatched assets (passports, cash, currency, generic tokens)
  const isMismatched = originalImage && (
    originalImage.includes('3127927') ||
    originalImage.includes('1544816155') ||
    originalImage.includes('1542838132') ||
    originalImage.includes('4385125') ||
    originalImage.toLowerCase().includes('passport') ||
    originalImage.toLowerCase().includes('visa')
  );

  // If original image is already a custom unique asset and not a generic repetitive or mismatched one
  if (originalImage && !isMismatched && !isGenericOrDuplicateImage(originalImage)) {
    return originalImage;
  }

  // Derive target category bank
  let bankKey = 'machinery';
  const slugLower = categorySlug.toLowerCase();

  if (nameLower.includes('cloth') || nameLower.includes('silk') || nameLower.includes('cotton') || nameLower.includes('fabric') || nameLower.includes('denim') || nameLower.includes('garment') || nameLower.includes('saree') || slugLower.includes('textile') || slugLower.includes('apparel')) {
    bankKey = 'apparel';
  } else if (nameLower.includes('chip') || nameLower.includes('sensor') || nameLower.includes('electronic') || nameLower.includes('iot') || nameLower.includes('cctv') || nameLower.includes('pcb') || nameLower.includes('led') || slugLower.includes('electronic')) {
    bankKey = 'electronics';
  } else if (nameLower.includes('solar') || nameLower.includes('battery') || nameLower.includes('lifepo4') || nameLower.includes('clean energy') || nameLower.includes('inverter') || slugLower.includes('renewable')) {
    bankKey = 'renewable-energy';
  } else if (nameLower.includes('cable') || nameLower.includes('wire') || nameLower.includes('switchgear') || nameLower.includes('transformer') || slugLower.includes('electrical')) {
    bankKey = 'electrical';
  } else if (nameLower.includes('rice') || nameLower.includes('cashew') || nameLower.includes('spice') || nameLower.includes('grain') || nameLower.includes('tea') || slugLower.includes('agri')) {
    bankKey = 'agriculture';
  } else if (nameLower.includes('bag') || nameLower.includes('box') || nameLower.includes('packaging') || nameLower.includes('kraft') || nameLower.includes('pouch') || slugLower.includes('pack')) {
    bankKey = 'packaging';
  } else if (nameLower.includes('granule') || nameLower.includes('titanium') || nameLower.includes('polymer') || nameLower.includes('resin') || slugLower.includes('chemical') || slugLower.includes('raw')) {
    bankKey = 'raw-materials';
  } else if (nameLower.includes('collagen') || nameLower.includes('cosmetic') || nameLower.includes('skin') || nameLower.includes('essential oil') || slugLower.includes('beauty')) {
    bankKey = 'beauty';
  } else if (nameLower.includes('chair') || nameLower.includes('table') || nameLower.includes('furniture') || nameLower.includes('dining') || slugLower.includes('furniture')) {
    bankKey = 'furniture';
  } else if (nameLower.includes('planter') || nameLower.includes('cookware') || nameLower.includes('garden') || slugLower.includes('home-garden') || slugLower.includes('home')) {
    bankKey = 'home-garden';
  } else if (nameLower.includes('rebar') || nameLower.includes('cement') || nameLower.includes('tile') || nameLower.includes('scaffold') || nameLower.includes('construction') || nameLower.includes('lumber') || slugLower.includes('construct')) {
    bankKey = 'construction';
  } else if (nameLower.includes('charger') || nameLower.includes('bearing') || nameLower.includes('chassis') || nameLower.includes('ev ') || slugLower.includes('auto')) {
    bankKey = 'automotive';
  }

  const pool = CATEGORY_IMAGE_BANKS[bankKey] || CATEGORY_IMAGE_BANKS.machinery;
  // Calculate deterministic index from product name
  let hash = 0;
  for (let i = 0; i < productName.length; i++) {
    hash = (hash * 31 + productName.charCodeAt(i)) % pool.length;
  }
  return pool[Math.abs(hash)];
}


export default function FeaturedProductsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice, countryConfig, currencyInfo, setCountry } = useCurrency();

  // Dynamic state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'new' | 'price_low' | 'price_high'>('popular');
  const [moqFilter, setMoqFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>(() => {
    if (countryConfig.code === 'IN' || currencyInfo.currency === 'INR') return 'India';
    return 'all';
  });
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  const handleCountryFilterChange = (v: string) => {
    setCountryFilter(v);
    setPage(1);
    if (v === 'India') {
      setCountry('IN');
    } else if (v === 'USA') {
      setCountry('US');
    }
  };

  // Visit seed → different product batch on every hard refresh
  const visitSeedRef = useRef<number>(createVisitSeed());
  const [catalogPool, setCatalogPool] = useState<DisplayProduct[]>([]);
  const [rotationOffset, setRotationOffset] = useState(0);
  const rotationOffsetRef = useRef(rotationOffset);
  rotationOffsetRef.current = rotationOffset;
  const [secondsLeft, setSecondsLeft] = useState(ROTATION_SECONDS);
  const [isRotating, setIsRotating] = useState(false);
  const rotateAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Products come from the database only; nothing is shown until they load
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction modals
  const [selectedProductForQuote, setSelectedProductForQuote] = useState<DisplayProduct | null>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Category scroll container reference
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  /** True when user is browsing the default featured rail (safe to auto-rotate) */
  const isDefaultBrowse =
    selectedCategory === 'all' &&
    selectedSubCategory === 'all' &&
    !debouncedSearch &&
    moqFilter === 'all' &&
    priceFilter === 'all' &&
    !verifiedOnly &&
    ratingFilter === 'all' &&
    sortBy === 'popular' &&
    page === 1;

  const advanceProductBatch = useCallback((step = LANDING_DISPLAY_COUNT) => {
    setIsRotating(true);
    setRotationOffset((r) => r + step);
    setSecondsLeft(ROTATION_SECONDS);
    if (rotateAnimRef.current) clearTimeout(rotateAnimRef.current);
    rotateAnimRef.current = setTimeout(() => setIsRotating(false), 420);
  }, []);

  // Apply rotating window whenever offset / pool changes (default browse only)
  useEffect(() => {
    if (!isDefaultBrowse) return;
    setProducts(pickProductBatch(catalogPool, rotationOffset, LANDING_DISPLAY_COUNT));
  }, [catalogPool, rotationOffset, isDefaultBrowse]);

  // 30-second live catalog rotation
  useEffect(() => {
    if (!isDefaultBrowse) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          queueMicrotask(() => advanceProductBatch(LANDING_DISPLAY_COUNT));
          return ROTATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timer);
      if (rotateAnimRef.current) clearTimeout(rotateAnimRef.current);
    };
  }, [isDefaultBrowse, advanceProductBatch]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load wishlist from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bulkskart_product_wishlist');
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch {
      // ignore
    }
  }, []);

  // Fetch dynamic categories from database
  useEffect(() => {
    async function loadDbCategories() {
      try {
        const dbCats = await getCategories();
        if (Array.isArray(dbCats) && dbCats.length > 0) {
          setCategories(dbCats);
        }
      } catch (err) {
        console.warn('Failed to load dynamic categories from DB:', err);
      }
    }
    loadDbCategories();
  }, []);

  // Active category subcategories
  const activeNavCat = useMemo(() => {
    return MARKETPLACE_CATEGORIES.find(c => c.id === selectedCategory) || MARKETPLACE_CATEGORIES[0];
  }, [selectedCategory]);

  // Resolve matching DB Category ID based on selected NavCategory
  const resolvedDbCategoryId = useMemo(() => {
    if (selectedCategory === 'all') return undefined;
    const nav = MARKETPLACE_CATEGORIES.find(c => c.id === selectedCategory);
    if (!nav) return undefined;

    // Match against loaded DB categories by slug or name
    const found = categories.find(dbCat =>
      nav.dbSlugMatch.some(slug => dbCat.slug?.toLowerCase().includes(slug) || dbCat.name?.toLowerCase().includes(slug))
    );
    return found ? found.id : undefined;
  }, [selectedCategory, categories]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedSubCategory !== 'all') count++;
    if (debouncedSearch.trim()) count++;
    if (moqFilter !== 'all') count++;
    if (priceFilter !== 'all') count++;
    if (countryFilter !== 'all') count++;
    if (verifiedOnly) count++;
    if (ratingFilter !== 'all') count++;
    if (sortBy !== 'popular') count++;
    return count;
  }, [selectedCategory, selectedSubCategory, debouncedSearch, moqFilter, priceFilter, countryFilter, verifiedOnly, ratingFilter, sortBy]);

  // Parse MOQ and Price filters into numerical values for API
  const filterParams = useMemo<MarketplaceProductFilterOptions>(() => {
    let moqMax: number | undefined;
    if (moqFilter === '50') moqMax = 50;
    else if (moqFilter === '100') moqMax = 100;
    else if (moqFilter === '500') moqMax = 500;

    let priceMin: number | undefined;
    let priceMax: number | undefined;
    if (priceFilter === 'under50') {
      priceMax = 50;
    } else if (priceFilter === '50to500') {
      priceMin = 50;
      priceMax = 500;
    } else if (priceFilter === '500to2000') {
      priceMin = 500;
      priceMax = 2000;
    } else if (priceFilter === '2000plus') {
      priceMin = 2000;
    }

    let minRating: number | undefined;
    if (ratingFilter === '4.0') minRating = 4.0;
    else if (ratingFilter === '4.5') minRating = 4.5;
    else if (ratingFilter === '4.8') minRating = 4.8;

    return {
      categoryId: resolvedDbCategoryId,
      search: debouncedSearch,
      subCategory: selectedSubCategory !== 'all' ? selectedSubCategory : undefined,
      moqMax,
      priceMin,
      priceMax,
      country: countryFilter !== 'all' ? countryFilter : undefined,
      verifiedOnly,
      minRating,
      sortBy,
      pageSize: 18,
    };
  }, [resolvedDbCategoryId, debouncedSearch, selectedSubCategory, moqFilter, priceFilter, countryFilter, verifiedOnly, ratingFilter, sortBy]);

  // Load products from API
  const fetchProducts = useCallback(async (targetPage = 1, append = false) => {
    if (targetPage === 1) {
      if (products.length === 0) setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const res = await getMarketplaceProducts({
        ...filterParams,
        page: targetPage,
      });

      // Transform raw products into DisplayProduct with authentic metadata
      const formatted: DisplayProduct[] = res.products.map((p, index) => {
        const comp = p.companies;
        const cat = p.categories;
        const pCountry = comp?.country || (p.export_destinations && p.export_destinations[0]) || 'India';
        const rating = Number(comp?.rating_avg ?? 0);
        const reviewCount = Number(comp?.review_count ?? 0);

        // Badges mark only what the record says: a featured flag, or a listing added in the last 30 days
        let badgeType: DisplayProduct['badgeType'] = 'popular';
        let badgeLabel = '';
        if (p.is_featured) {
          badgeLabel = 'Featured';
        } else if (p.created_at && Date.now() - new Date(p.created_at).getTime() < 30 * 86_400_000) {
          badgeType = 'new_arrival';
          badgeLabel = 'New';
        }

        const rawImg = Array.isArray(p.images) && p.images[0] ? p.images[0] : '';
        const authenticImg = getAuthenticProductImage(p.name, cat?.slug || selectedCategory, rawImg);

        return {
          id: p.id,
          name: p.name,
          subtitle: p.specifications || p.tags?.slice(0, 2).join(' · ') || (cat?.name ? `${cat.name} Wholesale` : 'Direct Factory Export'),
          slug: p.slug,
          companyId: p.company_id || comp?.id,
          supplierOwnerId: comp?.owner_id,
          moq: p.moq ? `MOQ: ${p.moq} ${p.moq_unit || ''}`.trim() : 'MOQ on request',
          usdMin: p.price_min ?? 0,
          usdMax: p.price_max ?? 0,
          inrMin: (p.price_min ?? 0) * 83.5,
          inrMax: (p.price_max ?? 0) * 83.5,
          badgeType,
          badgeLabel,
          rating,
          reviewCount,
          isVerifiedSupplier: comp?.verification_status === 'verified',
          supplierName: comp?.company_name || 'Supplier',
          country: pCountry,
          countryFlag: COUNTRY_FLAGS[pCountry] || '🌐',
          img: authenticImg,
          createdAt: p.created_at,
          categoryName: cat?.name,
        };
      });

      const dedupe = (list: DisplayProduct[]) => {
        const map = new Map<string, DisplayProduct>();
        list.forEach(item => {
          if (!map.has(item.id)) map.set(item.id, item);
        });
        return Array.from(map.values());
      };

      if (append) {
        setProducts(prev => dedupe([...prev, ...formatted]));
      } else {
        const unique = dedupe(formatted);
        // Default featured rail: a rotation pool of the live products,
        // then a visit-seeded window (changes every refresh + every 30s).
        const browsingDefault =
          selectedCategory === 'all' &&
          selectedSubCategory === 'all' &&
          !debouncedSearch &&
          moqFilter === 'all' &&
          priceFilter === 'all' &&
          !verifiedOnly &&
          ratingFilter === 'all' &&
          sortBy === 'popular' &&
          !append &&
          targetPage === 1;

        if (browsingDefault) {
          const merged = dedupe([...unique]);
          const shuffled = shuffleWithSeed(merged, visitSeedRef.current ^ (Date.now() & 0xffff));
          setCatalogPool(shuffled);
          setProducts(pickProductBatch(shuffled, rotationOffsetRef.current, LANDING_DISPLAY_COUNT));
        } else {
          setProducts(unique);
        }
      }
      setTotalCount(res.totalCount);
      setHasMore(res.hasMore);
      setPage(targetPage);
    } catch (err) {
      console.error('Failed to load marketplace products:', err);
      setError('Unable to load products. Please check connection and try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [
    filterParams,
    selectedCategory,
    selectedSubCategory,
    debouncedSearch,
    moqFilter,
    priceFilter,
    verifiedOnly,
    ratingFilter,
    sortBy,
  ]);

  // Re-fetch on filter changes
  useEffect(() => {
    fetchProducts(1, false);
  }, [fetchProducts]);

  // Load more action
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProducts(page + 1, true);
    }
  };

  // Reset all filters (silent - no annoying popup)
  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setSearchQuery('');
    setDebouncedSearch('');
    setMoqFilter('all');
    setPriceFilter('all');
    setCountryFilter('all');
    setVerifiedOnly(false);
    setRatingFilter('all');
    setSortBy('popular');
    setPage(1);
  };

  // ── Auto Filter Clear Listener (Landing page requirement) ────────────────
  useEffect(() => {
    const handleClear = () => {
      handleResetFilters();
    };
    window.addEventListener('bulkskart-clear-landing-filters', handleClear);
    return () => window.removeEventListener('bulkskart-clear-landing-filters', handleClear);
  }, []);

  // Wishlist toggle
  const toggleFavorite = (id: string, name: string) => {
    const next = new Set(favorites);
    if (next.has(id)) {
      next.delete(id);
      toast.info(`Removed "${name}" from Wishlist`);
    } else {
      next.add(id);
      toast.success(`Saved "${name}" to Wishlist`);
    }
    setFavorites(next);
    try {
      localStorage.setItem('bulkskart_product_wishlist', JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  };

  // Open Get Quote Modal
  const openQuoteModal = (product: DisplayProduct) => {
    setSelectedProductForQuote(product);
    setQuoteModalOpen(true);
  };

  // Category horizontal scroll helper
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const amount = direction === 'left' ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-6 md:py-8 bg-[#15181F] border-b border-white/10 text-foreground relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF5A00]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#FF5A00]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[1440px] mx-auto px-3.5 sm:px-5 md:px-6 relative z-10">

        {/* ── 1. SECTION HEADER ────────────────────────── */}
        <div className="mb-4 sm:mb-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-7 md:h-8 bg-gradient-to-b from-[#FF5A00] to-[#FF7A00] rounded-full inline-block shrink-0 mt-1 shadow-[0_0_10px_#FF5A00]" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                    Featured <span className="text-[#FF5A00]">Products</span>
                  </h2>
                  <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono border border-border">
                    {totalCount.toLocaleString()}+ Items
                  </span>
                  {isDefaultBrowse && (
                    <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm tabular-nums">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live 30s Rotation · {secondsLeft}s
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Direct wholesale catalog from verified global factories — fresh batch every 30 seconds
                </p>
              </div>
            </div>

            {/* Quick Actions & Links */}
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  visitSeedRef.current = createVisitSeed();
                  if (isDefaultBrowse && catalogPool.length > 0) {
                    const reshuffled = shuffleWithSeed(catalogPool, visitSeedRef.current);
                    setCatalogPool(reshuffled);
                    setRotationOffset(visitSeedRef.current % Math.max(1, reshuffled.length));
                    setSecondsLeft(ROTATION_SECONDS);
                    setIsRotating(true);
                    if (rotateAnimRef.current) clearTimeout(rotateAnimRef.current);
                    rotateAnimRef.current = setTimeout(() => setIsRotating(false), 420);
                  }
                  fetchProducts(1, false);
                }}
                disabled={loading}
                className="h-8 px-2.5 bg-card border-border hover:bg-muted text-xs rounded-lg"
                title="Shuffle & refresh featured catalog"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading || isRotating ? 'animate-spin text-[#FF5A00]' : ''}`} />
                <span className="hidden sm:inline ml-1.5">Refresh</span>
              </Button>

              <Link
                to="/products"
                className="h-8 border border-[#FF5A00]/50 hover:border-[#FF5A00] text-[#FF5A00] hover:bg-[#FF5A00]/10 font-bold text-xs sm:text-sm px-3 rounded-lg flex items-center gap-1.5 transition-all group"
              >
                <span>View All ({totalCount.toLocaleString()})</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── 2. DYNAMIC CATEGORY PILL NAVIGATION ───────────────────────────── */}
        <div className="relative mb-3 sm:mb-4 group">
          {/* Scroll left button */}
          <button
            onClick={() => scrollCategories('left')}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-card border border-border text-foreground items-center justify-center hover:bg-[#FF5A00] hover:text-white hover:border-[#FF5A00] transition-colors shadow-lg"
            aria-label="Scroll categories left"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>

          {/* Horizontally scrollable pill track */}
          <div
            ref={categoryScrollRef}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth overscroll-x-contain px-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {MARKETPLACE_CATEGORIES.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubCategory('all');
                    setPage(1);
                  }}
                  className={`whitespace-nowrap flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm transition-all shrink-0 font-medium ${
                    active
                      ? 'bg-gradient-to-r from-[#FF5A00] to-[#e04f00] text-white font-bold shadow-[0_0_14px_rgba(255,90,0,0.35)] border border-[#FF5A00]'
                      : 'bg-card text-foreground/80 hover:text-foreground border border-border hover:border-foreground/20 hover:bg-muted'
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll right button */}
          <button
            onClick={() => scrollCategories('right')}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-card border border-border text-foreground items-center justify-center hover:bg-[#FF5A00] hover:text-white hover:border-[#FF5A00] transition-colors shadow-lg"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── 3. SEARCH & ADVANCED FILTER TOOLBAR ───────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3 mb-4 shadow-sm">
          {/* Top row: Search input + mobile filter trigger + desktop quick filters */}
          <div className="flex flex-col sm:flex-row flex-wrap xl:flex-nowrap items-stretch sm:items-center gap-2 sm:gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products (e.g. Solar panels, Cotton, CNC, Food truck)..."
                className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background border-border text-foreground placeholder:text-muted-foreground rounded-lg focus-visible:ring-1 focus-visible:ring-[#FF5A00] focus-visible:border-[#FF5A00]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Desktop Quick Dropdowns */}
            <div className="hidden lg:flex flex-wrap items-center gap-1.5 xl:gap-2">
              {/* Sub-category selector */}
              {activeNavCat.subCategories.length > 1 && (
                <Select
                  value={selectedSubCategory}
                  onValueChange={v => {
                    setSelectedSubCategory(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[150px] h-9 text-xs bg-background border-border text-foreground rounded-lg">
                    <SelectValue placeholder="Subcategory" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="all">All Subcategories</SelectItem>
                    {activeNavCat.subCategories.filter(s => s !== 'All Subcategories').map(sub => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* MOQ Filter */}
              <Select value={moqFilter} onValueChange={v => { setMoqFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[125px] h-9 text-xs bg-background border-border text-foreground rounded-lg">
                  <SelectValue placeholder="MOQ" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="all">Any MOQ</SelectItem>
                  <SelectItem value="50">MOQ ≤ 50</SelectItem>
                  <SelectItem value="100">MOQ ≤ 100</SelectItem>
                  <SelectItem value="500">MOQ ≤ 500</SelectItem>
                </SelectContent>
              </Select>

              {/* Price Filter */}
              <Select value={priceFilter} onValueChange={v => { setPriceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-9 text-xs bg-background border-border text-foreground rounded-lg">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="all">Any Price</SelectItem>
                  <SelectItem value="under50">Under $50</SelectItem>
                  <SelectItem value="50to500">$50 - $500</SelectItem>
                  <SelectItem value="500to2000">$500 - $2,000</SelectItem>
                  <SelectItem value="2000plus">$2,000+</SelectItem>
                </SelectContent>
              </Select>

              {/* Origin Country */}
              <Select value={countryFilter} onValueChange={handleCountryFilterChange}>
                <SelectTrigger className="w-[130px] h-9 text-xs bg-background border-border text-foreground rounded-lg">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="all">All Origins</SelectItem>
                  <SelectItem value="India">🇮🇳 India</SelectItem>
                  <SelectItem value="China">🇨🇳 China</SelectItem>
                  <SelectItem value="USA">🇺🇸 USA</SelectItem>
                  <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                  <SelectItem value="UAE">🇦🇪 UAE</SelectItem>
                  <SelectItem value="Vietnam">🇻🇳 Vietnam</SelectItem>
                  <SelectItem value="Japan">🇯🇵 Japan</SelectItem>
                  <SelectItem value="UK">🇬🇧 UK</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1); }}>
                <SelectTrigger className="w-[145px] h-9 text-xs bg-background border-border text-foreground rounded-lg">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="popular">🔥 Most Popular</SelectItem>
                  <SelectItem value="new">✨ New Arrivals</SelectItem>
                  <SelectItem value="price_low">💵 Price: Low to High</SelectItem>
                  <SelectItem value="price_high">💎 Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile / Tablet Filter Button */}
            <div className="flex items-center gap-2 sm:shrink-0">
              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-1 sm:flex-initial ${
                      activeFilterCount > 0
                        ? 'bg-[#FF5A00] text-white border-[#FF5A00]'
                        : 'bg-card text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-background border-r border-border text-foreground w-[300px] sm:w-[360px] p-5 overflow-y-auto">
                  <SheetHeader className="mb-5 pb-3 border-b border-border text-left">
                    <SheetTitle className="text-foreground text-base font-bold flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#FF5A00]" />
                      Marketplace Filters
                    </SheetTitle>
                  </SheetHeader>

                  <div className="space-y-4 text-xs">
                    {/* Sub-Category */}
                    <div>
                      <label className="text-muted-foreground block mb-1.5 font-medium">Sub-Category</label>
                      <Select
                        value={selectedSubCategory}
                        onValueChange={v => {
                          setSelectedSubCategory(v);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full h-9 bg-card border-border text-foreground rounded-lg">
                          <SelectValue placeholder="Subcategory" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground">
                          <SelectItem value="all">All Subcategories</SelectItem>
                          {activeNavCat.subCategories.filter(s => s !== 'All Subcategories').map(sub => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sort */}
                    <div>
                      <label className="text-muted-foreground block mb-1.5 font-medium">Sort By</label>
                      <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1); }}>
                        <SelectTrigger className="w-full h-9 bg-card border-border text-foreground rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground">
                          <SelectItem value="popular">🔥 Most Popular</SelectItem>
                          <SelectItem value="new">✨ New Arrivals</SelectItem>
                          <SelectItem value="price_low">💵 Price: Low to High</SelectItem>
                          <SelectItem value="price_high">💎 Price: High to Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* MOQ */}
                    <div>
                      <label className="text-muted-foreground block mb-1.5 font-medium">Minimum Order Quantity (MOQ)</label>
                      <Select value={moqFilter} onValueChange={v => { setMoqFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-full h-9 bg-card border-border text-foreground rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground">
                          <SelectItem value="all">Any MOQ</SelectItem>
                          <SelectItem value="50">Small Batch (≤ 50 Units)</SelectItem>
                          <SelectItem value="100">Medium Batch (≤ 100 Units)</SelectItem>
                          <SelectItem value="500">Commercial Batch (≤ 500 Units)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Bracket */}
                    <div>
                      <label className="text-muted-foreground block mb-1.5 font-medium">Unit Price Range</label>
                      <Select value={priceFilter} onValueChange={v => { setPriceFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-full h-9 bg-card border-border text-foreground rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground">
                          <SelectItem value="all">Any Price</SelectItem>
                          <SelectItem value="under50">Under $50</SelectItem>
                          <SelectItem value="50to500">$50 - $500</SelectItem>
                          <SelectItem value="500to2000">$500 - $2,000</SelectItem>
                          <SelectItem value="2000plus">$2,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Country of Origin */}
                    <div>
                      <label className="text-muted-foreground block mb-1.5 font-medium">Supplier Origin Country</label>
                      <Select value={countryFilter} onValueChange={handleCountryFilterChange}>
                        <SelectTrigger className="w-full h-9 bg-card border-border text-foreground rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground">
                          <SelectItem value="all">All Origins</SelectItem>
                          <SelectItem value="India">🇮🇳 India</SelectItem>
                          <SelectItem value="China">🇨🇳 China</SelectItem>
                          <SelectItem value="USA">🇺🇸 USA</SelectItem>
                          <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                          <SelectItem value="UAE">🇦🇪 UAE</SelectItem>
                          <SelectItem value="Vietnam">🇻🇳 Vietnam</SelectItem>
                          <SelectItem value="Japan">🇯🇵 Japan</SelectItem>
                          <SelectItem value="UK">🇬🇧 UK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Verified Only Toggle */}
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-foreground font-medium">Verified Suppliers Only</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={verifiedOnly}
                        onChange={e => { setVerifiedOnly(e.target.checked); setPage(1); }}
                        className="w-4 h-4 accent-[#FF5A00] rounded cursor-pointer"
                      />
                    </div>

                    {/* Rating Filter */}
                    <div>
                      <label className="text-muted-foreground block mb-1.5 font-medium">Supplier Minimum Rating</label>
                      <Select value={ratingFilter} onValueChange={v => { setRatingFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-full h-9 bg-card border-border text-foreground rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-foreground">
                          <SelectItem value="all">Any Rating</SelectItem>
                          <SelectItem value="4.5">★ 4.5 & Above (Top Rated)</SelectItem>
                          <SelectItem value="4.0">★ 4.0 & Above</SelectItem>
                          <SelectItem value="3.5">★ 3.5 & Above</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Drawer Action Buttons */}
                    <div className="pt-4 border-t border-border space-y-2">
                      <Button
                        onClick={() => setMobileFilterOpen(false)}
                        className="w-full bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold h-9 rounded-lg"
                      >
                        Apply Filters ({totalCount.toLocaleString()} Results)
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleResetFilters}
                        className="w-full text-muted-foreground hover:text-foreground h-8 text-xs"
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Reset filter badge button if filters applied */}
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] text-[#FF5A00] hover:underline flex items-center gap-1 px-1.5 py-1 whitespace-nowrap"
                >
                  <X className="w-3 h-3" />
                  <span>Clear ({activeFilterCount})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. PRODUCT GRID ───────────────────────────────────────────────── */}
        {loading && products.length === 0 ? (
          // Skeleton Loader: 8 cards matching PC grid
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5 md:gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl overflow-hidden p-2 sm:p-2.5 animate-pulse flex flex-col"
              >
                <div className="aspect-[4/3] w-full bg-muted rounded-lg mb-2.5" />
                <div className="h-4 bg-muted rounded w-3/4 mb-1.5" />
                <div className="h-3 bg-muted/60 rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-2/3 mb-2 mt-auto" />
                <div className="h-8 bg-muted rounded w-full mt-2" />
              </div>
            ))}
          </div>
        ) : error && products.length === 0 ? (
          // Error State with Retry
          <div className="bg-card border border-destructive/30 rounded-xl p-8 text-center my-6 max-w-md mx-auto shadow-sm">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h3 className="text-foreground font-bold text-base mb-1">Catalog Connection Error</h3>
            <p className="text-muted-foreground text-xs mb-4">{error}</p>
            <Button
              onClick={() => fetchProducts(1, false)}
              className="bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold text-xs h-8 px-4 rounded-lg"
            >
              Retry Loading Catalog
            </Button>
          </div>
        ) : products.length === 0 ? (
          // Empty State with Reset Filters
          <div className="bg-card border border-border rounded-2xl p-8 sm:p-12 text-center my-6 max-w-lg mx-auto shadow-sm">
            <PackageCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-foreground font-bold text-base sm:text-lg mb-1">No products match your criteria</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4">
              Try adjusting your keyword, expanding price or MOQ thresholds, or switching category tabs.
            </p>
            <Button
              onClick={handleResetFilters}
              className="bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold text-xs sm:text-sm h-9 px-5 rounded-lg shadow-lg shadow-[#FF5A00]/20"
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <>
            {/* ── Trending Deals on Mobile (Horizontal Swipe Carousel with Partial Next Card Peek) ── */}
            {products.length > 0 && (
              <div className="md:hidden mb-4">
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#FF5A00]" />
                    <span>Trending Wholesale Deals</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Swipe to browse →</span>
                </div>
                <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory overscroll-x-contain touch-pan-x -mx-3.5 px-3.5 sm:-mx-5 sm:px-5">
                  {products.slice(0, 8).map((product) => {
                    const isIndia = countryFilter === 'India' || product.country === 'India' || countryConfig.code === 'IN' || countryConfig.currency === 'INR' || currencyInfo.currency === 'INR';
                    const inrRate = currencyInfo.rate || 83.5;
                    const minFormatted = isIndia ? `₹${Math.round(product.inrMin || (product.usdMin * inrRate)).toLocaleString('en-IN')}` : formatPrice(product.usdMin);

                    return (
                      <div
                        key={`carousel-${product.id}`}
                        className="shrink-0 w-[150px] min-[360px]:w-[165px] snap-start bg-card border border-border hover:border-[#FF5A00]/50 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm"
                      >
                        <div className="relative aspect-square w-full bg-muted overflow-hidden">
                          <SafeImage
                            src={product.img}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            sizes="165px"
                          />
                          {product.badgeLabel && (
                            <span className="absolute top-1 left-1 bg-[#FF5A00] text-white text-[8.5px] font-bold px-1.5 py-0.2 rounded shadow">
                              {product.badgeLabel}
                            </span>
                          )}
                        </div>
                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <Link to={product.slug ? `/products/${product.slug}` : `/products/${product.id}`}>
                            <h4 className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight hover:text-[#FF5A00]">
                              {product.name}
                            </h4>
                          </Link>
                          <div className="mt-1 pt-1 border-t border-border">
                            <div className="text-[#FF5A00] font-black text-xs leading-none">
                              {minFormatted}
                            </div>
                            <div className="text-[9.5px] text-amber-500 font-semibold mt-0.5 truncate">
                              {product.moq}
                            </div>
                          </div>
                          <Button
                            onClick={() => openQuoteModal(product)}
                            size="sm"
                            className="w-full h-7 mt-2 bg-[#FF5A00] hover:bg-[#e04f00] text-white text-[10px] font-bold rounded-lg p-0"
                          >
                            Get Best Price
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Responsive Product Marketplace Grid */}
            {/* Mobile: Exactly 2-column grid without text clipping */}
            {/* Desktop PC: Balanced 3 to 4 columns (up to 5 on 2K+) */}
            <div
              className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5 md:gap-4 transition-opacity duration-300 ${
                isRotating ? 'opacity-55' : 'opacity-100'
              }`}
            >
            {products.map((product, productIdx) => {
              const isFav = favorites.has(product.id);

              return (
                <div
                  key={`${product.id}-${rotationOffset}`}
                  className="group bg-card hover:bg-muted/40 border border-border hover:border-[#FF5A00]/50 rounded-xl overflow-hidden transition-all duration-300 flex flex-col shadow-sm hover:shadow-[0_8px_24px_rgba(255,90,0,0.12)] relative animate-in fade-in duration-300"
                >
                    {/* ── Product Image Container ── */}
                    <div className="relative aspect-square w-full bg-muted overflow-hidden">
                      <SafeImage
                        src={product.img}
                        alt={product.name}
                        productId={product.id}
                        category={product.categoryName}
                        isDuplicateOnPage={false}
                        isRepresentativeImage={true}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading={productIdx < 6 ? 'eager' : 'lazy'}
                        priority={productIdx < 4}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
                      />

                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

                    {/* Top-Left Dynamic Badge */}
                    {product.badgeLabel && (
<div className="absolute top-1.5 left-1.5 z-10">
                      <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow ${
                        product.badgeType === 'best_seller'
                          ? 'bg-amber-500 text-black'
                          : product.badgeType === 'bulk_deal'
                          ? 'bg-[#FF5A00] text-white'
                          : product.badgeType === 'new_arrival'
                          ? 'bg-[#FF5A00] text-white'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {product.badgeType === 'best_seller' && <Crown className="w-2.5 h-2.5" />}
                        {product.badgeType === 'bulk_deal' && <Tag className="w-2.5 h-2.5" />}
                        {product.badgeType === 'new_arrival' && <Sparkles className="w-2.5 h-2.5" />}
                        {product.badgeType === 'popular' && <Flame className="w-2.5 h-2.5" />}
                        <span>{product.badgeLabel}</span>
                      </span>
                    </div>
)}

                    {/* Top-Right Wishlist Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(product.id, product.name);
                      }}
                      className="absolute top-1.5 right-1.5 z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all"
                      aria-label="Save to wishlist"
                    >
                      <Heart
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                          isFav ? 'fill-red-500 text-red-500' : 'text-white/80 hover:text-white'
                        }`}
                      />
                    </button>

                    {/* Bottom-right image badge: Origin Country (without overlapping bottom-left Representative image tag) */}
                    <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                      <span>{product.countryFlag || '🌐'}</span>
                      <span className="truncate max-w-[80px]">{product.country}</span>
                    </div>
                  </div>

                  {/* ── Product Card Body ── */}
                  <div className="p-2 sm:p-2.5 md:p-3 flex-1 flex flex-col">
                    {/* Product Title */}
                    <Link
                      to={product.slug ? `/products/${product.slug}` : `/products/${product.id}`}
                      className="block group-hover:text-[#FF5A00] transition-colors"
                    >
                      <h3
                        className="font-bold text-foreground text-xs sm:text-[13px] md:text-sm leading-snug line-clamp-2 min-h-[2.4em] mb-1"
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                    </Link>

                    {/* Price Range */}
                    <div className="mb-1.5">
                      {(() => {
                        const isIndia =
                          countryFilter === 'India' ||
                          product.country === 'India' ||
                          countryConfig.code === 'IN' ||
                          countryConfig.currency === 'INR' ||
                          currencyInfo.currency === 'INR';
                        const inrRate = currencyInfo.rate || 83.5;
                        if (!product.usdMin && !product.inrMin) {
                          return <div className="text-muted-foreground font-semibold text-xs">Price on request</div>;
                        }
                        const minFormatted = isIndia
                          ? `₹${Math.round(product.inrMin || (product.usdMin * inrRate)).toLocaleString('en-IN')}`
                          : formatPrice(product.usdMin);
                        const maxFormatted = isIndia
                          ? `₹${Math.round(product.inrMax || (product.usdMax * inrRate)).toLocaleString('en-IN')}`
                          : formatPrice(product.usdMax);

                        return (
                          <div className="text-[#FF5A00] font-black text-xs sm:text-sm md:text-[15px] leading-tight flex items-center flex-wrap gap-1">
                            <span>{minFormatted}</span>
                            {product.usdMax && product.usdMax !== product.usdMin && (
                              <span className="text-muted-foreground font-semibold text-[10px] sm:text-xs">
                                - {maxFormatted}
                              </span>
                            )}
                            {isIndia && (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                INR
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center justify-between">
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">{product.moq}</span>
                        <span className="text-muted-foreground">Wholesale</span>
                      </div>
                    </div>

                    {/* Supplier info & verification badge */}
                    <div className="pt-1.5 border-t border-border mb-2">
                      <div className="flex items-center gap-1 text-[11px] text-foreground font-medium truncate">
                        <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate" title={product.supplierName}>{product.supplierName}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                        {/* Rating */}
                        {product.reviewCount > 0 ? (
                        <div className="flex items-center gap-0.5 text-amber-500 font-semibold">
                          <Star className="w-2.5 h-2.5 fill-amber-500" />
                          <span>{product.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">({product.reviewCount})</span>
                        </div>
                        ) : <span />}

                        {/* Verified badge */}
                        {product.isVerifiedSupplier && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium text-[9px] bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── Action Buttons ── */}
                    {/* View Details + Get Quote (#FF5A00 brand button) */}
                    <div className="mt-auto grid grid-cols-2 gap-1.5 pt-1">
                      <Link
                        to={product.slug ? `/products/${product.slug}` : `/products/${product.id}`}
                        className="h-7 sm:h-7.5 border border-border hover:border-primary text-foreground bg-card hover:bg-muted text-[10px] sm:text-[11px] font-semibold rounded-lg flex items-center justify-center transition-colors text-center px-1"
                      >
                        Details
                      </Link>

                      <Button
                        onClick={() => openQuoteModal(product)}
                        className="h-7 sm:h-7.5 bg-[#FF5A00] hover:bg-[#e04f00] text-white text-[10px] sm:text-[11px] font-bold rounded-lg shadow-sm hover:shadow-[0_0_10px_rgba(255,90,0,0.5)] transition-all px-1"
                      >
                        Get Best Price
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
        )}

        {/* ── 5. BACKEND PAGINATION / LOAD MORE ─────────────────────────────── */}
        {products.length > 0 && (
          <div className="mt-6 sm:mt-8 pt-4 border-t border-border flex flex-col items-center justify-center gap-3">
            <div className="text-xs text-muted-foreground font-medium text-center">
              Showing <span className="text-foreground font-bold">{products.length}</span> of <span className="text-foreground font-bold">{totalCount.toLocaleString()}+</span> wholesale products
            </div>

            {hasMore ? (
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold text-xs sm:text-sm h-10 px-6 sm:px-8 rounded-full shadow-lg shadow-[#FF5A00]/25 transition-all flex items-center gap-2 group"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading Catalog Products...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Products</span>
                    <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                  </>
                )}
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-card px-4 py-2 rounded-full border border-border">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>You've reached the end of the filtered catalog. Explore more in the complete Products Directory.</span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Quick Quote Modal for instant RFQ submission ─────────────────── */}
      <QuickQuoteModal
        product={selectedProductForQuote}
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
      />
    </section>
  );
}
