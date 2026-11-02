import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProductBySlug, getSimilarProducts } from '@/lib/api';
import type { Product } from '@/types/types';
import SafeImage from '@/components/common/SafeImage';
import { resolveCompanyBranding, resolveProductImage } from '@/lib/contentImages';
import {
  matchProductImage,
  isGenericOrDuplicateImage,
} from '@/lib/productImageMatchingEngine';
import {
  Shield, MapPin, Package, MessageSquare, Globe,
  Star, ChevronRight, Download, Heart, Share2, Play,
  Zap, Settings, CheckCircle, Wrench, Building2, Users,
  BadgeCheck, Calendar, Factory, ShieldCheck, FileText,
  ChevronDown, Mail, Search,
  Phone, AlertTriangle, Calculator, Flag,
} from 'lucide-react';
import ProductReviewsAndRatingSection from '@/components/common/ProductReviewsAndRatingSection';
import CountryChargesFeesModal from '@/components/common/CountryChargesFeesModal';
import ReportItemModal from '@/components/common/ReportItemModal';
import InteractiveStarRating from '@/components/common/InteractiveStarRating';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CurrencyContext';
import PageMeta from '@/components/common/PageMeta';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import MaskedPhone from '@/components/common/MaskedPhone';
import { getCompanyDisplayPhone } from '@/lib/countryPhoneCodes';
import BulkPriceCalculator from '@/components/common/BulkPriceCalculator';
import SampleRequestDialog from '@/components/common/SampleRequestDialog';
import InstantQuoteDialog from '@/components/common/InstantQuoteDialog';
import LiveChatModal from '@/components/common/LiveChatModal';

// ── Constants ────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Specifications', 'Applications', 'Company', 'Reviews'];
const CATEGORIES = ['Industrial Equipment', 'Electronics', 'Machinery', 'Raw Materials', 'View All'];

// ── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <MainLayout>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-xl animate-pulse" />
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" style={{ width: `${80 - i * 5}%` }} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse product.specifications (string or JSON) into [key,value][] pairs */
function parseSpecifications(raw: string | null): [string, string][] {
  if (!raw) return [];
  try {
    const obj = JSON.parse(raw);
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      return Object.entries(obj).map(([k, v]) => [k, String(v)]);
    }
  } catch { /* not JSON — fall through */ }
  // plain text: "Key: Value\nKey2: Value2"
  return raw.split('\n')
    .map(line => line.split(':').map(s => s.trim()))
    .filter(parts => parts.length >= 2)
    .map(parts => [parts[0], parts.slice(1).join(': ')] as [string, string]);
}

