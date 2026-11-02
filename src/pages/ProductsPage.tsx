import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PageMeta from '@/components/common/PageMeta';
import MainLayout from '@/components/layouts/MainLayout';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { Search, Shield, Package, Boxes, TrendingUp, Globe } from 'lucide-react';
import { getProducts, getCategories } from '@/lib/api';
import type { Product, Category } from '@/types/types';
import SafeImage from '@/components/common/SafeImage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountry } from '@/contexts/CurrencyContext';
import { matchProductImage } from '@/lib/productImageMatchingEngine';

const COUNTRIES = [
  'India', 'USA', 'Germany', 'Japan', 'South Korea', 'UK',
  'Vietnam', 'UAE', 'Turkey', 'Italy'
];

const COUNTRY_FLAGS: Record<string, string> = {
  'India': '🇮🇳',
  'USA': '🇺🇸',
  'Germany': '🇩🇪',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'UK': '🇬🇧',
  'Vietnam': '🇻🇳',
  'UAE': '🇦🇪',
  'Turkey': '🇹🇷',
  'Italy': '🇮🇹',
};

const FALLBACK_IMGS: Record<string, string> = {
  'electronics':    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=75',
  'textiles':       'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=75',
  'food':           'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=75',
  'machinery':      'https://cdn.pixabay.com/photo/2016/09/12/07/48/mechanical-1663275_1280.jpg',
  'furniture':      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=75',
  'beauty':         'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=75',
  'agriculture':    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=75',
  'chemicals':      'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=75',
  'solar':          'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=75',
  'default':        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=75',
};

const CATEGORY_FALLBACK_KEYS: string[] = [
  'electronics', 'textiles', 'food', 'machinery', 'furniture',
  'beauty', 'agriculture', 'chemicals', 'solar', 'default',
];

function getProductFallback(product: Product, index: number): string {
  // Use verified Alibaba-benchmarked product image matching engine
  const matched = matchProductImage({
    id: product.id,
    name: product.name,
    category: product.categories?.name,
    currentImages: product.images,
  });
  return matched.primaryImage || matched.categoryPlaceholder;
}

function formatProductPrice(val: number, isIndia: boolean, cur: string, rate: number): string {
  // If India is active or selected, convert USD base prices to INR
  const isUsd = !cur || cur.toUpperCase() === 'USD' || val < 1000;
  const converted = isIndia && isUsd ? val * (rate || 83.5) : val;
  const symbol = isIndia ? '₹' : (cur === 'USD' ? '$' : cur);

  if (converted >= 10000000) {
    return `${symbol}${(converted / 10000000).toFixed(1)}Cr`;
  }
  if (converted >= 100000) {
    return `${symbol}${(converted / 100000).toFixed(1)}L`;
  }
  if (converted >= 1000) {
    return `${symbol}${(converted / 1000).toFixed(converted % 1000 === 0 ? 0 : 1)}K`;
  }
  return `${symbol}${Math.round(converted).toLocaleString(isIndia ? 'en-IN' : 'en-US')}`;
}

function PriceRange({
  min,
  max,
  currency,
  isIndia,
  rate,
}: {
  min: number | null;
  max: number | null;
  currency: string;
  isIndia: boolean;
  rate: number;
}) {
  if (!min) return null;
  return (
    <div className="flex items-center gap-1.5">
      <TrendingUp className="w-3 h-3 text-[#FF5A00] shrink-0" />
      <span className="text-sm font-bold text-foreground">
        {formatProductPrice(min, isIndia, currency, rate)}
        {max && max !== min ? (
          <span className="font-medium text-muted-foreground">
            {' '}– {formatProductPrice(max, isIndia, currency, rate)}
          </span>
        ) : null}
      </span>
      {isIndia && (
        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded ml-1">
          INR
        </span>
      )}
    </div>
  );
}

function MoqBadge({ moq, unit }: { moq: number; unit: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Boxes className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">
        MOQ <span className="font-semibold text-foreground">{moq.toLocaleString()} {unit}</span>
      </span>
    </div>
  );
}

