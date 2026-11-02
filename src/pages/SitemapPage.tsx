import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Map, ExternalLink, FileCode, Building2, Search, CheckCircle2, Globe, BadgeCheck, Copy, ShieldCheck, Sparkles, Server } from 'lucide-react';
import Header from '@/components/layouts/Header';
import Footer from '@/components/layouts/Footer';
import PageMeta from '@/components/common/PageMeta';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getCompanies } from '@/lib/api';
import type { Company } from '@/types/types';

const SITEMAP = [
  {
    section: 'Main Marketplace',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Browse Products', href: '/products' },
      { label: 'Verified Suppliers & Manufacturers Directory', href: '/manufacturers' },
      { label: 'Live Buying Requirements & RFQ Feed', href: '/requirements' },
      { label: 'How It Works (Buyer & Supplier Guides)', href: '/how-it-works' },
      { label: 'Pricing & Growth Plans', href: '/pricing' },
      { label: 'Freight & Shipping Calculator', href: '/shipping-calculator' },
      { label: 'Free Delivery & Order Loan Calculator', href: '/loan-calculator' },
      { label: 'Post a Free Requirement (RFQ)', href: '/post-requirement' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    section: 'For Buyers',
    links: [
      { label: 'Post a Requirement (RFQ)', href: '/post-requirement' },
      { label: 'Browse Products by Category', href: '/products' },
      { label: 'Find Verified Factories', href: '/manufacturers' },
      { label: 'Buyer Dashboard', href: '/dashboard/buyer' },
      { label: 'My Requirements & Quotes', href: '/dashboard/buyer/requirements' },
      { label: 'Received Quotations', href: '/dashboard/buyer/quotes' },
      { label: 'Orders & Shipments', href: '/dashboard/buyer/orders' },
    ],
  },
  {
    section: 'For Suppliers & Exporters',
    links: [
      { label: 'Supplier Registration', href: '/auth?tab=supplier' },
      { label: 'Supplier Membership Plans', href: '/pricing' },
      { label: 'Supplier Dashboard', href: '/dashboard/supplier' },
      { label: 'Product Catalog Management', href: '/dashboard/supplier/products' },
      { label: 'Live RFQ Sourcing Inbox', href: '/dashboard/supplier/rfqs' },
      { label: 'Sent Quotations', href: '/dashboard/supplier/quotes' },
      { label: 'Inventory Management', href: '/dashboard/supplier/inventory' },
      { label: 'Performance Analytics', href: '/dashboard/supplier/analytics' },
    ],
  },
  {
    section: 'Company & Resources',
    links: [
      { label: 'About BulkSkart & Tech Pod AI', href: '/about' },
      { label: 'Blog & Global Trade Insights', href: '/blog' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Cookie Policy', href: '/cookie-policy' },
    ],
  },
];

const XML_SITEMAPS = [
  { name: 'Master Sitemap Index', path: '/sitemap.xml', desc: 'XML index of the sitemaps below' },
  { name: 'Core Pages Sitemap', path: '/sitemap-main.xml', desc: 'Main public landing and information pages' },
];

export default function SitemapPage() {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  // Verified companies exactly as the database holds them (the template's demo companies are excluded by getCompanies)
  const [verifiedSuppliers, setVerifiedSuppliers] = useState<Company[]>([]);

  useEffect(() => {
    getCompanies({ verified: true, limit: 200 }).then(setVerifiedSuppliers).catch(() => setVerifiedSuppliers([]));
  }, []);

  const countries = useMemo(() => {
    const counts: Record<string, number> = {};
    verifiedSuppliers.forEach((s: { country?: string }) => {
      const c = s.country || 'Global';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [verifiedSuppliers]);

  const filteredSuppliers = useMemo(() => {
    return verifiedSuppliers
      .filter((s: { company_name?: string; country?: string; industry?: string }) => {
        const matchesCountry = selectedCountry === 'All' || s.country === selectedCountry;
        const matchesSearch = !search ||
          s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.industry?.toLowerCase().includes(search.toLowerCase());
        return matchesCountry && matchesSearch;
      })
      .slice(0, 48);
  }, [search, selectedCountry, verifiedSuppliers]);

  return (
    <>
      <PageMeta
        title="Sitemap & Global Directory Index | BulkSkart"
        description="Full sitemap of BulkSkart — Browse all verified companies, manufacturers, wholesale products, live RFQ feeds, and platform resources."
        keywords="BulkSkart sitemap, B2B marketplace pages, all companies directory, wholesale index"
        canonical="/sitemap"
        ogType="website"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Sitemap', item: '/sitemap' },
        ]}
      />
      <Header />

      <section className="bg-[#1a1a2e] text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <Breadcrumbs
            items={[{ name: 'Platform Sitemap' }]}
            className="text-white/60 mb-4 text-xs"
          />

          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-3">
            <Map className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Site Directory</span>
          </div>
          <h1 className="text-[24px] md:text-[34px] font-black leading-tight mb-2">Sitemap</h1>
          <p className="text-white/70 text-sm max-w-2xl">
            Indexed map of BulkSkart marketplace pages, XML sitemaps for search engines, and the verified company directory.
          </p>
        </div>
      </section>

      {/* XML Sitemaps for Search Engines & Crawlers */}
      <section className="py-8 px-4 bg-muted/30 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileCode className="w-4 h-4 text-primary" /> Search Engine XML Sitemaps
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official protocol-compliant XML feeds for Googlebot, Bingbot, and global indexers.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText('https://www.bulkskart.com/sitemap.xml');
                toast.success('Copied Master Sitemap URL to clipboard');
              }}
              className="text-xs gap-1.5 h-8 shrink-0"
            >
              <Copy className="w-3.5 h-3.5 text-primary" /> Copy Master Sitemap URL
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {XML_SITEMAPS.map((sm) => (
              <a
                key={sm.path}
                href={sm.path}
                target="_blank"
                rel="noreferrer"
                className="bg-card border border-border rounded-lg p-3 hover:border-primary transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{sm.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">{sm.desc}</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-[11px]">
                  <code className="text-primary font-mono">{sm.path}</code>
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Active
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Robots.txt Directives</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Public routes allowed; dashboard & private pages blocked.
                </p>
                <a href="/robots.txt" target="_blank" rel="noreferrer" className="text-primary hover:underline text-[11px] mt-1 inline-flex items-center gap-1">
                  View robots.txt <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Structured Data</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Organization, WebSite, Product, Breadcrumbs, and FAQ schemas on live pages.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Server className="w-4 h-4 text-[#FF5A00] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Canonical URLs</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Clean apex URLs prevent duplicate content penalties.
                </p>
                <span className="text-muted-foreground text-[11px] mt-1 inline-block font-mono">
                  https://www.bulkskart.com/
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Website Pages */}
      <section className="py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-lg font-bold text-foreground mb-6">Marketplace Structure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {SITEMAP.map(({ section, links }) => (
              <div key={section}>
                <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5" /> {section}
                </h3>
                <ul className="space-y-2">
                  {links.map(({ label, href }) => (
                    <li key={`${section}-${href}-${label}`}>
                      <Link
                        to={href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                      >
                        <span className="w-1 h-1 rounded-full bg-border group-hover:bg-primary transition-colors shrink-0" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified Companies HTML Index */}
      <section className="py-10 px-4 border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Verified Manufacturers Directory ({verifiedSuppliers.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Direct indexed links to verified factories and exporters.</p>
            </div>
            <div className="w-full md:w-64">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mb-6">
            <button
              type="button"
              onClick={() => setSelectedCountry('All')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedCountry === 'All'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground hover:text-foreground border-border'
              }`}
            >
              All Regions ({verifiedSuppliers.length})
            </button>
            {countries.slice(0, 8).map(([country, count]) => (
              <button
                type="button"
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                  selectedCountry === country
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground hover:text-foreground border-border'
                }`}
              >
                <span>{country}</span>
                <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredSuppliers.map((c) => (
              <Link
                key={c.slug}
                to={`/companies/${c.slug}`}
                className="bg-card border border-border hover:border-primary rounded-lg p-3 transition-all flex flex-col justify-between group shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {c.company_name}
                    </span>
                    <BadgeCheck className="w-3.5 h-3.5 text-[#FF5A00] shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {c.country}</span>
                    <span>•</span>
                    <span className="line-clamp-1">{c.business_type || 'Manufacturer'}</span>
                  </div>
                  {c.key_products && c.key_products.length > 0 && (
                    <div className="text-[11px] text-muted-foreground/80 line-clamp-1">
                      {c.key_products.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-primary">
                  <span>View Verified Profile</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {verifiedSuppliers.length === 0 ? 'No verified manufacturers are listed yet.' : 'No companies match your search filter.'}
            </div>
          )}

          <div className="text-center mt-8">
            <Link
              to="/manufacturers"
              className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            >
              Explore Full Filterable Manufacturers Directory <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