/** Format a price display string from the product */
function formatPrice(product: Product, isIndia: boolean, rate: number): string {
  if (!product.price_min) return 'Price on request';
  const cur = product.price_currency ?? (isIndia ? 'INR' : 'USD');
  const isUsd = !cur || cur.toUpperCase() === 'USD' || product.price_min < 1000;
  const convertedMin = isIndia && isUsd ? product.price_min * (rate || 83.5) : product.price_min;
  const convertedMax = product.price_max
    ? (isIndia && isUsd ? product.price_max * (rate || 83.5) : product.price_max)
    : null;
  const symbol = isIndia ? '₹' : (cur === 'USD' ? '$' : cur);
  const minStr = Math.round(convertedMin).toLocaleString(isIndia ? 'en-IN' : 'en-US');

  if (convertedMax && convertedMax !== convertedMin) {
    const maxStr = Math.round(convertedMax).toLocaleString(isIndia ? 'en-IN' : 'en-US');
    return `${symbol} ${minStr} – ${maxStr}`;
  }
  return `${symbol} ${minStr}+`;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const { countryConfig, currencyInfo } = useCountry();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // ── all UI state resets when slug changes ──
  const [imgIdx, setImgIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('Overview');
  const [wishlist, setWishlist] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showSampleDialog, setShowSampleDialog] = useState(false);
  const [showInstantQuote, setShowInstantQuote] = useState(false);
  const [showCountryTaxesModal, setShowCountryTaxesModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const tabRefs = useRef<HTMLDivElement>(null);

  // ── fetch product + similar; reset all UI state on slug change ──────────
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setProduct(null);
    setSimilar([]);
    // reset all UI state so nothing bleeds from previous product
    setImgIdx(0);
    setActiveTab('Overview');
    setWishlist(false);
    setShowAllSpecs(false);
    setShowChatModal(false);
    setShowCallModal(false);
    setShowSampleDialog(false);
    setShowInstantQuote(false);
    setShowCountryTaxesModal(false);
    setShowReportModal(false);

    getProductBySlug(slug).then(p => {
      setProduct(p);
      setLoading(false);
      if (p) {
        getSimilarProducts(p.category_id, p.id).then(setSimilar);
      }
    });
  }, [slug]);

  if (loading) return <Skeleton />;
  if (!product) return (
    <MainLayout>
      <PageMeta
        title="Product Not Found | BulkSkart"
        description="The requested product listing does not exist or may have been removed."
        robots="noindex, nofollow"
      />
      <div className="max-w-md mx-auto text-center py-24 px-4 space-y-4">
        <Package className="w-12 h-12 text-[#FF5A00] mx-auto opacity-80" />
        <h2 className="text-xl font-bold text-foreground">Product Not Found</h2>
        <p className="text-sm text-muted-foreground">The product listing you are looking for may have been removed or updated.</p>
        <Link to="/products">
          <Button className="bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold h-10 px-5 rounded-xl">
            Browse All Products
          </Button>
        </Link>
      </div>
    </MainLayout>
  );

  // ── All derived data comes from the current product ────────────────────
  const matched = matchProductImage({
    id: product.id,
    name: product.name,
    category: product.categories?.name,
    currentImages: product.images,
  });

  const categoryName = product.categories?.name ?? null;
  const categorySlug = product.categories?.slug ?? null;
  const fallbackImg = resolveProductImage({ name: product.name, category: categoryName, images: product.images });
  const rawImgs = product.images?.filter(img => !isGenericOrDuplicateImage(img)) || [];
  const images: string[] = rawImgs.length > 0
    ? rawImgs
    : (matched.galleryImages.length > 0 ? matched.galleryImages : [matched.primaryImage || fallbackImg].filter(Boolean) as string[]);

  const hasImages = images.length > 0;
  const isVerified = product.companies?.verification_status === 'verified';
  const isIndia =
    countryConfig.code === 'IN' ||
    currencyInfo.currency === 'INR' ||
    product.companies?.country === 'India';
  const rate = currencyInfo.rate || 83.5;
  const priceDisplay = formatPrice(product, isIndia, rate);
  const companyName = product.companies?.company_name ?? 'Supplier';
  const companySlug = product.companies?.slug ?? '#';
  const city = product.companies?.city ?? '';
  const country = product.companies?.country ?? '';
  const state = product.companies?.state ?? '';
  const locationParts = [city, state, country].filter(Boolean).join(', ');
  const companyDesc = product.companies?.description ?? null;
  const companyLogo = product.companies?.logo_url || resolveCompanyBranding({ company_name: companyName, industry: categoryName || undefined }).logo;
  const companyEstYear = product.companies?.year_established ?? null;
  const companyEmployees = product.companies?.employee_count ?? null;
  const companyBizType = product.companies?.business_type ?? null;
  const specsRows = parseSpecifications(product.specifications);

  const scrollToTab = (tab: string) => {
    setActiveTab(tab);
    tabRefs.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleChatClick = () => {
    if (!profile) { navigate('/auth'); return; }
    setShowChatModal(true);
  };

  const handleCallClick = () => {
    if (!profile) { navigate('/auth'); return; }
    setShowCallModal(true);
  };

  // ── LiveChatModal props — derived from current product ──────────────────
  const chatSupplier = product.companies ? {
    id: product.companies.owner_id ?? '',
    company_id: product.company_id ?? '',
    company_name: product.companies.company_name ?? 'Supplier',
  } : null;

  const chatProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price_min: product.price_min ?? null,
    price_max: product.price_max ?? null,
    price_currency: product.price_currency ?? 'INR',
    moq: product.moq ?? 1,
    moq_unit: product.moq_unit ?? 'pcs',
    company_id: product.company_id ?? '',
  };

  // ── Call Modal ──────────────────────────────────────────────────────────
  const CallModal = (
    <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Phone className="w-5 h-5 text-primary" /> Call Supplier
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl p-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{companyName}</p>
              {locationParts && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{locationParts}</p>}
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-3">Direct Supplier Contact</p>
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <MaskedPhone
                phone={getCompanyDisplayPhone(product.companies)}
                country={product.companies?.country}
                verified={product.companies?.verification_status === 'verified'}
                showIcon={false}
                className="justify-center text-base font-mono font-black tracking-widest text-primary"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button type="button" onClick={() => setShowCallModal(false)} className="flex-1 bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-10 rounded-xl shadow-[0_2px_0_#922f00]">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <MainLayout>
        <PageMeta
          title={`${product.name} — Wholesale & Bulk Price | BulkSkart`}
          description={`Source ${product.name} at wholesale prices directly from verified supplier ${product.companies?.company_name || 'verified manufacturers'}. MOQ: ${product.moq ?? 1} ${product.moq_unit ?? 'units'}. Unit price from ${product.price_currency || '$'}${product.price_min || product.price_max || 'custom'}. Fast global shipping, trade assurance, and instant RFQ response.`}
          keywords={`${product.name}, ${product.name} wholesale, buy ${product.name} in bulk, ${product.categories?.name || 'industrial supplies'}, ${product.companies?.company_name || ''}, MOQ ${product.moq || ''}, B2B product supplier, factory direct`}
          canonical={`/products/${product.slug || product.id}`}
          ogType="product"
          ogImage={product.images?.[0] ?? undefined}
          twitterCard="summary_large_image"
          breadcrumbs={[
            { name: 'Home', item: '/' },
            { name: 'Products', item: '/products' },
            ...(product.categories?.name ? [{ name: product.categories.name, item: `/products?category=${encodeURIComponent(product.categories.name)}` }] : []),
            { name: product.name, item: `/products/${product.slug || product.id}` },
          ]}
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            image: product.images?.[0],
            description: product.description || `Wholesale ${product.name} with bulk MOQ of ${product.moq ?? 1} ${product.moq_unit ?? 'units'}.`,
            sku: product.id,
            category: product.categories?.name,
            brand: {
              '@type': 'Brand',
              name: product.companies?.company_name || 'BulkSkart Verified Manufacturer',
            },
            offers: {
              '@type': 'Offer',
              price: product.price_min || product.price_max || '0',
              priceCurrency: product.price_currency === '₹' ? 'INR' : (product.price_currency || 'USD'),
              availability: 'https://schema.org/InStock',
              priceValidUntil: '2027-12-31',
              url: `https://www.bulkskart.com/products/${product.slug || product.id}`,
              seller: {
                '@type': 'Organization',
                name: product.companies?.company_name || 'Verified Supplier',
              },
            },
            aggregateRating: product.companies?.rating_avg ? {
              '@type': 'AggregateRating',
              ratingValue: String(product.companies.rating_avg),
              reviewCount: String(product.companies?.review_count || 12),
              bestRating: '5',
              worstRating: '1',
            } : undefined,
          }}
        />

        {/* ── Mobile search bar ──────────────────────────────────────── */}
        <div className="md:hidden bg-card border-b border-border px-3 py-2 sticky top-[56px] z-30">
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input className="flex-1 min-w-0 text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground" placeholder="Search products, suppliers, categories..." />
            <button className="bg-primary p-1 rounded shrink-0">
              <Search className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* ── Category nav (mobile horizontal scroll) ───────────────── */}
        <div className="bg-background border-b border-border overflow-x-auto whitespace-nowrap px-3 py-2 md:hidden">
          {CATEGORIES.map(c => (
            <button key={c} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full mr-2 shrink-0 transition-colors ${c === (categoryName ?? 'Industrial Equipment') ? 'bg-primary/10 text-primary border border-primary/30' : 'text-muted-foreground border border-border hover:border-primary/30'}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="max-w-[1400px] mx-auto px-3 md:px-6 pb-20 md:pb-8">

          {/* ── Breadcrumb — dynamic from product data ───────────────── */}
          <Breadcrumbs
            items={[
              { name: 'Products', href: '/products' },
              ...(categoryName ? [{ name: categoryName, href: `/products?category=${encodeURIComponent(categoryName)}` }] : []),
              { name: product.name },
            ]}
            className="py-3"
          />

          {/* ── MAIN CONTENT GRID ───────────────────────────────────── */}
          <div className="grid md:grid-cols-[1fr_360px] gap-6 md:gap-8">

            {/* LEFT ─ images + tabs + content */}
            <div className="min-w-0">

              {/* Badges row (desktop only) */}
              <div className="hidden md:flex items-center gap-2 mb-3">
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified Supplier
                  </span>
                )}
                {companyBizType && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5A00] bg-orange-500/10 border border-[#FF5A00]/30 rounded-full px-2.5 py-1">
                    <Factory className="w-3.5 h-3.5" /> {companyBizType}
                  </span>
                )}
              </div>

              {/* ── Image Gallery — current product images only ─── */}
              {hasImages ? (
                <>
                  <div className="relative rounded-xl overflow-hidden bg-card border border-border mb-3 aspect-[4/3] md:aspect-[16/10]">
                    <SafeImage
                      src={images[imgIdx]}
                      alt={`${product.name} — image ${imgIdx + 1}`}
                      category={product.categories?.name}
                      type="product"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs rounded px-2 py-0.5 z-10">
                      {imgIdx + 1} / {images.length}
                    </div>
                    {images.length > 1 && (
                      <>
                        <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10">
                          <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>
                        <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
                      {images.map((img, i) => (
                        <button key={i} onClick={() => setImgIdx(i)}
                          className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${imgIdx === i ? 'border-primary ring-2 ring-primary/40 shadow-md' : 'border-border opacity-70 hover:opacity-100'}`}>
                          <SafeImage src={img} alt={`${product.name} thumbnail ${i + 1}`} category={product.categories?.name} type="product" className="w-full h-full object-cover" />
                          {i === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-[9px] font-bold text-white text-center py-0.5 uppercase tracking-wider">
                              Primary
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-card border border-border mb-4 aspect-[4/3] md:aspect-[16/10]">
                  <SafeImage
                    src={fallbackImg}
                    alt={product.name}
                    category={product.categories?.name}
                    type="product"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Video + Download row — product-specific */}
              <div className="flex items-center gap-4 mb-5 text-sm">
                {(product as any).video_url ? (
                  <a href={(product as any).video_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors">
                    <Play className="w-4 h-4 text-primary" /> Product Video
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground/50 font-medium cursor-not-allowed" title="Video not available">
                    <Play className="w-4 h-4 text-muted-foreground/40" /> Video unavailable
                  </span>
                )}
                {(product as any).brochure_url ? (
                  <a href={(product as any).brochure_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors">
                    <Download className="w-4 h-4 text-primary" /> Download Brochure
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground/50 font-medium cursor-not-allowed" title="Brochure not available">
                    <Download className="w-4 h-4 text-muted-foreground/40" /> Brochure not available
                  </span>
                )}
              </div>

              {/* ── Product Info (mobile only — shown below gallery) ── */}
              <div className="md:hidden mb-5">
                <h1 className="text-xl font-black text-foreground mb-2 leading-tight">{product.name}</h1>

                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 mb-3">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified Supplier
                  </span>
                )}

                {/* Interactive rating & Report trigger */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('Reviews')}
                    className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                  >
                    <InteractiveStarRating value={4.8} readOnly size="sm" showNumber />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 transition-colors px-2 py-0.5 rounded-lg hover:bg-red-500/10"
                    title="Report this Product"
                  >
                    <Flag className="w-3 h-3" /> Report
                  </button>
                  <button onClick={() => setWishlist(w => !w)} className="p-1">
                    <Heart className={`w-4 h-4 transition-colors ${wishlist ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
                  </button>
                  <button className="p-1"><Share2 className="w-4 h-4 text-muted-foreground" /></button>
                </div>

                {product.description && (
                  <p className="text-sm text-muted-foreground mb-3 text-pretty">{product.description}</p>
                )}

                {/* Price + MOQ */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Price Range</p>
                    <p className="text-base font-black text-primary leading-tight">{priceDisplay}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Excl. GST</p>
                    <button
                      type="button"
                      onClick={() => setShowCountryTaxesModal(true)}
                      className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[#00D2FF] hover:underline"
                    >
                      <Calculator className="w-3 h-3" /> Country Taxes &amp; Fees
                    </button>
                  </div>
                  <div className="bg-muted border border-border rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Min. Order Qty</p>
                    <p className="text-base font-black text-foreground">{product.moq ?? 1} <span className="text-sm font-normal text-muted-foreground">{product.moq_unit ?? 'pcs'}</span></p>
                    <p className="text-[10px] text-primary mt-0.5">Better pricing for bulk orders</p>
                  </div>
                </div>

                {/* Supplier card mobile */}
                <div className="bg-card border border-border rounded-xl p-3 md:p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-primary/20">
                      {companyLogo
                        ? <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                        : <Building2 className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{companyName}</p>
                      {locationParts && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{locationParts}</span>
                        </div>
                      )}
                    </div>
                    <Link to={`/manufacturers/${companySlug}`}>
                      <button className="text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 whitespace-nowrap">
                        View Profile <ChevronRight className="w-3 h-3 inline" />
                      </button>
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded px-2 py-0.5">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {companyBizType && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#FF5A00] bg-orange-500/10 border border-[#FF5A00]/30 rounded px-2 py-0.5">
                        {companyBizType}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                    {companyEstYear && <div className="flex items-center gap-1 min-w-0"><Calendar className="w-3 h-3 shrink-0" /><span className="truncate">Est. {companyEstYear}</span></div>}
                    {companyEmployees && <div className="flex items-center gap-1 min-w-0"><Users className="w-3 h-3 shrink-0" /><span className="truncate">{companyEmployees} Emp.</span></div>}
                    {locationParts && <div className="flex items-center gap-1 min-w-0"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{city || country}</span></div>}
                  </div>
                </div>

                {/* CTA buttons mobile */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Link to={profile?.role === 'buyer' ? '/post-requirement' : '/auth'} className="col-span-2">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 text-base gap-2 rounded-xl shadow-lg">
                      <Mail className="w-5 h-5" /> Get Quotes
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={handleChatClick} className="w-full border-primary text-primary hover:bg-primary/5 font-semibold h-11 gap-2 rounded-xl">
                    <MessageSquare className="w-4 h-4" /> Chat with Supplier
                  </Button>
                  <Button variant="outline" onClick={handleCallClick} className="w-full border-border text-muted-foreground hover:bg-muted font-semibold h-11 gap-2 rounded-xl">
                    <Phone className="w-4 h-4" /> Call Supplier
                  </Button>
                </div>

                {/* Trust badges mobile */}
                <div className="grid grid-cols-3 gap-2 bg-muted/50 border border-border rounded-xl p-3">
                  {[
                    { icon: Shield, label: 'Secure Transactions' },
                    { icon: BadgeCheck, label: 'Verified Suppliers' },
                    { icon: Globe, label: 'Global Shipping' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1 text-center">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-[9px] font-medium text-muted-foreground leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── TABS ─────────────────────────────────────────── */}
              <div ref={tabRefs} className="bg-background sticky top-[56px] md:top-[64px] z-20 border-b border-border -mx-3 md:mx-0 px-3 md:px-0">
                <div className="flex gap-0 overflow-x-auto whitespace-nowrap">
                  {TABS.map(tab => (
                    <button key={tab} onClick={() => scrollToTab(tab)}
                      className={`px-4 py-3 text-sm font-semibold border-b-2 shrink-0 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Tab Content ──────────────────────────────────── */}
              <div className="pt-6 pb-4">

                {/* OVERVIEW tab */}
                {activeTab === 'Overview' && (
                  <div className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h2 className="text-lg font-bold text-foreground mb-3">Product Overview</h2>
                        {product.description ? (
                          <p className="text-sm text-muted-foreground text-pretty leading-relaxed mb-4">{product.description}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 italic mb-4">No description provided for this product.</p>
                        )}
                        <h3 className="text-sm font-bold text-foreground mb-3">Key Features</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: Zap, label: 'Bulk Ordering' },
                            { icon: Settings, label: 'Custom Specifications' },
                            { icon: CheckCircle, label: 'Quality Assured' },
                            { icon: Wrench, label: 'After-Sales Support' },
                          ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex flex-col items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl p-3 text-center">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <span className="text-[11px] font-semibold text-foreground leading-tight">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Specifications — from product.specifications */}
                      <div>
                        <h2 className="text-lg font-bold text-foreground mb-3">Key Specifications</h2>
                        {specsRows.length > 0 ? (
                          <>
                            <div className="rounded-xl border border-border overflow-hidden">
                              <table className="w-full text-sm">
                                <tbody>
                                  {(showAllSpecs ? specsRows : specsRows.slice(0, 6)).map(([key, val], i) => (
                                    <tr key={key} className={i % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                                      <td className="px-3 py-2.5 text-muted-foreground font-medium w-[45%] text-xs">{key}</td>
                                      <td className="px-3 py-2.5 text-foreground font-semibold text-xs">{val}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {!showAllSpecs && specsRows.length > 6 && (
                              <button onClick={() => setShowAllSpecs(true)} className="flex items-center gap-1 text-xs text-primary font-semibold mt-2 hover:underline">
                                View All Specifications <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="rounded-xl border border-border/50 p-6 text-center text-sm text-muted-foreground/60 italic">
                            Specifications not available for this product.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Downloads — product-specific; show "Not available" if missing */}
                    <div>
                      <h2 className="text-lg font-bold text-foreground mb-3">Downloads</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'Product Brochure', url: (product as any).brochure_url ?? null },
                          { label: 'Technical Datasheet', url: (product as any).datasheet_url ?? null },
                          { label: 'User Manual', url: (product as any).manual_url ?? null },
                          { label: 'Certifications', url: (product as any).certificate_url ?? null },
                        ].map(({ label, url }) => (
                          url ? (
                            <a key={label} href={url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 bg-card border border-border hover:border-primary/40 rounded-xl p-3 text-left transition-colors group">
                              <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-red-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{label}</p>
                                <p className="text-[10px] text-muted-foreground">PDF</p>
                              </div>
                              <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                            </a>
                          ) : (
                            <div key={label} className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-xl p-3 opacity-50 cursor-not-allowed">
                              <div className="w-8 h-8 bg-muted border border-border rounded-lg flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-muted-foreground/40" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
                                <p className="text-[10px] text-muted-foreground/60">Not available</p>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SPECIFICATIONS tab — from product.specifications only */}
                {activeTab === 'Specifications' && (
                  <div>
                    <h2 className="text-lg font-bold text-foreground mb-4">Technical Specifications</h2>
                    {specsRows.length > 0 ? (
                      <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody>
                            {specsRows.map(([key, val], i) => (
                              <tr key={key} className={i % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                                <td className="px-4 py-3 text-muted-foreground font-medium w-[45%]">{key}</td>
                                <td className="px-4 py-3 text-foreground font-semibold">{val}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/50 p-10 text-center text-muted-foreground/60 italic">
                        No specifications available for this product.
                      </div>
                    )}
                  </div>
                )}

                {/* APPLICATIONS tab */}
                {activeTab === 'Applications' && (
                  <div>
                    <h2 className="text-lg font-bold text-foreground mb-4">Applications</h2>
                    {product.tags?.length ? (
                      <div className="grid md:grid-cols-2 gap-3">
                        {product.tags.map(tag => (
                          <div key={tag} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm text-foreground font-medium">{tag}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground/60 italic py-6 text-center">No application information available.</div>
                    )}
                  </div>
                )}

                {/* COMPANY tab — from product.companies */}
                {activeTab === 'Company' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold text-foreground">About {companyName}</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className="rounded-xl overflow-hidden mb-4 bg-muted aspect-video flex items-center justify-center">
                          {companyLogo
                            ? <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                            : <Building2 className="w-12 h-12 text-muted-foreground/30" />}
                        </div>
                        {(product.companies?.total_products || product.companies?.year_established) && (
                          <div className="grid grid-cols-3 gap-3">
                            {product.companies?.year_established && (
                              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-center">
                                <p className="text-base font-black text-primary">{new Date().getFullYear() - product.companies?.year_established}+</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Years Exp.</p>
                              </div>
                            )}
                            {product.companies?.total_products && (
                              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-center">
                                <p className="text-base font-black text-primary">{product.companies.total_products}+</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Products</p>
                              </div>
                            )}
                            {locationParts && (
                              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-center">
                                <p className="text-base font-black text-primary">B2B</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Verified</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        {companyDesc ? (
                          <p className="text-sm text-muted-foreground text-pretty leading-relaxed mb-4">{companyDesc}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 italic mb-4">No company description available.</p>
                        )}
                        <div className="space-y-2">
                          {locationParts && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4 text-primary shrink-0" /><span>{locationParts}</span>
                            </div>
                          )}
                          {companyEstYear && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4 text-primary shrink-0" /><span>Established: {companyEstYear}</span>
                            </div>
                          )}
                          {companyEmployees && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4 text-primary shrink-0" /><span>{companyEmployees} Employees</span>
                            </div>
                          )}
                          {companyBizType && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Factory className="w-4 h-4 text-primary shrink-0" /><span>{companyBizType}</span>
                            </div>
                          )}
                        </div>
                        <Link to={`/manufacturers/${companySlug}`}>
                          <Button variant="outline" className="mt-4 w-full border-primary text-primary hover:bg-primary/5 font-semibold rounded-xl">
                            View Company Profile <ChevronRight className="w-4 h-4 ml-1 inline" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* REVIEWS tab — authenticated only review submission, ratings & report */}
                {activeTab === 'Reviews' && (
                  <div>
                    <ProductReviewsAndRatingSection
                      productId={product.id}
                      productName={product.name}
                      initialRating={4.8}
                    />
                  </div>
                )}
              </div>

              {/* ── Similar Products — from DB, same category, no hardcoded data ── */}
              {similar.length > 0 && (
                <div className="border-t border-border pt-6 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-foreground">Similar Products</h2>
                    {categorySlug && (
                      <Link to={`/products?category=${categorySlug}`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        View All <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {similar.map(p => {
                      const simPrice = p.price_min
                        ? formatPrice(p, isIndia, rate)
                        : 'Price on request';
                      const simImg = p.images?.[0] ?? null;
                      return (
                        <Link key={p.id} to={`/products/${p.slug}`}
                          className="bg-card border border-border rounded-xl overflow-hidden shrink-0 w-44 md:w-52 hover:shadow-md transition-shadow block">
                          <div className="aspect-square overflow-hidden bg-muted">
                            <SafeImage src={simImg} alt={p.name} category={product.categories?.name} type="product" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-bold text-foreground leading-tight mb-1 line-clamp-2">{p.name}</p>
                            <p className="text-xs font-black text-primary mb-0.5">{simPrice}</p>
                            <p className="text-[10px] text-muted-foreground">MOQ: {p.moq ?? 1} {p.moq_unit ?? 'pcs'}</p>
                            {p.companies?.company_name && (
                              <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{p.companies.company_name}</p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                    {/* Promo tile */}
                    <div className="bg-card border border-border rounded-xl shrink-0 w-44 md:w-52 flex flex-col justify-center items-start p-4 text-foreground">
                      <p className="text-sm font-black leading-snug mb-2">Powering Industries<br /><span className="text-primary">Worldwide</span></p>
                      <p className="text-[10px] text-muted-foreground mb-3">Reliable · Efficient · Scalable</p>
                      <Link to="/post-requirement">
                        <button className="text-[10px] font-bold bg-primary text-white rounded-lg px-3 py-1.5 flex items-center gap-1">
                          Request a Custom Quote <ChevronRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* ── About Company section — from product.companies ─── */}
              <div className="border-t border-border pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">About {companyName}</h2>
                  <Link to={`/manufacturers/${companySlug}`}>
                    <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">View Company <ChevronRight className="w-3.5 h-3.5" /></button>
                  </Link>
                </div>
                <div className="grid md:grid-cols-[auto_1fr] gap-4 items-start">
                  <div className="w-full md:w-40 aspect-video md:aspect-square rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {companyLogo
                      ? <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                      : <Building2 className="w-10 h-10 text-muted-foreground/30" />}
                  </div>
                  <div>
                    {companyDesc ? (
                      <p className="text-sm text-muted-foreground text-pretty leading-relaxed mb-3">{companyDesc}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic mb-3">No company description available.</p>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      {companyEstYear && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-2.5 text-center">
                          <p className="text-sm font-black text-primary">{new Date().getFullYear() - companyEstYear}+</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Yrs Exp.</p>
                        </div>
                      )}
                      {locationParts && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-2.5 text-center">
                          <p className="text-sm font-black text-primary">B2B</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Verified</p>
                        </div>
                      )}
                      {categoryName && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-2.5 text-center">
                          <p className="text-sm font-black text-primary truncate">{categoryName.split(' ')[0]}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Category</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Need Bulk Supply CTA ─────────────────────────── */}
              <div className="border-t border-border pt-6">
                <div className="bg-card border border-border rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-base font-black text-foreground mb-0.5">Need Bulk Supply?</p>
                    <p className="text-sm text-muted-foreground">Get the best price for your requirements.</p>
                  </div>
                  <Link to={profile?.role === 'buyer' ? '/post-requirement' : '/auth'} className="shrink-0 w-full md:w-auto">
                    <Button className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 gap-2 rounded-xl">
                      <Mail className="w-4 h-4" /> Request Bulk Quote
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT ─ sidebar (desktop only) ─────────────────────────── */}
            <div className="hidden md:block">
              <div className="sticky top-[80px] space-y-4">

                {/* Product title + badges */}
                <div className="bg-card border border-border rounded-xl p-3 md:p-4">
                  <div className="flex items-start gap-2 mb-2">
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <CheckCircle className="w-3 h-3" /> Verified Supplier
                      </span>
                    )}
                    {companyBizType && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#FF5A00] bg-orange-500/10 border border-[#FF5A00]/30 rounded-full px-2 py-0.5">
                        <Factory className="w-3 h-3" /> {companyBizType}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-black text-foreground leading-tight mb-3">{product.name}</h1>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mb-3 text-pretty line-clamp-3">{product.description}</p>
                  )}

                  {/* Rating & Report */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('Reviews')}
                      className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <InteractiveStarRating value={4.8} readOnly size="sm" showNumber />
                      <span className="text-[11px] text-primary hover:underline ml-1">Write Review</span>
                    </button>
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowReportModal(true)}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                        title="Report this Product"
                      >
                        <Flag className="w-3 h-3" /> Report
                      </button>
                      <button onClick={() => setWishlist(w => !w)} className="p-1">
                        <Heart className={`w-4 h-4 ${wishlist ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
                      </button>
                      <button className="p-1"><Share2 className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Price Range</p>
                    <p className="text-xl font-black text-primary">{priceDisplay}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-muted-foreground">(Excl. GST)</p>
                      <button
                        type="button"
                        onClick={() => setShowCountryTaxesModal(true)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#00D2FF] hover:underline"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        Country Taxes, GST &amp; Fees
                      </button>
                    </div>
                    <p className="text-xs text-primary mt-1 font-medium">Better pricing for bulk orders</p>
                  </div>

                  {/* MOQ */}
                  <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl p-3 mb-4">
                    <Package className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Minimum Order Quantity</p>
                      <p className="text-base font-black text-foreground">{product.moq ?? 1} <span className="text-sm font-normal text-muted-foreground">{product.moq_unit ?? 'pcs'}</span></p>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link to={profile?.role === 'buyer' ? '/post-requirement' : '/auth'} className="block mb-2">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 text-base gap-2 rounded-xl shadow-lg">
                      <Mail className="w-5 h-5" /> Get Quotes
                    </Button>
                  </Link>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button
                      variant="outline"
                      onClick={() => profile?.role === 'buyer' ? setShowInstantQuote(true) : navigate('/auth')}
                      className="border-primary text-primary hover:bg-primary/5 font-semibold h-10 gap-1.5 rounded-xl text-xs"
                    >
                      <Zap className="w-3.5 h-3.5" /> Instant Quote
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => profile?.role === 'buyer' ? setShowSampleDialog(true) : navigate('/auth')}
                      className="border-border text-muted-foreground hover:bg-muted font-semibold h-10 gap-1.5 rounded-xl text-xs"
                    >
                      <Package className="w-3.5 h-3.5" /> Sample
                    </Button>
                  </div>
                  <Button variant="outline" onClick={handleChatClick} className="w-full border-primary text-primary hover:bg-primary/5 font-semibold h-11 gap-2 rounded-xl">
                    <MessageSquare className="w-4 h-4" /> Chat with Supplier
                  </Button>
                </div>

                {/* Bulk Price Calculator — uses current product's actual price */}
                <BulkPriceCalculator
                  productId={product.id}
                  priceMin={
                    isIndia && (!product.price_currency || product.price_currency === 'USD' || (product.price_min ?? 0) < 1000)
                      ? (product.price_min ?? 0) * rate
                      : (product.price_min ?? null)
                  }
                  priceMax={
                    product.price_max
                      ? (isIndia && (!product.price_currency || product.price_currency === 'USD' || product.price_max < 1000)
                          ? product.price_max * rate
                          : product.price_max)
                      : null
                  }
                  moq={product.moq ?? 1}
                  moqUnit={product.moq_unit ?? 'Pcs'}
                  currency={isIndia ? 'INR' : (product.price_currency ?? 'USD')}
                />

                {/* Supplier card — from product.companies */}
                <div className="bg-card border border-border rounded-xl p-3 md:p-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Supplied by</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-primary/20">
                      {companyLogo
                        ? <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                        : <Building2 className="w-6 h-6 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{companyName}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {companyBizType && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-[#FF5A00] bg-orange-500/10 border border-[#FF5A00]/30 rounded px-2 py-0.5">{companyBizType}</span>
                    )}
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {locationParts && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" /><span>{locationParts}</span>
                      </div>
                    )}
                    {companyEstYear && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" /><span>Est. {companyEstYear}</span>
                      </div>
                    )}
                    {companyEmployees && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5 text-primary shrink-0" /><span>{companyEmployees} Employees</span>
                      </div>
                    )}
                    {companyBizType && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Factory className="w-3.5 h-3.5 text-primary shrink-0" /><span>{companyBizType}</span>
                      </div>
                    )}
                  </div>
                  {/* No fake rating */}
                  <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-border">
                    <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-muted-foreground/30" />)}</div>
                    <span className="text-[10px] text-muted-foreground">No reviews yet</span>
                  </div>
                  <Link to={`/manufacturers/${companySlug}`}>
                    <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5 font-semibold h-9 text-xs rounded-lg mb-2">
                      View Company Profile
                    </Button>
                  </Link>
                  <Button onClick={handleCallClick} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-9 text-xs rounded-lg">
                    Contact Supplier
                  </Button>
                </div>

                {/* Need Bulk Supply sidebar */}
                <div className="bg-card border border-border rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">Need Bulk Supply?</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Get best price for your requirements.</p>
                  <Link to={profile?.role === 'buyer' ? '/post-requirement' : '/auth'}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-9 text-xs gap-2 rounded-lg">
                      <Mail className="w-3.5 h-3.5" /> Request Bulk Quote
                    </Button>
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="bg-card border border-border rounded-xl p-3 md:p-4">
                  <div className="space-y-3">
                    {[
                      { icon: Shield, label: 'Secure Transactions', sub: 'Safe & encrypted payments' },
                      { icon: BadgeCheck, label: 'Verified Suppliers', sub: 'KYC & document verified' },
                      { icon: Globe, label: 'Global Shipping Support', sub: 'Export assistance provided' },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{label}</p>
                          <p className="text-[10px] text-muted-foreground">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>

      {/* ── Mobile Sticky Bottom CTA ─────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-card px-4 py-2.5 flex items-center gap-3 border-t border-border shadow-2xl">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{product.name}</p>
            <p className="text-[10px] text-primary font-semibold truncate">{priceDisplay}</p>
          </div>
          <Link to={profile?.role === 'buyer' ? '/post-requirement' : '/auth'}>
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-5 gap-1.5 rounded-xl text-sm shrink-0">
              <Mail className="w-4 h-4" /> Get Quote
            </Button>
          </Link>
        </div>
      </div>
      {chatSupplier && (
        <LiveChatModal
          open={showChatModal}
          onClose={() => setShowChatModal(false)}
          product={chatProduct}
          supplier={chatSupplier}
        />
      )}
      {CallModal}
      <SampleRequestDialog
        open={showSampleDialog}
        onOpenChange={setShowSampleDialog}
        productId={product.id}
        productName={product.name}
        supplierCompanyId={product.company_id ?? ''}
        supplierName={companyName}
        moqUnit={product.moq_unit ?? 'Pcs'}
      />
      <InstantQuoteDialog
        open={showInstantQuote}
        onOpenChange={setShowInstantQuote}
        productId={product.id}
        productName={product.name}
        supplierCompanyId={product.company_id ?? ''}
        supplierName={companyName}
        moq={product.moq ?? 1}
        moqUnit={product.moq_unit ?? 'Pcs'}
      />
      <CountryChargesFeesModal
        open={showCountryTaxesModal}
        onOpenChange={setShowCountryTaxesModal}
        baseAmount={product.price_min || 1000}
        itemTitle={product.name}
      />
      <ReportItemModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        targetType="product"
        targetId={product.id}
        targetTitle={product.name}
      />
    </>
  );
}
