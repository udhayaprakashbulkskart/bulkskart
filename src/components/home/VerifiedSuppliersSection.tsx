/**
 * VerifiedSuppliersSection - Exact Redesign matching reference mockup (file_00000000825482068b8a3f7235eeb10d.png)
 *
 * Requirements:
 * - Section Header:
 *   - "Verified Suppliers" in bold white text
 *   - Orange circular verified checkmark badge icon right next to title
 *   - "View All ->" link in brand orange on the right
 * - Card Architecture:
 *   - Modern factory exterior photograph at top (aspect 16/10)
 *   - Dark card container (bg-[#0f172a] with border border-slate-800)
 *   - Horizontal identity row:
 *     - Square white company logo box on left
 *     - Bold company name (e.g. ABC Industries Private Limited, Global Pack Solutions, Shakti Electricals)
 *     - Country flag + Country name in muted text
 *     - Orange "Verified Supplier" status badge with checkmark icon
 *   - Action Button:
 *     - Full-width dark button: "View Products >" linking to supplier catalog/profile
 * - Responsive:
 *   - Mobile: Horizontal touch swipe carousel with snap scrolling and partial card peek
 *   - Desktop: Responsive 3 to 4 column grid
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  BadgeCheck,
  Check,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { getCompanies } from '@/lib/api';
import { DISTINCT_PIXABAY_COMPANY_IMAGES } from '@/lib/contentImages';
import { matchProductImage } from '@/lib/productImageMatchingEngine';
import type { Company } from '@/types/types';

export interface DisplaySupplier {
  id: string;
  name: string;
  slug?: string;
  country: string;
  flag: string;
  img: string;
  logoType?: 'aubc' | 'orange_box' | 'orange_bolt' | 'green_leaf' | 'timber' | 'red_sun' | 'golden_flame' | 'cyan_circuit' | 'default';
  logoUrl?: string;
  isVerified: boolean;
  industry?: string;
  productFocus?: string;
  /** Alibaba-style sample product listing title shown on the card */
  sampleProduct?: string;
}

/**
 * Lightweight catalog image — skips SafeImage matching overhead for known-good CDN URLs.
 * Uses small WebP Unsplash derivatives + eager load for above-the-fold cards.
 */
