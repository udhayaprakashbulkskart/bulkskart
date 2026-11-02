import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageMeta from '@/components/common/PageMeta';
import {
  Search, ArrowRight, Shield, Globe, Users,
  ChevronRight, Star, Package,
  Lock, Truck, BadgeCheck,
  Zap, MessageSquare,
  CheckCircle, ChevronLeft, BarChart3, Phone,
  Play, Pause, Sparkles, Building2, ShieldCheck, FileText
} from 'lucide-react';
import MainLayout from '@/components/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import SubscribeToContactDialog from '@/components/common/SubscribeToContactDialog';
import { getOrCreateConversation, checkDirectMessageQuota, incrementMessageQuota, getCategories } from '@/lib/api';
import type { Requirement, Category } from '@/types/types';
import LiveRequirementsFeed from '@/components/common/LiveRequirementsFeed';
import FeaturedProductsSection from '@/components/home/FeaturedProductsSection';
import VerifiedSuppliersSection from '@/components/home/VerifiedSuppliersSection';
import VerifiedSupplierQuickActions from '@/components/home/VerifiedSupplierQuickActions';
import HeroSection3D from '@/components/home/HeroSection3D';
import MarketplaceActionCards3D from '@/components/home/MarketplaceActionCards3D';
import LiveReverseAuctionsRail from '@/components/home/LiveReverseAuctionsRail';
import GlobalTradeNetworkSection from '@/components/home/GlobalTradeNetworkSection';
import HowBulkSkartWorks3D from '@/components/home/HowBulkSkartWorks3D';
import CategoriesAndStatsSection from '@/components/home/CategoriesAndStatsSection';
import TrustAndFinalCTASection from '@/components/home/TrustAndFinalCTASection';
import PostRequirementsHomeSection from '@/components/home/PostRequirementsHomeSection';
import PlansHomeSection from '@/components/home/PlansHomeSection';
import OrderBenefitsSection from '@/components/home/OrderBenefitsSection';
import SafeImage, { toWebPUrl, buildWebPSrcSet } from '@/components/common/SafeImage';
import SectionHeader from '@/components/home/SectionHeader';

// ── Helpers ─────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Scroll-triggered fade-in wrapper ──────────────────────
function FadeInSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
    }}>
      {children}
    </div>
  );
}

const LIVE_REFRESH_MS = 2 * 60 * 1000;

const FLAG_MAP: Record<string, string> = {
  UAE: '🇦🇪', Kenya: '🇰🇪', Germany: '🇩🇪', Singapore: '🇸🇬', USA: '🇺🇸',
  India: '🇮🇳', UK: '🇬🇧', Australia: '🇦🇺', France: '🇫🇷', Japan: '🇯🇵',
  Canada: '🇨🇦', Brazil: '🇧🇷', China: '🇨🇳', Italy: '🇮🇹', Spain: '🇪🇸',
};

function AnimatedCount({ target, suffix = '' }: { target: number; suffix?: string }) {
  return <>{target.toLocaleString()}{suffix}</>;
}

// ── Image Assets (Pixabay Authentic Industrial Media) ──
const HERO_BG   = 'https://cdn.pixabay.com/photo/2016/11/29/09/32/welding-1868731_1280.jpg';
const CARGO_IMG = 'https://cdn.pixabay.com/photo/2017/04/02/09/08/bulldozer-2195329_1280.jpg';
const SHIPPING_BANNER = 'https://cdn.pixabay.com/photo/2016/11/21/14/53/boxes-1845814_1280.jpg';

