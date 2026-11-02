import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ArrowRight, Package, Users, Globe, Flame, FileText, Truck, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMarketplaceCounts, type MarketplaceCounts } from '@/lib/api';

interface HeroSection3DProps {
  onSearch?: (query: string, category: string) => void;
}

const POPULAR_CATEGORIES = [
  { name: 'Textile', query: 'cotton fabric yarn' },
  { name: 'Steel', query: 'steel pipe rebar sheet' },
  { name: 'Chemical', query: 'polymers dyes industrial' },
  { name: 'Plastic', query: 'granules polymer hdpe' },
  { name: 'Machinery', query: 'generator motor equipment' },
  { name: 'Agriculture', query: 'spices grains coffee' },
  { name: 'Packaging', query: 'corrugated boxes cartons' },
  { name: 'Electrical', query: 'cables transformers switchgear' },
];


export default function HeroSection3D({ onSearch }: HeroSection3DProps) {
  const [counts, setCounts] = useState<MarketplaceCounts | null>(null);
  useEffect(() => {
    let cancelled = false;
    getMarketplaceCounts().then((result) => { if (!cancelled) setCounts(result); }).catch(() => { if (!cancelled) setCounts(null); });
    return () => { cancelled = true; };
  }, []);
  const metrics = [
    { icon: Users, value: counts?.verifiedSuppliers ?? null, label: 'Verified suppliers' },
    { icon: Globe, value: counts?.supplierCountries ?? null, label: 'Supplier countries' },
    { icon: Package, value: counts?.openRequirements ?? null, label: 'Open RFQs' },
    { icon: Flame, value: counts?.liveAuctions ?? null, label: 'Live auctions' },
  ];
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'products' | 'manufacturers' | 'rfqs'>('products');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      if (selectedType === 'manufacturers') navigate('/manufacturers');
      else if (selectedType === 'rfqs') navigate('/auctions/reverse');
      else navigate('/products');
      return;
    }

    if (onSearch) {
      onSearch(searchQuery, selectedType);
    }

    if (selectedType === 'manufacturers') {
      navigate(`/manufacturers?q=${encodeURIComponent(searchQuery.trim())}`);
    } else if (selectedType === 'rfqs') {
      navigate(`/auctions/reverse?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleQuickTagClick = (tagQuery: string) => {
    navigate(`/products?q=${encodeURIComponent(tagQuery)}`);
  };

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Soft brand glow behind the headline */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[60%] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

      <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-4 py-10 sm:px-6 md:py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14 lg:py-20">
        {/* Copy and primary actions */}
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-foreground">
            <Globe className="h-3.5 w-3.5 text-primary" />
            Global B2B marketplace
          </span>

          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Buy in bulk.
            <br />
            <span className="text-primary">Grow bigger.</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Connect with verified manufacturers, suppliers and bulk buyers worldwide. Delivery is free on every order.
          </p>

          <div className="flex flex-wrap gap-2">
            <a
              href="#order-benefits"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <Truck className="h-3.5 w-3.5" />
              Free delivery on all orders
            </a>
            <a
              href="#order-benefits"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              <Calculator className="h-3.5 w-3.5" />
              Order loan calculator
            </a>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-11 rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
              <Link to="/products">
                Explore marketplace
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-xl px-6 font-bold">
              <Link to="/post-requirement">
                <FileText className="mr-1.5 h-4 w-4" />
                Post a requirement
              </Link>
            </Button>
          </div>
        </div>

        {/* Search panel */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/5 sm:p-6">
          <h2 className="text-base font-bold text-foreground">Find products and suppliers</h2>
          <p className="mt-1 text-sm text-muted-foreground">Search verified catalogues, manufacturers and live RFQs.</p>

          <form
            onSubmit={handleSearchSubmit}
            className="mt-4 flex items-center gap-1 rounded-xl border border-input bg-background p-1 pl-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
          >
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'products' | 'manufacturers' | 'rfqs')}
              className="shrink-0 cursor-pointer border-r border-border bg-transparent pr-2 text-sm font-semibold text-foreground outline-none"
            >
              <option value="products">Products</option>
              <option value="manufacturers">Manufacturers</option>
              <option value="rfqs">Live RFQs</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, suppliers, categories…"
              className="min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <Button type="submit" size="icon" className="h-10 w-10 rounded-lg" aria-label="Submit search">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Popular:</span>
            {POPULAR_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleQuickTagClick(cat.query)}
                className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5">
            {metrics.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-black leading-tight text-foreground">{value === null ? '—' : value.toLocaleString('en-IN')}</div>
                  <div className="truncate text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