function FastCatalogImage({
  src,
  alt,
  priority = false,
  className = '',
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(!src);
  const optimized = React.useMemo(() => optimizeCatalogUrl(src), [src]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-800 ${className}`}>
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800" />
      )}
      {!failed ? (
        <img
          src={optimized}
          alt={alt}
          width={480}
          height={300}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          // React 18: pass as DOM attr for LCP on above-the-fold cards
          {...({ fetchpriority: priority ? 'high' : 'low' } as React.ImgHTMLAttributes<HTMLImageElement>)}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-medium px-3 text-center">
          {alt}
        </div>
      )}
    </div>
  );
}

/** Shrink Unsplash/CDN payloads for card thumbnails (~40–80KB vs 300KB+) */
function optimizeCatalogUrl(url: string): string {
  if (!url) return url;
  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      u.searchParams.set('w', '480');
      u.searchParams.set('h', '300');
      u.searchParams.set('q', '70');
      u.searchParams.set('fm', 'webp');
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
}

/** Simulation cycle: rotate unique supplier batches every 30 seconds */
const ROTATION_SECONDS = 30;
const DISPLAY_COUNT = 8;

/** Fresh seed every page open / hard refresh — different users & visits get different batches */
function createVisitSeed(): number {
  const entropy =
    (typeof performance !== 'undefined' ? performance.now() : 0) * 1000 +
    Date.now() +
    Math.floor(Math.random() * 1_000_000);
  return (entropy >>> 0) || 1;
}

/** Deterministic Fisher–Yates shuffle (stable for a given seed) */
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

const COUNTRY_FLAGS: Record<string, string> = {
  'China': '🇨🇳',
  'India': '🇮🇳',
  'UAE': '🇦🇪',
  'Germany': '🇩🇪',
  'Turkey': '🇹🇷',
  'Singapore': '🇸🇬',
  'USA': '🇺🇸',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'UK': '🇬🇧',
  'Vietnam': '🇻🇳',
  'Italy': '🇮🇹',
  'France': '🇫🇷',
  'Brazil': '🇧🇷',
  'Sweden': '🇸🇪',
  'Thailand': '🇹🇭',
};

/**
 * Optimized Alibaba-style B2B product catalog photos (licensed Unsplash CDN).
 * Small WebP derivatives load fast on the landing grid (~40–80KB each).
 */
const p = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=480&h=300&q=70&fm=webp`;

/**
 * Alibaba factory-style sample catalog — company + sample product listing titles
 * inspired by verified B2B manufacturer directories (images from licensed CDNs).
 */

/** True when URL is a reliable cover (Unsplash / known good CDN), not blocked Pixabay hotlinks */
function isReliableCoverUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.includes('cdn.pixabay.com') || url.includes('pixabay.com/photo')) return false;
  if (url.startsWith('data:image')) return false;
  return url.startsWith('http');
}

/** Pick up to `count` suppliers with distinct images from a rotated pool */
function pickUniqueBatch(pool: DisplaySupplier[], offset: number, count: number): DisplaySupplier[] {
  if (pool.length === 0) return [];
  const start = ((offset % pool.length) + pool.length) % pool.length;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  const seenImg = new Set<string>();
  const seenId = new Set<string>();
  const batch: DisplaySupplier[] = [];

  for (const supplier of rotated) {
    if (batch.length >= count) break;
    if (seenId.has(supplier.id) || (supplier.img && seenImg.has(supplier.img))) continue;
    seenId.add(supplier.id);
    if (supplier.img) seenImg.add(supplier.img);
    batch.push(supplier);
  }
  return batch;
}

function preloadImages(urls: string[]) {
  if (typeof window === 'undefined') return;
  urls.filter(Boolean).forEach((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = optimizeCatalogUrl(src);
  });
}

const COUNTRY_TABS = [
  { key: 'all', label: 'All Global', flag: '🌐' },
  { key: 'India', label: 'India', flag: '🇮🇳' },
  { key: 'China', label: 'China', flag: '🇨🇳' },
  { key: 'USA', label: 'USA', flag: '🇺🇸' },
  { key: 'Germany', label: 'Germany', flag: '🇩🇪' },
  { key: 'UAE', label: 'UAE', flag: '🇦🇪' },
  { key: 'Japan', label: 'Japan', flag: '🇯🇵' },
  { key: 'South Korea', label: 'South Korea', flag: '🇰🇷' },
];

/**
 * Custom High-Resolution Vector Brand Logo Renderer
 * Matches the exact aesthetic in the reference mockup
 */
function SupplierBrandLogo({ supplier }: { supplier: DisplaySupplier }) {
  if (supplier.logoUrl) {
    return (
      <img
        src={supplier.logoUrl}
        alt={supplier.name}
        className="w-full h-full object-contain p-0.5"
        loading="lazy"
      />
    );
  }

  switch (supplier.logoType) {
    case 'aubc':
      // Card 1: AUBC / ABC monogram with navy blue shield/typography
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center select-none">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect width="40" height="40" rx="8" fill="#F8FAFC" />
            <path
              d="M12 28L20 12L28 28H23.5L20 20.5L16.5 28H12Z"
              fill="#0F172A"
            />
            <path
              d="M20 22L17.5 27H22.5L20 22Z"
              fill="#FF5A00"
            />
            <text
              x="20"
              y="36"
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="900"
              fill="#0F172A"
              letterSpacing="0.5"
            >
              AUBC
            </text>
          </svg>
        </div>
      );

    case 'orange_box':
      // Card 2: Global Pack Solutions - vibrant orange 3D isometric box package
      return (
        <div className="w-full h-full flex items-center justify-center select-none">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect width="40" height="40" rx="8" fill="#FFF7ED" />
            {/* 3D Isometric Open Box */}
            <path
              d="M20 9L31 15.5V28L20 34.5L9 28V15.5L20 9Z"
              fill="#EA580C"
            />
            <path
              d="M20 9L31 15.5L20 22L9 15.5L20 9Z"
              fill="#FB923C"
            />
            <path
              d="M20 22V34.5L9 28V15.5L20 22Z"
              fill="#C2410C"
            />
            <path
              d="M20 22L31 15.5V28L20 34.5V22Z"
              fill="#EA580C"
            />
            {/* Box tape strip */}
            <path
              d="M16 11.5L24 16.2M20 18.5V32"
              stroke="#FED7AA"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );

    case 'orange_bolt':
      // Card 3: Shakti Electricals - solid brand orange lightning bolt
      return (
        <div className="w-full h-full flex items-center justify-center select-none">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect width="40" height="40" rx="8" fill="#FFF7ED" />
            <path
              d="M22 6L11 21H19L17 34L29 17H20L22 6Z"
              fill="#FF5A00"
            />
          </svg>
        </div>
      );

    case 'green_leaf':
      // Rheinland Bio-Polymer - German eco leaf & helix
      return (
        <div className="w-full h-full flex items-center justify-center select-none">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect width="40" height="40" rx="8" fill="#F0FDF4" />
            <path
              d="M20 8C20 8 30 14 30 24C30 29.5 25.5 34 20 34C14.5 34 10 29.5 10 24C10 14 20 8 20 8Z"
              fill="#16A34A"
            />
            <path
              d="M20 12V32M20 18L26 14M20 24L14 20M20 28L25 25"
              stroke="#BBF7D0"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );

    case 'timber':
      // Pacific Northwest Timber Corp. - evergreen spruce tree
      return (
        <div className="w-full h-full flex items-center justify-center select-none">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect width="40" height="40" rx="8" fill="#ECFDF5" />
            <path
              d="M20 7L27 15H24L29 22H25L30 29H10L15 22H11L16 15H13L20 7Z"
              fill="#065F46"
            />
            <rect x="18" y="29" width="4" height="6" rx="1" fill="#78350F" />
          </svg>
        </div>
      );

    case 'red_sun':
      // Nippon Precision Optics - precision aperture lens
      return (
        <div className="w-full h-full flex items-center justify-center select-none">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect width="40" height="40" rx="8" fill="#FEF2F2" />
            <circle cx="20" cy="20" r="13" stroke="#DC2626" strokeWidth="3" />
            <circle cx="20" cy="20" r="6" fill="#DC2626" />
            <line x1="20" y1="3" x2="20" y2="7" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="33" x2="20" y2="37" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="20" x2="7" y2="20" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <line x1="33" y1="20" x2="37" y2="20" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'golden_flame':
      // Emirates Petrochem - golden refinery flame
      return (
        <div className="w-full h-full flex items-center justify-center select-none">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect width="40" height="40" rx="8" fill="#FFFBEB" />
            <path
              d="M20 7C20 7 28 15 28 23C28 27.5 24.5 33 20 33C15.5 33 12 27.5 12 23C12 15 20 7 20 7Z"
              fill="#D97706"
            />
            <path
              d="M20 16C20 16 24 21 24 25C24 27.5 22 30 20 30C18 30 16 27.5 16 25C16 21 20 16 20 16Z"
              fill="#FDE68A"
            />
          </svg>
        </div>
      );

    case 'cyan_circuit':
      // Hana Smart Energy - smart battery/chip circuit with orange accents
      return (
        <div className="w-full h-full flex items-center justify-center select-none">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect width="40" height="40" rx="8" fill="#FFF7ED" />
            <rect x="11" y="11" width="18" height="18" rx="4" fill="#EA580C" />
            <path
              d="M16 11V7M24 11V7M16 33V29M24 33V29M7 16H11M7 24H11M29 16H33M29 24H33"
              stroke="#FF5A00"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 20L19 23L24 17"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );

    default:
      // Clean fallback monogram badge
      return (
        <div className="w-full h-full rounded-lg bg-slate-900 flex items-center justify-center select-none">
          <span className="font-extrabold text-sm sm:text-base text-white tracking-wider">
            {supplier.name.substring(0, 2).toUpperCase()}
          </span>
        </div>
      );
  }
}

export default function VerifiedSuppliersSection() {
  const navigate = useNavigate();
  // Fresh unique catalog + offset every page open / refresh (no blank first paint)
  const visitSeedRef = useRef<number>(createVisitSeed());
  const [suppliers, setSuppliers] = useState<DisplaySupplier[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 30-second rotation through the loaded suppliers (a display window, not a claim about live activity)
  const [rotationOffset, setRotationOffset] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const rotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceBatch = useCallback((step = DISPLAY_COUNT) => {
    setIsRotating(true);
    setRotationOffset((r) => r + step);
    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = setTimeout(() => setIsRotating(false), 450);
  }, []);

  // Verified suppliers from the database (the template's demo companies are excluded by getCompanies)
  const loadSuppliers = useCallback(async () => {
    setError(null);
    try {
      const dbCompanies = await getCompanies({ verified: true, limit: 24 });
      const seed = visitSeedRef.current;
      const formatted: DisplaySupplier[] = [];
      const seenNames = new Set<string>();
      const usedImages = new Set<string>();

      dbCompanies.forEach((c) => {
        if (seenNames.has(c.company_name.toLowerCase())) return;
        seenNames.add(c.company_name.toLowerCase());
        const country = c.country || 'India';
        const industry = c.business_type || 'Supplier';
        // The company's own photograph, or none. Never a stock image, never the same photograph twice.
        const own = [c.cover_url, c.banner_url].find((url) => isReliableCoverUrl(url) && !usedImages.has(url as string)) || '';
        if (own) usedImages.add(own);

        formatted.push({
          id: c.id,
          name: c.company_name,
          slug: c.slug,
          country,
          flag: COUNTRY_FLAGS[country] || '🌐',
          img: own,
          logoUrl: c.logo_url || undefined,
          logoType: 'default',
          isVerified: true,
          industry,
          productFocus: c.key_products?.[0] || industry,
          sampleProduct: c.key_products?.[0] || c.tagline || undefined,
        });
      });

      setSuppliers(shuffleWithSeed(formatted, seed ^ 0x85ebca6b));
      setRotationOffset(0);
    } catch (err) {
      console.error('Failed to load verified suppliers', err);
      setError('Unable to load verified suppliers.');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Filter by country, then rotate unique 8-card batches every 30s
  const displayedSuppliers = useMemo(() => {
    let pool = suppliers;
    if (selectedCountry !== 'all') {
      const filtered = suppliers.filter(
        (s) => s.country.toLowerCase() === selectedCountry.toLowerCase()
      );
      pool = filtered;
    }

    return pickUniqueBatch(pool, rotationOffset, DISPLAY_COUNT);
  }, [suppliers, selectedCountry, rotationOffset]);

  // Preload current + next batch so first paint and 30s swap stay smooth
  useEffect(() => {
    const current = pickUniqueBatch(suppliers, rotationOffset, DISPLAY_COUNT);
    const next = pickUniqueBatch(suppliers, rotationOffset + DISPLAY_COUNT, DISPLAY_COUNT);
    preloadImages([...current, ...next].map((s) => s.img));
  }, [suppliers, rotationOffset]);

  const handleViewProducts = (s: DisplaySupplier) => {
    if (s.slug) {
      navigate(`/manufacturers/${s.slug}`);
    } else {
      navigate(`/products?company=${s.id}`);
    }
  };

  const supplierScrollRef = useRef<HTMLDivElement>(null);

  const scrollSuppliers = (direction: 'left' | 'right') => {
    if (supplierScrollRef.current) {
      const scrollAmount = supplierScrollRef.current.clientWidth * 0.75;
      supplierScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
    advanceBatch(direction === 'left' ? -DISPLAY_COUNT : DISPLAY_COUNT);
  };

  return (
    <section className="py-5 sm:py-7 md:py-9 bg-[#030712] text-white relative overflow-hidden border-b border-slate-900">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-5 md:px-6">

        {/* ── SECTION HEADER (Exact to Reference Mockup file_00000000825482068b8a3f7235eeb10d.png) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Verified Suppliers</span>
              {/* Orange circular badge with white checkmark matching reference mockup */}
              <span
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#FF5A00] flex items-center justify-center shrink-0 shadow-sm shadow-[#FF5A00]/40"
                title="Verified Global Suppliers"
              >
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[3.5]" />
              </span>
            </h2>

            {/* Left and Right Scroll Navigation Buttons */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={() => scrollSuppliers('left')}
                aria-label="Scroll verified suppliers left"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#111827] hover:bg-[#FF5A00] text-slate-300 hover:text-white border border-slate-700 hover:border-[#FF5A00] flex items-center justify-center transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollSuppliers('right')}
                aria-label="Scroll verified suppliers right"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#111827] hover:bg-[#FF5A00] text-slate-300 hover:text-white border border-slate-700 hover:border-[#FF5A00] flex items-center justify-center transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Link
            to="/manufacturers"
            className="text-[#FF5A00] hover:text-[#ff7429] font-bold text-xs sm:text-sm md:text-base flex items-center gap-1 transition-colors shrink-0 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* ── Country Filter Pills ───────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3.5 sm:mb-4 scrollbar-none -mx-1 px-1">
          {COUNTRY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedCountry(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 select-none ${
                selectedCountry === tab.key
                  ? 'bg-[#FF5A00] text-white shadow-sm shadow-[#FF5A00]/30 font-bold'
                  : 'bg-[#111827] hover:bg-[#1f2937] text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <span className="text-xs">{tab.flag}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Error Notification with Retry ──────────────────────────── */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-between text-xs sm:text-sm text-rose-200">
            <span>{error}</span>
            <button
              onClick={loadSuppliers}
              className="flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ── SUPPLIER CARDS DISPLAY ─────────────────────────────────── */}
        {loading ? (
          // Skeleton Loading
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 animate-pulse flex flex-col justify-between h-[280px]"
              >
                <div className="aspect-[16/10] bg-slate-800 rounded-xl mb-3" />
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-9 bg-slate-800 rounded-xl w-full mt-3" />
              </div>
            ))}
          </div>
        ) : displayedSuppliers.length === 0 ? (
          <div className="py-12 text-center bg-[#0f172a] rounded-2xl border border-slate-800 p-6">
            <Building2 className="w-10 h-10 text-[#FF5A00] mx-auto mb-2 opacity-80" />
            <p className="text-white font-semibold text-sm">
              {suppliers.length === 0 ? 'Verified suppliers will appear here once their verification is complete.' : 'No verified suppliers found for this region.'}
            </p>
            {suppliers.length > 0 ? (
              <button
                onClick={() => setSelectedCountry('all')}
                className="mt-3 bg-[#FF5A00] hover:bg-[#ff7429] text-white text-xs px-4 py-2 rounded-xl font-bold transition-colors"
              >
                Show All Global Suppliers
              </button>
            ) : (
              <Link
                to="/register?role=supplier"
                className="mt-3 inline-block bg-[#FF5A00] hover:bg-[#ff7429] text-white text-xs px-4 py-2 rounded-xl font-bold transition-colors"
              >
                Join as a manufacturer
              </Link>
            )}
          </div>
        ) : (
          /* ── RESPONSIVE PC GRID (4 Columns) & MOBILE HORIZONTAL CAROUSEL ── */
          <div
            ref={supplierScrollRef}
            className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 overflow-x-auto md:overflow-visible pb-4 pt-1 scrollbar-none snap-x snap-mandatory overscroll-x-contain touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {displayedSuppliers.map((s, idx) => (
              <div
                key={`${s.id}-${s.img}`}
                className={`w-[275px] sm:w-[295px] md:w-auto shrink-0 md:shrink snap-start bg-[#0f172a] hover:bg-[#131d33] border border-slate-800/90 hover:border-[#FF5A00]/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between group shadow-lg min-w-0 ${
                  isRotating ? 'opacity-70 scale-[0.99]' : 'opacity-100 scale-100'
                }`}
              >
                <div className="min-w-0 w-full">
                  {/* Alibaba-style product catalog photo — optimized WebP, unique per card */}
                  <div
                    onClick={() => handleViewProducts(s)}
                    className="aspect-[16/10] w-full overflow-hidden bg-slate-900 relative cursor-pointer"
                  >
                    <FastCatalogImage
                      src={s.img}
                      alt={s.sampleProduct || `${s.name} — ${s.industry || 'Verified Manufacturer'}`}
                      priority={idx < 4}
                      className="group-hover:[&_img]:scale-105 [&_img]:transition-transform [&_img]:duration-500 [&_img]:ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-[#FF5A00]/40 text-[#FF5A00] text-[10px] font-bold shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>Verified Manufacturer</span>
                    </div>
                    {s.sampleProduct ? (
                      <div className="absolute bottom-2 left-2.5 right-2.5 z-10 pointer-events-none">
                        <span className="inline-block max-w-full truncate rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-100 border border-white/10">
                          {s.sampleProduct}
                        </span>
                      </div>
                    ) : s.industry ? (
                      <div className="absolute bottom-2 left-2.5 right-2.5 z-10 pointer-events-none">
                        <span className="inline-block max-w-full truncate rounded-md bg-black/55 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-100 border border-white/10">
                          {s.industry}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Card Body with Company Logo & Details */}
                  <div className="p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div
                        onClick={() => handleViewProducts(s)}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm border border-slate-200/50 cursor-pointer overflow-hidden"
                      >
                        <SupplierBrandLogo supplier={s} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          onClick={() => handleViewProducts(s)}
                          className="font-bold text-white text-sm sm:text-[14px] leading-snug line-clamp-2 group-hover:text-[#FF5A00] transition-colors cursor-pointer"
                          title={s.name}
                        >
                          {s.name}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1.5">
                          <span className="text-sm shrink-0 leading-none">{s.flag}</span>
                          <span className="truncate">{s.country}</span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-[#FF5A00] font-semibold mt-1">
                          <BadgeCheck className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                          <span className="truncate">Verified Supplier</span>
                        </div>

                        {s.sampleProduct && (
                          <p
                            className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 leading-snug"
                            title={s.sampleProduct}
                          >
                            {s.sampleProduct}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-0">
                  <button
                    type="button"
                    onClick={() => handleViewProducts(s)}
                    className="w-full bg-[#162032] hover:bg-[#FF5A00] text-white border border-slate-700/80 hover:border-[#FF5A00] rounded-xl py-2 px-3.5 text-xs sm:text-sm font-semibold flex items-center justify-between transition-all duration-200 shadow-sm active:scale-[0.99] group/btn"
                  >
                    <span className="font-medium">View Products</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-all shrink-0" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