function ProductCard({
  product,
  index,
  activeCountry,
  isDuplicate = false,
}: {
  product: Product;
  index: number;
  activeCountry: string;
  isDuplicate?: boolean;
}) {
  const { countryConfig, currencyInfo } = useCountry();
  const isVerified = product.companies?.verification_status === 'verified';
  const isIndia =
    activeCountry === 'India' ||
    product.companies?.country === 'India' ||
    countryConfig.code === 'IN' ||
    currencyInfo.currency === 'INR';
  const rate = currencyInfo.rate || 83.5;
  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-card hover:bg-muted/40 border border-border hover:border-[#FF5A00]/60 rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-[0_12px_28px_rgba(255,90,0,0.12)] hover:-translate-y-0.5 relative"
    >
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-muted relative shrink-0">
        <SafeImage
          src={product.images?.[0] || (product as any).representative_storage_url}
          alt={product.name}
          productId={product.id}
          category={product.categories?.name}
          hasSellerImages={(product as any).has_seller_images}
          isRepresentativeImage={(product as any).is_representative_image}
          isDuplicateOnPage={isDuplicate}
          priority={index < 4}
          sizes="(max-width: 640px) 92vw, (max-width: 768px) 46vw, (max-width: 1024px) 31vw, 280px"
          type="product"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 transform-gpu"
        />
        {product.categories && (
          <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full z-10">
            {product.categories.name}
          </span>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
          {product.is_featured && (
            <span className="bg-primary/90 text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
          {(product as typeof product & { is_sponsored?: boolean }).is_sponsored && (
            <span className="bg-amber-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Sponsored
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Product name + verified */}
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 flex-1 min-w-0">
            {product.name}
          </h3>
          {isVerified && (
            <span className="verified-badge shrink-0 mt-0.5"><Shield className="w-2.5 h-2.5" />V</span>
          )}
        </div>

        {/* Company */}
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground/80 truncate">{product.companies?.company_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {product.companies?.country && COUNTRY_FLAGS[product.companies.country] && (
              <span className="text-xs">{COUNTRY_FLAGS[product.companies.country]}</span>
            )}
            <p className="text-xs text-muted-foreground truncate">
              {product.companies?.city ? `${product.companies.city}, ` : ''}{product.companies?.country ?? 'Global'}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60 mt-auto" />

        {/* Price + MOQ — the hero section */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <PriceRange
            min={product.price_min}
            max={product.price_max}
            currency={product.price_currency || 'USD'}
            isIndia={isIndia}
            rate={rate}
          />
          <MoqBadge moq={product.moq} unit={product.moq_unit} />
        </div>
      </div>
    </Link>
  );
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const { countryConfig, setCountry } = useCountry();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const initialCat = routeSlug || searchParams.get('category') || 'all';
  const [selectedCat, setSelectedCat] = useState(initialCat);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [selectedCountry, setSelectedCountry] = useState(() => {
    const fromUrl = searchParams.get('country');
    if (fromUrl) return fromUrl;
    return 'all';
  });

  const handleCountryChange = (c: string) => {
    setSelectedCountry(c);
    const newParams = new URLSearchParams(searchParams);
    if (c === 'all') {
      newParams.delete('country');
    } else {
      newParams.set('country', c);
    }
    setSearchParams(newParams);
    if (c === 'India') {
      setCountry('IN');
    } else if (c === 'USA') {
      setCountry('US');
    }
  };

  const handleCategoryChange = (c: string) => {
    setSelectedCat(c);
    const newParams = new URLSearchParams(searchParams);
    if (c === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', c);
    }
    setSearchParams(newParams);
  };

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Sync state if URL searchParams or routeSlug changes
  useEffect(() => {
    const catFromUrl = routeSlug || searchParams.get('category') || 'all';
    setSelectedCat(catFromUrl);
    setSearch(searchParams.get('q') ?? '');
    const countryFromUrl = searchParams.get('country') || 'all';
    setSelectedCountry(countryFromUrl);
  }, [routeSlug, searchParams]);

  useEffect(() => {
    setLoading(true);
    const catId = selectedCat === 'all'
      ? undefined
      : (categories.find(c => c.slug === selectedCat || c.id === selectedCat)?.id || selectedCat);

    getProducts({
      search: search || undefined,
      categoryId: catId,
      categorySlug: selectedCat !== 'all' ? selectedCat : undefined,
      country: selectedCountry !== 'all' ? selectedCountry : undefined,
      limit: 150
    }).then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, [search, selectedCat, selectedCountry, categories]);

  const filteredProducts = useMemo(() => {
    if (selectedCountry === 'all') return products;
    return products.filter(p => p.companies?.country?.toLowerCase() === selectedCountry.toLowerCase());
  }, [products, selectedCountry]);

  return (
    <MainLayout>
      <PageMeta
        title="Bulk Wholesale Products Catalog — Factory Direct Pricing & MOQs | BulkSkart"
        description="Browse wholesale products across industrial machinery, electronics, apparel, raw materials, chemicals, and packaging from verified global manufacturers. Compare tiered volume pricing and send instant RFQs."
        keywords="bulk products catalog, wholesale prices India, minimum order quantity, B2B product sourcing, verified supplier products, factory direct MOQ wholesale"
        canonical="/products"
        ogType="website"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Products Directory', item: '/products' },
        ]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Bulk Wholesale Products Directory',
          description: 'Catalog of bulk and wholesale products with tiered pricing and verified manufacturer credentials.',
          url: 'https://www.bulkskart.com/products',
        }}
      />
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 pb-28 sm:pb-36">
        {/* Visual Breadcrumb Trail */}
        <Breadcrumbs
          items={[
            { name: 'Products Directory', href: '/products' },
            ...(selectedCat && selectedCat !== 'all' ? [{ name: selectedCat }] : []),
          ]}
          className="mb-3"
        />

        {/* Header */}
        <div className="mb-4 md:mb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bulk Products Catalog</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Browse products from verified manufacturers — factory-direct bulk orders only
                {!loading && products.length > 0 && (
                  <span className="ml-2 text-muted-foreground/70">· {products.length} products</span>
                )}
              </p>
            </div>
            {/* Targeted B2B Keyword Density Badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                Factory-Direct
              </span>
              <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border font-medium">
                Wholesale MOQ Slabs
              </span>
              <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border font-medium">
                OEM / ODM Available
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                Verified Global Exporters
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products by name or spec..."
                className="pl-9 bg-card border-border"
              />
            </div>
            <Select value={selectedCat} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full md:w-52 bg-card border-border">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-full md:w-48 bg-card border-border">
                <Globe className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Country Origin" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Origins</SelectItem>
                {COUNTRIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {COUNTRY_FLAGS[c] ?? '🌐'} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick country selection pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#FF5A00]" /> Origin:
            </span>
            <button
              type="button"
              onClick={() => handleCountryChange('all')}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                selectedCountry === 'all'
                  ? 'bg-[#FF5A00] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All Origins
            </button>
            {COUNTRIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => handleCountryChange(c)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                  selectedCountry === c
                    ? 'bg-[#FF5A00] text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span>{COUNTRY_FLAGS[c] ?? '🌐'}</span>
                <span>{c}</span>
              </button>
            ))}
          </div>

          {/* Quick category selection pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
              <Boxes className="w-3 h-3 text-[#FF5A00]" /> Category:
            </span>
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                selectedCat === 'all'
                  ? 'bg-[#FF5A00] text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All Categories
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryChange(c.slug)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  selectedCat === c.slug
                    ? 'bg-[#FF5A00] text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-muted rounded-xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No products found matching your filter criteria.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => { setSelectedCat('all'); handleCountryChange('all'); setSearch(''); }}
              >
                Reset Filters
              </Button>
              <Link to="/auth?tab=supplier">
                <Button className="bg-primary text-primary-foreground">List Your Products</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-4.5">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                activeCountry={selectedCountry}
                isDuplicate={false}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