const TOP_CATEGORIES = [
  { label: 'Machinery &\nIndustrial',   slug: 'machinery-industrial', img: 'https://cdn.pixabay.com/photo/2016/09/12/07/48/mechanical-1663275_1280.jpg' },
  { label: 'Electronics &\nElectrical',slug: 'electronics-electricals', img: 'https://cdn.pixabay.com/photo/2015/09/05/20/02/motherboard-924904_1280.jpg' },
  { label: 'Apparel &\nTextiles',      slug: 'textiles-apparel', img: 'https://cdn.pixabay.com/photo/2019/03/25/04/43/weaving-4079366_1280.jpg' },
  { label: 'Construction &\nBuilding', slug: 'construction-real-estate', img: 'https://cdn.pixabay.com/photo/2015/08/16/09/55/tile-890729_1280.jpg' },
  { label: 'Packaging &\nPrinting',     slug: 'packaging', img: 'https://cdn.pixabay.com/photo/2014/04/05/11/07/cardboard-314504_1280.jpg' },
  { label: 'Food &\nAgriculture',       slug: 'agriculture-food', img: 'https://cdn.pixabay.com/photo/2016/09/10/11/42/wheat-1659021_1280.jpg' },
  { label: 'Chemicals &\nRaw Materials',slug: 'chemicals-raw-materials',   img: 'https://cdn.pixabay.com/photo/2014/12/10/20/56/laboratory-563423_1280.jpg' },
  { label: 'Medical &\nHealthcare',     slug: 'pharma-healthcare',   img: 'https://cdn.pixabay.com/photo/2021/02/03/03/22/chemistry-5976465_1280.jpg' },
];

const TRUST_FEATURES = [
  { icon: BadgeCheck, label: 'Verified Suppliers' },
  { icon: Globe,      label: 'Global Network'    },
  { icon: Shield,     label: 'Secure Payments'   },
  { icon: Truck,      label: 'Reliable Logistics' },
];

const HOW_STEPS = [
  { icon: Search,   step: '1', title: 'Search',     desc: 'Find products or post your requirement' },
  { icon: Package,  step: '2', title: 'Get Quotes',  desc: 'Receive quotations from verified suppliers' },
  { icon: Users,    step: '3', title: 'Compare',     desc: 'Compare prices, choose the best deal' },
  { icon: Zap,      step: '4', title: 'Grow',        desc: 'Place orders and scale your business' },
];


// ── Hero Slides data ───────────────────────────────────────
const HERO_SLIDES = [
  {
    bg: HERO_BG,
    accent: CARGO_IMG,
    tag: 'CONNECT · SOURCE · GROW',
    headingWhite: 'Source from',
    headingOrange: 'Trusted\nManufacturers',
    sub: "India's growing B2B marketplace for manufacturers, suppliers and bulk buyers.",
    cta1: { label: 'Browse Manufacturers', to: '/manufacturers' },
    cta2: { label: 'How It Works', to: '/how-it-works' },
  },
  {
    bg: 'https://cdn.pixabay.com/photo/2016/09/12/07/48/mechanical-1663275_1280.jpg',
    accent: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=75',
    tag: 'CONNECT · SOURCE · GROW',
    headingWhite: 'Bulk Trade',
    headingOrange: 'Without Limits',
    sub: 'Connect directly with verified manufacturers, suppliers and exporters worldwide.',
    cta1: { label: 'Start Sourcing', to: '/products' },
    cta2: { label: 'Post RFQ', to: '/post-requirement' },
  },
  {
    bg: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=75',
    accent: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=75',
    tag: 'CONNECT · SOURCE · GROW',
    headingWhite: 'Post One RFQ,',
    headingOrange: 'Get 10+ Quotes',
    sub: 'Describe what you need and our AI-powered matching engine connects you to the right suppliers in minutes.',
    cta1: { label: 'Post Requirement', to: '/post-requirement' },
    cta2: { label: 'View Live RFQs', to: '/requirements' },
  },
];

const SLIDE_DURATION = 5500; // ms per slide

// ── Subscription plans (mirrored from PricingPage) ────────
const HOME_PLANS = [
  {
    tier: 'Starter',
    monthlyPrice: '₹2,500',
    annualPrice: '₹2,000',
    annualBilled: 'Billed annually at ₹24,000',
    period: '/mo',
    tagline: 'For new verified suppliers testing wholesale reach',
    popular: false,
    badge: 'Basic Tier',
    icon: Shield,
    features: ['Business profile listing', 'Up to 5 active product listings', '5 Post / RFQ responses / month', 'Standard search visibility', 'Direct buyer inquiries', 'Email customer support'],
    cta: 'Start 7-Day Trial',
    ctaTo: '/auth?tab=supplier',
  },
  {
    tier: 'Business',
    monthlyPrice: '₹7,500',
    annualPrice: '₹6,000',
    annualBilled: 'Billed annually at ₹72,000',
    period: '/mo',
    tagline: 'Growing manufacturers seeking high volume inquiries',
    popular: true,
    badge: '⚡ Most Popular',
    icon: Zap,
    features: ['All Starter features included', 'AI Accessibility Suite (AI Match & Auto Quote)', '50 Post / RFQ responses / month', 'Up to 50 product listings', 'Priority search placement', 'Official Verified Supplier Badge', 'Instant buyer chat notifications'],
    cta: 'Start 7-Day Trial',
    ctaTo: '/auth?tab=supplier',
  },
  {
    tier: 'Growth',
    monthlyPrice: '₹15,000',
    annualPrice: '₹12,000',
    annualBilled: 'Billed annually at ₹1,44,000',
    period: '/mo',
    tagline: 'Established manufacturers scaling exports globally',
    popular: false,
    badge: 'High Volume',
    icon: Globe,
    features: ['All Business features + Full AI Suite', 'Unlimited Post / RFQ responses', 'Unlimited product listings', 'Top priority search visibility', 'Advanced trade & buyer analytics', 'Up to 3 sub-accounts', 'Dedicated WhatsApp & phone support'],
    cta: 'Start 7-Day Trial',
    ctaTo: '/auth?tab=supplier',
  },
  {
    tier: 'Enterprise',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    annualBilled: 'Tailored billing & SLA',
    period: '',
    tagline: 'Large industrial plants & multinational trading houses',
    popular: false,
    badge: 'Enterprise',
    icon: BarChart3,
    features: ['Unlimited product listings', 'Unlimited RFQ buyer leads', 'Custom branded factory storefront', 'Dedicated account manager', '10+ team seats & roles', 'ERP / CRM API data integration', '24/7 dedicated priority SLA'],
    cta: 'Contact Sales',
    ctaTo: '/contact',
  },
];

function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = HERO_SLIDES.length;

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setCurrent(c => (c + 1) % total), SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [current, paused]);

  const prev = () => setCurrent(c => (c - 1 + total) % total);
  const next = () => setCurrent(c => (c + 1) % total);

  const slide = HERO_SLIDES[current];

  return (
    <section
      className="relative overflow-hidden min-h-[350px] sm:min-h-[420px] md:min-h-[500px] flex flex-col justify-center -mt-px"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Animated background image ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-${current}`}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          <picture className="w-full h-full">
            <source
              type="image/webp"
              srcSet={buildWebPSrcSet(slide.bg)}
              sizes="100vw"
            />
            <img
              src={toWebPUrl(slide.bg, 1200)}
              alt={`${slide.headingWhite} ${slide.headingOrange.replace('\n', ' ')}`}
              loading={current === 0 ? "eager" : "lazy"}
              decoding={current === 0 ? "sync" : "async"}
              fetchPriority={current === 0 ? "high" : "auto"}
              className="w-full h-full object-cover object-center"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1117]/93 via-[#0d1117]/72 to-[#0d1117]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117]/55 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* ── Animated right-side accent image (desktop) ── */}
      <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[42%] z-[1] overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={`accent-${current}`}
            className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <picture className="w-full h-full">
              <source
                type="image/webp"
                srcSet={buildWebPSrcSet(slide.accent)}
                sizes="50vw"
              />
              <img
                src={toWebPUrl(slide.accent, 800)}
                alt="BulkSkart B2B Trade Cargo Logistics"
                loading={current === 0 ? "eager" : "lazy"}
                decoding={current === 0 ? "sync" : "async"}
                fetchPriority={current === 0 ? "high" : "auto"}
                className="w-full h-full object-cover object-left"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d1117]/98 via-[#0d1117]/80 to-[#0d1117]/40 md:to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Slide content ── */}
      <div className="relative z-10 max-w-[1400px] mx-auto w-full px-3.5 sm:px-5 md:px-6 py-6 sm:py-8 md:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${current}`}
            className="max-w-[540px]"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            {/* Tag pill */}
            <motion.div
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-2.5 py-0.5 mb-2 sm:mb-2.5 backdrop-blur-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00] animate-pulse" />
              <span className="text-[9.5px] font-bold text-white/80 uppercase tracking-widest">{slide.tag}</span>
            </motion.div>

            {/* Exactly one clear H1 per SEO requirement */}
            <motion.h1
              className="text-[22px] min-[360px]:text-[26px] sm:text-[34px] md:text-[46px] font-black text-white leading-[1.08] tracking-tight mb-2 sm:mb-2.5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              <span>India’s B2B </span>
              <span className="text-[#FF5A00] block">Bulk Buying & Wholesale Marketplace</span>
            </motion.h1>

            {/* Slide Action Subtitle (h2) */}
            <motion.h2
              className="text-[12.5px] sm:text-[14px] font-bold text-white/90 mb-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
            >
              {slide.headingWhite} {slide.headingOrange.replace('\n', ' ')}
            </motion.h2>

            {/* Sub-copy */}
            <motion.p
              className="text-[11.5px] min-[360px]:text-[12.5px] sm:text-[13.5px] md:text-[15px] text-white/75 leading-relaxed mb-3 sm:mb-4 max-w-[440px]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 }}
            >
              {slide.sub}
            </motion.p>

            {/* Trust features — 4-col icon+label row */}
            <motion.div
              className="grid grid-cols-4 gap-1 sm:gap-2 mb-3.5 sm:mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42 }}
            >
              {TRUST_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-center min-w-0">
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF5A00] shrink-0" />
                  <span className="text-[8.5px] min-[360px]:text-[9px] md:text-[10px] text-white/70 font-medium leading-tight truncate w-full">{label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              className="flex gap-2 sm:gap-2.5 flex-col min-[340px]:flex-row sm:flex-nowrap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48 }}
            >
              <Link to={slide.cta1.to} className="w-full min-[340px]:flex-1 sm:w-auto sm:flex-none">
                <Button className="w-full sm:w-auto bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-10 sm:h-11 px-3.5 sm:px-5 text-[12px] sm:text-[13px] rounded-xl shadow-[0_3px_0_#922f00] gap-1.5 sm:gap-2 transition-all active:shadow-none active:translate-y-0.5">
                  <Package className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{slide.cta1.label}</span> <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Button>
              </Link>
              <Link to={slide.cta2.to} className="w-full min-[340px]:flex-1 sm:w-auto sm:flex-none">
                <Button className="w-full sm:w-auto bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-10 sm:h-11 px-3.5 sm:px-5 text-[12px] sm:text-[13px] rounded-xl shadow-[0_3px_0_#922f00] gap-1.5 sm:gap-2 transition-all active:shadow-none active:translate-y-0.5">
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{slide.cta2.label}</span>
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Slide controls ── */}
      {/* Dot indicators + counter */}
      <div className="absolute bottom-4 left-4 sm:left-5 md:left-6 z-20 flex items-center gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-7 h-2.5 bg-[#FF5A00]' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
        <span className="ml-1 text-[10px] text-white/70 font-mono">
          {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20">
        {!paused && (
          <motion.div
            key={current}
            className="h-full bg-[#FF5A00]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: SLIDE_DURATION / 1000, ease: 'linear' }}
          />
        )}
      </div>
    </section>
  );
}

// ── Top Categories Section (Exact Reference 4-Column Grid UI) ────────────────
function TopCategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCategories()
      .then(data => {
        if (mounted && data && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="py-5 md:py-8 bg-background border-b border-border/40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-5 md:px-6">
        <FadeInSection>
          {/* Header matching reference screenshot: Bold Title on Left + View All -> on Right */}
          <div className="flex items-center justify-between mb-3.5 sm:mb-4">
            <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
              Top Categories
            </h2>
            <Link
              to="/products"
              className="text-[#FF5A00] font-bold text-sm sm:text-base flex items-center gap-1 hover:underline transition-colors shrink-0"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Desktop: 4-Column Responsive Grid (4 columns x 2 rows) */}
          <div className="hidden md:grid md:grid-cols-4 md:gap-4.5">
            {TOP_CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                to={`/products?category=${cat.slug}`}
                className="bg-card dark:bg-[#12151e] border border-border/60 hover:border-[#FF5A00]/50 rounded-2xl p-2.5 flex flex-col items-center justify-between text-center group cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 active:scale-98 h-full w-full min-w-0"
              >
                {/* Image Container with 4:3 Aspect Ratio */}
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted relative mb-1.5 shrink-0">
                  <SafeImage
                    src={cat.img}
                    alt={cat.label.replace('\n', ' ')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="220px"
                  />
                </div>

                {/* Category Title */}
                <span className="text-xs md:text-sm font-bold text-foreground leading-tight text-center line-clamp-2 group-hover:text-[#FF5A00] transition-colors px-0.5 mt-auto min-h-[30px] flex items-center justify-center">
                  {cat.label.replace('\n', ' ')}
                </span>
              </Link>
            ))}
          </div>

          {/* Mobile: Touch-Friendly Horizontal Swipe Carousel with Partial Next Card Peek */}
          <div className="md:hidden flex items-stretch gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory overscroll-x-contain touch-pan-x -mx-3.5 px-3.5 sm:-mx-5 sm:px-5">
            {TOP_CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                to={`/products?category=${cat.slug}`}
                className="shrink-0 w-[115px] min-[360px]:w-[125px] snap-start bg-card dark:bg-[#12151e] border border-border/60 hover:border-[#FF5A00]/50 rounded-xl p-2 flex flex-col items-center justify-between text-center group cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 active:scale-98"
              >
                <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-muted relative mb-1.5 shrink-0">
                  <SafeImage
                    src={cat.img}
                    alt={cat.label.replace('\n', ' ')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="125px"
                  />
                </div>
                <span className="text-[11px] font-bold text-foreground leading-tight text-center line-clamp-2 group-hover:text-[#FF5A00] transition-colors px-0.5 mt-auto min-h-[28px] flex items-center justify-center">
                  {cat.label.replace('\n', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, profile, company } = useAuth();
  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Auto filter clear on landing page mount
  useEffect(() => {
    setSearchQuery('');
    window.dispatchEvent(new CustomEvent('bulkskart-clear-landing-filters'));
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogReason, setDialogReason] = useState<'not_logged_in' | 'not_registered_business' | 'no_subscription' | 'quota_exceeded'>('no_subscription');
  const [contactingId, setContactingId] = useState<string | null>(null);

  const handleContact = async (req: Requirement) => {
    if (!user || !profile) { setDialogReason('not_logged_in'); setDialogOpen(true); return; }
    if (!company) { setDialogReason('not_registered_business'); setDialogOpen(true); return; }
    setContactingId(req.id);
    const quota = await checkDirectMessageQuota(company.id, company);
    if (quota !== 'ok') { setDialogReason(quota); setDialogOpen(true); setContactingId(null); return; }
    const buyerId = req.buyer_id ?? req.profiles?.id;
    if (!buyerId) { setContactingId(null); return; }
    const { id: convId } = await getOrCreateConversation(buyerId, user.id, company.id, req.id);
    if (!convId) { setContactingId(null); return; }
    await incrementMessageQuota(company.id);
    setContactingId(null);
    navigate(`/dashboard/supplier/messages?conv=${convId}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <MainLayout>
      <PageMeta
        title="BulkSkart | B2B Wholesale Marketplace & Bulk Suppliers in India"
        description="Find verified manufacturers and wholesale suppliers in India. Every BulkSkart order includes free delivery. Compare bulk prices, estimate an order installment, post free RFQs, and source factory-direct products."
        keywords="B2B marketplace India, wholesale suppliers India, bulk suppliers, manufacturers in India, post RFQ, factory direct wholesale, MOQ, bulk buying"
        canonical="https://www.bulkskart.com/"
        ogImage="https://www.bulkskart.com/brand/bulkskart-logo.jpg"
        ogType="website"
        breadcrumbs={[
          { name: 'Home', item: '/' },
        ]}
        faq={[
          {
            question: "What is BulkSkart?",
            answer: "BulkSkart is India's leading global B2B wholesale marketplace connecting verified bulk buyers directly with verified global manufacturers and industrial exporters.",
          },
          {
            question: "Is posting a bulk requirement (RFQ) free for buyers?",
            answer: "Yes, verified buyers can post unlimited bulk buying requirements (RFQs) 100% free with zero platform commissions or hidden fees.",
          },
          {
            question: "How does BulkSkart verify suppliers and factories?",
            answer: "Every manufacturer undergoes rigorous verification including business license audits, tax identification (GST/IEC), production facility certifications (ISO, CE, FDA), and historical trade performance reviews.",
          },
          {
            question: "What is Trade Assurance on BulkSkart?",
            answer: "Trade Assurance protects buyer purchase orders with guaranteed on-time dispatch, product quality standards, milestone escrow payments, and secure dispute resolution.",
          },
          {
            question: "Can suppliers receive live buyer requirements?",
            answer: "Yes, verified manufacturers receive instant alerts for live buying tenders matching their product categories and can submit direct factory quotations to buyers.",
          },
          {
            question: "Is delivery free on BulkSkart?",
            answer: "Yes. Free delivery applies to every order placed on BulkSkart. No delivery fee is added at checkout, for any order value or product category.",
          },
          {
            question: "Can I estimate a monthly installment for a bulk order?",
            answer: "Yes. The order loan calculator on the homepage estimates a monthly installment from the order value, down payment, interest rate, and tenure. Delivery on that order stays free. The figure is for planning and is not a credit approval.",
          },
        ]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': 'https://www.bulkskart.com/#webpage',
          url: 'https://www.bulkskart.com/',
          name: 'BulkSkart | B2B Wholesale Marketplace & Bulk Suppliers in India',
          description: 'Find verified manufacturers and wholesale suppliers in India. Every BulkSkart order includes free delivery. Compare bulk prices, estimate an order installment, post free RFQs, and source factory-direct products.',
          isPartOf: { '@id': 'https://www.bulkskart.com/#website' },
          about: { '@id': 'https://www.bulkskart.com/#organization' },
          inLanguage: 'en-IN',
        }}
      />

      {/* Mobile search bar now lives in Header — no duplicate here */}

      {/* ═══════════════════════════════════════════════════
          SECTION 1: BANNER (HERO / PROMOTIONAL BANNER)
      ═══════════════════════════════════════════════════ */}
      <HeroSection3D />

      {/* ═══════════════════════════════════════════════════
          SECTION 2: VERIFIED SUPPLIERS (POSITIONED IN FRONT OF FEATURED PRODUCTS)
      ═══════════════════════════════════════════════════ */}
      <VerifiedSuppliersSection />

      {/* ═══════════════════════════════════════════════════
          SECTION 3: FEATURED PRODUCTS (IMMEDIATE VIEW - ZERO LOADING DELAY)
      ═══════════════════════════════════════════════════ */}
      <FeaturedProductsSection />

      {/* Free delivery on every order + order loan calculator */}
      <OrderBenefitsSection />

      {/* ═══════════════════════════════════════════════════
          SECTION 4: CATEGORIES (PRODUCT & INDUSTRIAL CATEGORIES)
      ═══════════════════════════════════════════════════ */}
      <CategoriesAndStatsSection />

      {/* ═══════════════════════════════════════════════════
          SECTION 5: QUICK ACTIONS (FIND MFR, PRODUCT, POST RFQ, 24H SELL, GLOBAL TRADE)
      ═══════════════════════════════════════════════════ */}
      <VerifiedSupplierQuickActions />

      {/* ═══════════════════════════════════════════════════
          SECTION 5: LIVE BUYING REQUIREMENTS (REAL-TIME RFQS & DEMANDS)
      ═══════════════════════════════════════════════════ */}
      <LiveRequirementsFeed />

      {/* ═══════════════════════════════════════════════════
          SECTION 6: SELL PRODUCTS IN 24 HOURS (HOT) (FAST-TRACK 24H LIQUIDATION)
      ═══════════════════════════════════════════════════ */}
      <LiveReverseAuctionsRail />

      {/* ═══════════════════════════════════════════════════
          SECTION 7: GLOBAL TRADE ROUTES (LOGISTICS & CROSS-BORDER LANES)
      ═══════════════════════════════════════════════════ */}
      <GlobalTradeNetworkSection />

      {/* ═══════════════════════════════════════════════════
          SECTION 8: POST REQUIREMENTS (INLINE RFQ SUBMISSION ENGINE)
      ═══════════════════════════════════════════════════ */}
      <PostRequirementsHomeSection />

      {/* ═══════════════════════════════════════════════════
          SECTION 9: PLANS (MONTHLY SUPPLIER SUBSCRIPTIONS - NO ANNUAL BILLING)
      ═══════════════════════════════════════════════════ */}
      <PlansHomeSection />

      {/* ═══════════════════════════════════════════════════
          CRAWLABLE B2B MARKETPLACE OVERVIEW (SEO & BUYER GUIDE)
      ═══════════════════════════════════════════════════ */}
      <section className="py-12 bg-card/60 border-t border-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <SectionHeader
                align="center"
                eyebrow="India sourcing ecosystem"
                title="India’s Premier B2B Bulk Buying & Wholesale Platform"
                subtitle="Bridging verified Indian manufacturing clusters with global procurement professionals through transparent quotation comparison and Trade Assurance."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <div className="space-y-3 bg-background/60 p-5 rounded-2xl border border-border">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#FF5A00]" />
                  <span>What Bulkskart Is & Who It Is For</span>
                </h3>
                <p>
                  Bulkskart is India’s dedicated digital B2B wholesale marketplace connecting commercial buyers directly with verified production facilities. Built specifically for corporate procurement teams, retail distributors, export trading houses, and institutional buyers, Bulkskart eliminates opaque broker tiers and delivers verified factory-direct pricing.
                </p>
                <p>
                  Whether you are an established enterprise sourcing high-volume industrial machinery or a growing retail brand restocking seasonal inventory, Bulkskart streamlines supplier discovery across all major manufacturing corridors.
                </p>
              </div>

              <div className="space-y-3 bg-background/60 p-5 rounded-2xl border border-border">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF5A00]" />
                  <span>Manufacturers vs Wholesalers</span>
                </h3>
                <p>
                  Our verified network distinguishes between primary <Link to="/manufacturers" className="text-[#FF5A00] font-semibold hover:underline">Manufacturers</Link> offering custom OEM/ODM production runs and master <Link to="/wholesale-suppliers" className="text-[#FF5A00] font-semibold hover:underline">Wholesalers</Link> maintaining ready-to-ship pallet inventory.
                </p>
                <p>
                  Buyers can filter by business type, production capacity, ISO compliance, and location clusters like <Link to="/manufacturers-in-tamil-nadu" className="text-[#FF5A00] font-semibold hover:underline">Tamil Nadu</Link>, <Link to="/manufacturers-in-coimbatore" className="text-[#FF5A00] font-semibold hover:underline">Coimbatore</Link>, <Link to="/manufacturers-in-chennai" className="text-[#FF5A00] font-semibold hover:underline">Chennai</Link>, and Gujarat.
                </p>
              </div>

              <div className="space-y-3 bg-background/60 p-5 rounded-2xl border border-border">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF5A00]" />
                  <span>RFQ Workflow & Quotation Comparison</span>
                </h3>
                <p>
                  Posting a <Link to="/post-requirement" className="text-[#FF5A00] font-semibold hover:underline">Request for Quotation (RFQ)</Link> takes less than 60 seconds. Specify required quantities, target prices, delivery incoterms (FOB, CIF, EXW), and technical drawings.
                </p>
                <p>
                  Qualified suppliers submit itemized quotes with clear breakdowns for unit costs, sample availability, mold tooling fees, and estimated production lead times, allowing buyers to compare bids side-by-side.
                </p>
              </div>

              <div className="space-y-3 bg-background/60 p-5 rounded-2xl border border-border">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#FF5A00]" />
                  <span>MOQ Flexibility & Tiered Bulk Pricing</span>
                </h3>
                <p>
                  Each listing in our <Link to="/bulk-products" className="text-[#FF5A00] font-semibold hover:underline">bulk products catalog</Link> clearly displays the Minimum Order Quantity (MOQ) alongside quantity-discount tiers.
                </p>
                <p>
                  Buyers can order pre-production commercial samples before approving full container volumes, with milestone payments safely protected through Trade Assurance until goods pass quality inspection.
                </p>
              </div>
            </div>

            {/* Quick Sourcing Hub Links */}
            <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="font-bold text-foreground mr-1">Popular Sourcing Hubs:</span>
              <Link to="/b2b-marketplace" className="text-muted-foreground hover:text-[#FF5A00] underline">B2B Marketplace</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/manufacturers-in-india" className="text-muted-foreground hover:text-[#FF5A00] underline">Manufacturers in India</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/wholesale-suppliers-in-india" className="text-muted-foreground hover:text-[#FF5A00] underline">Wholesale Suppliers India</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/manufacturers-in-tamil-nadu" className="text-muted-foreground hover:text-[#FF5A00] underline">Tamil Nadu Factories</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/manufacturers-in-coimbatore" className="text-muted-foreground hover:text-[#FF5A00] underline">Coimbatore Pumps & Textiles</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/manufacturers-in-chennai" className="text-muted-foreground hover:text-[#FF5A00] underline">Chennai Industrial Hub</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/blog/what-is-moq" className="text-muted-foreground hover:text-[#FF5A00] underline">What is MOQ?</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/blog/how-to-find-manufacturers-in-india" className="text-muted-foreground hover:text-[#FF5A00] underline">Finding Indian Factories Guide</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FINAL CTA BANNER
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#1a1a2e] dark:bg-[#15181F]">
        <div className="absolute inset-0 z-0 opacity-20">
          <img
            src={SHIPPING_BANNER}
            alt="BulkSkart Global Shipping and Logistics Network"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        <FadeInSection className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-5 md:px-6 py-6 sm:py-8 md:py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-primary/40 bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-[16px] md:text-[22px] font-black text-white leading-snug">
                  Join thousands of businesses trading smarter with Bulkskart.
                </h2>
              </div>
            </div>
            <Link to="/auth?tab=register" className="w-full md:w-auto shrink-0">
              <Button className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 text-[14px] rounded-xl shadow-[0_4px_0_hsl(20_100%_30%)] gap-2 transition-all active:shadow-none active:translate-y-0.5">
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </FadeInSection>
      </section>

      <SubscribeToContactDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        reason={dialogReason}
      />
    </MainLayout>
  );
}

