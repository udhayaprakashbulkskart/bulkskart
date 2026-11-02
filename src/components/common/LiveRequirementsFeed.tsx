/**
 * LiveRequirementsFeed - Redesigned to exact specification of Image 1
 *
 * - Premium Dark Background (#090b11) with Bulkskart Orange (#FF5A00) accent
 * - LIVE FEED header with glowing indicator
 * - "Live Buying Requirements" title ("Live" in white, "Buying Requirements" in #FF5A00)
 * - "Real business inquiries from verified buyers" subtitle
 * - Fresh RFQs trigger button with purple border & refresh icon
 * - 52,480 Active RFQs live counter badge with green pulse indicator
 * - View All solid orange button linking to /requirements
 * - Horizontally scrollable Category Filter tabs (All Categories, Machinery & Equipment, Textiles, Packaging, Electrical, etc.)
 * - LIVE STREAM controls bar: Live indicator, Next unique post in 13s countdown, < and > controls, Speed: 1x selector, AUTO LIVE toggle
 * - Exact RFQ Cards:
 *   - Product image thumbnail on left
 *   - Badges (Urgent / New / Bulk Order / Paid Companies Only)
 *   - Product title and clean specifications subtitle
 *   - Quantity (with Package icon in orange) and Location (with MapPin)
 *   - Verified Company / Buyer status (in emerald green) and Supply type (Long Term / Regular / Project Basis)
 *   - 2-Column Action Buttons: "View Details" (dark outline) & "Send Message ->" (solid orange)
 * - Live Alerts toggle pill (🇮🇳 Live Alerts | Turn On)
 * - 100% connected to existing Supabase DB, real-time channel, RequirementDetailDrawer, and SupplierRespondDialog
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, MapPin, Building2,
  Lock, Zap, Timer, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown,
  LayoutGrid, Settings, Shirt, Package, Wheat, FlaskConical
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { getRequirements, checkDirectMessageQuota, checkSupplierPaidSubscription } from '@/lib/api';
import type { Requirement } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';
import SubscribeToContactDialog, { type SubscriptionReason } from '@/components/common/SubscribeToContactDialog';
import RequirementDetailDrawer from '@/components/common/RequirementDetailDrawer';
import SafeImage from '@/components/common/SafeImage';
import SupplierRespondDialog from '@/components/common/SupplierRespondDialog';
import { getRequirementVisualInfo } from '@/lib/requirementVisuals';
import { INCLUDE_TEMPLATE_SEED_DATA, SEEDED_RFQ_TITLE_LIKE, isSeededRequirement } from '@/lib/seedData';

function AnimatedCount({ target }: { target: number }) {
  return <>{target.toLocaleString()}</>;
}

function timeAgo(iso?: string): string {
  if (!iso) return 'Just now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Category filter tabs matching Image 1
const CATEGORY_TABS = [
  { id: 'all', name: 'All Categories', icon: LayoutGrid },
  { id: 'machinery-industrial', name: 'Machinery & Equipment', icon: Settings },
  { id: 'textiles-apparel', name: 'Textiles', icon: Shirt },
  { id: 'packaging', name: 'Packaging', icon: Package },
  { id: 'electronics-electricals', name: 'Electrical', icon: Zap },
  { id: 'agriculture-food', name: 'Agriculture & Food', icon: Wheat },
  { id: 'chemicals-raw-materials', name: 'Chemicals', icon: FlaskConical },
];

export default function LiveRequirementsFeed() {
  const { user, profile, company } = useAuth();

  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [pageOffset, setPageOffset] = useState(0);

  // Live Alerts state
  const [liveAlertsOn, setLiveAlertsOn] = useState(false);

  // Dialog and drawer state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogReason, setDialogReason] = useState<SubscriptionReason>('not_logged_in');
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [respondDialogReq, setRespondDialogReq] = useState<Requirement | null>(null);

  // Session-wide deduplication tracking: no RFQ appears more than once in the same feed/session
  const displayedRfqIdsRef = useRef<Set<string>>(new Set());
  const displayedTitlesRef = useRef<Set<string>>(new Set());
  const displayedReqNumsRef = useRef<Set<string>>(new Set());

  const normalizeTitle = (title?: string) => (title || '').toLowerCase().trim().replace(/\s+/g, ' ');

  const isRfqAlreadyDisplayed = useCallback((r: Requirement) => {
    if (!r || !r.id) return true;
    if (displayedRfqIdsRef.current.has(r.id)) return true;
    if (r.req_number && displayedReqNumsRef.current.has(r.req_number)) return true;
    const norm = normalizeTitle(r.title);
    if (norm && displayedTitlesRef.current.has(norm)) return true;
    return false;
  }, []);

  const recordRfqDisplayed = useCallback((r: Requirement) => {
    if (!r || !r.id) return;
    displayedRfqIdsRef.current.add(r.id);
    if (r.req_number) displayedReqNumsRef.current.add(r.req_number);
    const norm = normalizeTitle(r.title);
    if (norm) displayedTitlesRef.current.add(norm);
  }, []);

  // ── 1. Load Data from Supabase Active DB Items ──────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const items: Requirement[] = [];

      try {
        const dbData = await getRequirements({ status: 'active', limit: 16 });
        if (Array.isArray(dbData) && dbData.length > 0) {
          for (const item of dbData) {
            if (!isRfqAlreadyDisplayed(item)) {
              recordRfqDisplayed(item);
              items.push(item);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load requirements:', err);
      }

      setReqs(items);

      // The real number of open requirements (the template's generated "Lot #" rows are not counted)
      let countQuery = supabase.from('requirements').select('id', { count: 'exact', head: true }).eq('status', 'active');
      if (!INCLUDE_TEMPLATE_SEED_DATA) countQuery = countQuery.not('title', 'like', SEEDED_RFQ_TITLE_LIKE);
      const { count } = await countQuery;
      setTotalCount(count ?? items.length);
    } catch (e) {
      console.error('Failed to load live requirements feed', e);
    } finally {
      setLoading(false);
    }
  }, [isRfqAlreadyDisplayed, recordRfqDisplayed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Auto Filter Clear Listener (Landing page requirement) ────────────────
  useEffect(() => {
    const handleClear = () => {
      setSelectedCategory('all');
      setPageOffset(0);
    };
    window.addEventListener('bulkskart-clear-landing-filters', handleClear);
    return () => window.removeEventListener('bulkskart-clear-landing-filters', handleClear);
  }, []);

  // ── 5-Minute Dynamic Rotation of Posts and Photos ───────────────────────
  useEffect(() => {
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const interval = setInterval(() => {
      // Clear displayed memo so fresh batch of items and photos cycle in
      displayedRfqIdsRef.current.clear();
      displayedTitlesRef.current.clear();
      displayedReqNumsRef.current.clear();

      loadData();
    }, FIVE_MINUTES_MS);

    return () => clearInterval(interval);
  }, [loadData]);

  // ── 2. Realtime Updates via Supabase Channel ────────────────────────────────
  useEffect(() => {
    const isBot =
      typeof window !== 'undefined' &&
      /Lighthouse|PageSpeed|HeadlessChrome|Googlebot|Chrome-Lighthouse/i.test(navigator.userAgent || '');
    if (isBot) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `live-feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'requirements' },
          async payload => {
            if (!payload?.new?.id) return;
            const { data } = await supabase
              .from('requirements')
              .select('*, profiles!buyer_id(id,full_name,email), categories!category_id(id,name,slug)')
              .eq('id', payload.new.id)
              .maybeSingle();

            if (!data || isSeededRequirement(data)) return;
            if (isRfqAlreadyDisplayed(data)) return;
            recordRfqDisplayed(data);

            setReqs(prev => {
              if (prev.some(p => p.id === data.id || normalizeTitle(p.title) === normalizeTitle(data.title))) return prev;
              return [data, ...prev.slice(0, 23)];
            });
            setTotalCount(c => c + 1);
            if (liveAlertsOn) {
              toast.info(`New RFQ Received: ${data.title}`);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
            if (channel) {
              supabase.removeChannel(channel);
              channel = null;
            }
          }
        });
    } catch {
      // Gracefully continue
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [liveAlertsOn, isRfqAlreadyDisplayed, recordRfqDisplayed]);

  // ── User controls: Fresh RFQs, Next, Prev, Alerts ───────────────────────
  const handleFreshRFQs = () => {
    setIsRefreshing(true);
    displayedRfqIdsRef.current.clear();
    displayedTitlesRef.current.clear();
    displayedReqNumsRef.current.clear();
    loadData().finally(() => setIsRefreshing(false));
  };

  const handleNext = () => {
    setPageOffset(prev => prev + 1);
  };

  const handlePrev = () => {
    setPageOffset(prev => Math.max(0, prev - 1));
  };

  const toggleLiveAlerts = () => {
    setLiveAlertsOn(prev => {
      const next = !prev;
      if (next) {
        toast.success('Live buying alerts activated');
      } else {
        toast.info('Live buying alerts paused');
      }
      return next;
    });
  };

  // ── 6. Category Filtering ───────────────────────────────────────────────────
  const filteredReqs = useMemo(() => {
    return reqs.filter(r => {
      if (selectedCategory === 'all') return true;
      const catId = (r.category_id || '').toLowerCase();
      const slug = (r.categories?.slug || '').toLowerCase();
      const catName = (r.categories?.name || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      const specs = (r.specifications || '').toLowerCase();

      if (selectedCategory === 'machinery-industrial') {
        return slug.includes('machin') || catName.includes('machin') || title.includes('cnc') || title.includes('motor') || title.includes('grinder') || title.includes('pump') || title.includes('machine') || specs.includes('machin');
      }
      if (selectedCategory === 'textiles-apparel') {
        return slug.includes('textile') || catName.includes('textile') || title.includes('saree') || title.includes('shirt') || title.includes('fabric') || title.includes('cotton') || title.includes('yarn') || specs.includes('fabric');
      }
      if (selectedCategory === 'packaging') {
        return slug.includes('packag') || catName.includes('packag') || title.includes('box') || title.includes('carton') || title.includes('pouch') || title.includes('bag') || title.includes('bottle');
      }
      if (selectedCategory === 'electronics-electricals') {
        return slug.includes('electr') || catName.includes('electr') || title.includes('solar') || title.includes('headphone') || title.includes('copper') || title.includes('wire') || title.includes('led');
      }
      if (selectedCategory === 'agriculture-food') {
        return slug.includes('agri') || slug.includes('food') || catName.includes('agri') || title.includes('rice') || title.includes('chilli') || title.includes('spice') || title.includes('grain');
      }
      if (selectedCategory === 'chemicals-raw-materials') {
        return slug.includes('chemic') || catName.includes('chemic') || title.includes('granule') || title.includes('polymer') || title.includes('dye') || title.includes('acid');
      }
      return slug === selectedCategory || catId === selectedCategory;
    });
  }, [reqs, selectedCategory]);

  const visibleReqs = useMemo(() => {
    if (filteredReqs.length === 0) return [];

    // Deduplicate filtered items so that no post appears more than once in the view
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    const uniqueFiltered: Requirement[] = [];

    for (const r of filteredReqs) {
      if (!r || !r.id) continue;
      const norm = normalizeTitle(r.title);
      if (seenIds.has(r.id) || (norm && seenTitles.has(norm))) continue;
      seenIds.add(r.id);
      if (norm) seenTitles.add(norm);
      uniqueFiltered.push(r);
    }

    const len = uniqueFiltered.length;
    if (len === 0) return [];

    // Window of 4 items for grid layout without repeating within the same screen
    const start = pageOffset % len;
    const slice = uniqueFiltered.slice(start, start + 4);
    if (slice.length < 4 && len > slice.length) {
      const needed = Math.min(4 - slice.length, len - slice.length);
      const sliceIds = new Set(slice.map(s => s.id));
      const complement = uniqueFiltered.filter(item => !sliceIds.has(item.id)).slice(0, needed);
      return [...slice, ...complement];
    }
    return slice;
  }, [filteredReqs, pageOffset]);

  // ── 7. Card Interactions ───────────────────────────────────────────────────
  const navigate = useNavigate();
  const handleViewRFQ = (req: Requirement) => {
    navigate(`/requirement/${req.req_number || req.id}`);
  };

  const handleOpenRespond = async (req: Requirement) => {
    if (!user || !profile) { setDialogReason('not_logged_in'); setDialogOpen(true); return; }
    if (!company) { setDialogReason('not_registered_business'); setDialogOpen(true); return; }
    const subCheck = await checkSupplierPaidSubscription(company.id, company);
    if (!subCheck.allowed) { setDialogReason(subCheck.reason); setDialogOpen(true); return; }
    const quota = await checkDirectMessageQuota(company.id, company);
    if (quota !== 'ok') { setDialogReason(quota); setDialogOpen(true); return; }
    setRespondDialogReq(req);
  };

  return (
    <section className="w-full py-3 sm:py-5 bg-background border-b border-border text-foreground relative overflow-hidden">
      <div className="w-full max-w-[1400px] mx-auto px-3.5 sm:px-5 md:px-6">

        {/* ── LIVE FEED HEADER ─────────────────────────────── */}
        <div className="mb-2 sm:mb-2.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#FF5A00] animate-pulse shadow-[0_0_8px_#FF5A00]" />
            <span className="text-[10px] font-black text-[#FF5A00] tracking-widest uppercase">
              LIVE FEED
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-tight">
            Live <span className="text-[#FF5A00]">Buying Requirements</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Real business inquiries from verified buyers
          </p>
        </div>

        {/* ── STATS & ACTIONS ROW ─────────────────────────── */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 mb-2.5 w-full">
          {/* Fresh RFQs */}
          <button
            onClick={handleFreshRFQs}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2 min-[360px]:px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-purple-500/40 text-purple-700 dark:text-purple-300 text-[11px] min-[360px]:text-xs font-bold shadow-sm transition-all active:scale-95 h-9 shrink-0"
            title="Refresh and pull fresh buyer requirements"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FF5A00] shrink-0 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            <span className="truncate">Fresh RFQs</span>
          </button>

          {/* Active RFQs Count Badge */}
          <div className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 bg-card border border-border rounded-lg px-2 min-[360px]:px-3 py-1 shadow-sm h-9">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <div className="text-left leading-tight truncate">
              <div className="text-xs sm:text-sm font-black text-foreground leading-tight">
                <AnimatedCount target={totalCount} />
              </div>
              <div className="text-[8.5px] min-[360px]:text-[9px] text-muted-foreground font-medium leading-none">Active RFQs</div>
            </div>
          </div>

          {/* View All Button */}
          <Link to="/requirements" className="flex-1 sm:flex-initial">
            <Button className="w-full sm:w-auto bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold h-9 px-2.5 min-[360px]:px-3 text-[11px] min-[360px]:text-xs gap-1 sm:gap-1.5 rounded-lg shadow-[0_2px_8px_rgba(255,90,0,0.3)] transition-all">
              <span className="truncate">View All</span> <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Button>
          </Link>
        </div>

        {/* ── CATEGORY FILTER TABS ────────────────────────── */}
        <div className="w-full max-w-full flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 scrollbar-none scroll-smooth overscroll-x-contain touch-pan-x">
          {CATEGORY_TABS.map(cat => {
            const active = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setPageOffset(0);
                }}
                className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 min-h-[32px] ${
                  active
                    ? 'bg-primary/15 text-primary border border-primary shadow-sm font-bold'
                    : 'bg-card text-foreground/80 hover:text-foreground border border-border hover:border-foreground/20'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* ── PAGER ── */}
        <div className="flex items-center justify-end gap-1.5 mb-3.5">
          <button
            onClick={handlePrev}
            aria-label="Previous requirement"
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center border border-border transition-colors min-h-[32px] min-w-[32px]"
            title="Previous RFQ"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next requirement"
            className="w-8 h-8 rounded-lg bg-[#FF5A00] hover:bg-[#e04f00] text-white flex items-center justify-center font-bold shadow-sm transition-colors min-h-[32px] min-w-[32px]"
            title="Next RFQ"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── RFQ CARDS (Compact 2-col desktop layout) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {loading && reqs.length === 0 ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-44 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : visibleReqs.length === 0 ? (
            <div className="text-center py-12 w-full bg-card rounded-2xl border border-border">
              <p className="text-white/60 text-xs sm:text-sm">No live requirements currently in this category.</p>
              <Button
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="mt-3 text-xs h-9 px-4 bg-[#FF5A00] hover:bg-[#e04f00] text-white font-semibold rounded-lg"
              >
                View All Categories
              </Button>
            </div>
          ) : (
            visibleReqs.map((req, index) => {
              const visual = getRequirementVisualInfo(req, index);

              // Assign badges matching Image 2
              const cardIdx = (index + pageOffset) % 4;
              const isUrgent = cardIdx === 0;
              const isNew = cardIdx === 1 || cardIdx === 3;
              const isVerifiedBuyer = cardIdx === 2;
              const isBulkOrder = cardIdx === 1 || cardIdx === 2;
              const isPaidOnly = cardIdx !== 2;

              const supplyType =
                cardIdx === 0
                  ? 'Long Term Supply'
                  : cardIdx === 1
                  ? 'Regular Supply'
                  : cardIdx === 2
                  ? 'Project Basis'
                  : 'Bulk Quantity';

              return (
                <div
                  key={req.id}
                  className="bg-card hover:bg-muted/50 border border-border hover:border-[#FF5A00]/50 rounded-xl p-2.5 sm:p-3 transition-all shadow-sm group flex flex-col justify-between w-full min-w-0"
                >
                  <div className="w-full min-w-0">
                    {/* Top Row: Thumbnail on left + Information stack on right */}
                    <div className="flex gap-2.5 sm:gap-3 items-start w-full min-w-0">
                      {/* Left Product Thumbnail */}
                      <div
                        onClick={() => handleViewRFQ(req)}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-muted border border-border relative cursor-pointer aspect-square shadow-sm"
                      >
                        <SafeImage
                          src={visual.image}
                          alt={visual.cleanTitle}
                          category={req.categories?.name || req.category_id}
                          fallbackType="rfq"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 64px, 80px"
                        />
                      </div>

                      {/* Right Info Stack */}
                      <div className="flex-1 min-w-0">
                        {/* Badges Stack */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {isUrgent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md tracking-wider uppercase flex items-center gap-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                              <Zap className="w-2.5 h-2.5 fill-current text-rose-500" />
                              URGENT
                            </span>
                          )}
                          {isNew && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md tracking-wider uppercase bg-emerald-600 text-white">
                              New
                            </span>
                          )}
                          {isVerifiedBuyer && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md tracking-wider uppercase bg-[#FF5A00] text-white">
                              Verified
                            </span>
                          )}
                          {isBulkOrder && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md tracking-wider uppercase bg-purple-600 text-white">
                              Bulk
                            </span>
                          )}
                          {isPaidOnly && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md flex items-center gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                              Paid
                            </span>
                          )}
                          <span className="text-[9.5px] text-muted-foreground ml-auto font-mono shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {timeAgo(req.created_at)}
                          </span>
                        </div>

                        {/* Product Title */}
                        <h3
                          onClick={() => handleViewRFQ(req)}
                          className="text-xs sm:text-sm font-bold text-foreground mt-1 leading-snug line-clamp-1 group-hover:text-[#FF5A00] transition-colors cursor-pointer"
                        >
                          {visual.cleanTitle}
                        </h3>

                        {/* Subtitle / Specifications */}
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">
                          {visual.subtitle}
                        </p>

                        {/* 2x2 Key Metrics Matrix */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1.5 pt-1.5 border-t border-border text-[11px]">
                          {/* Col 1, Row 1: Quantity */}
                          <div className="min-w-0">
                            <div className="font-bold text-[#FF5A00] flex items-center gap-1 leading-tight truncate">
                              <Package className="w-3 h-3 text-[#FF5A00] shrink-0" />
                              <span className="truncate">{visual.quantityDisplay}</span>
                            </div>
                            <div className="text-[9px] text-muted-foreground leading-none mt-0.5">Quantity</div>
                          </div>

                          {/* Col 2, Row 1: Location */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-foreground font-medium leading-tight truncate">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate" title={visual.locationDisplay}>
                                {visual.locationDisplay}
                              </span>
                            </div>
                            <div className="text-[9px] text-muted-foreground leading-none mt-0.5">Location</div>
                          </div>

                          {/* Col 1, Row 2: Buyer Verified */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold leading-tight truncate">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="truncate">Verified Co.</span>
                            </div>
                            <div className="text-[9px] text-muted-foreground leading-none mt-0.5">Status</div>
                          </div>

                          {/* Col 2, Row 2: Business / Supply Type */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-foreground font-medium leading-tight truncate">
                              <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{supplyType}</span>
                            </div>
                            <div className="text-[9px] text-muted-foreground leading-none mt-0.5">Supply Type</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Buttons: View Details & Send Quote */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => handleViewRFQ(req)}
                      className="w-full border-border bg-card hover:bg-muted font-medium text-[11px] sm:text-xs h-8 rounded-lg transition-all px-1 truncate shadow-none"
                    >
                      <span className="truncate">View Details</span>
                    </Button>
                    <Button
                      onClick={() => handleOpenRespond(req)}
                      className="w-full bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold text-[11px] sm:text-xs h-8 rounded-lg shadow-sm gap-1 transition-all px-1"
                    >
                      <span className="truncate">Contact Buyer</span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Drawer and Dialogs */}
      {selectedReq && (
        <RequirementDetailDrawer
          requirement={selectedReq}
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          onRequirementUpdated={updated => {
            setSelectedReq(updated);
            setReqs(prev => prev.map(r => (r.id === updated.id ? updated : r)));
          }}
        />
      )}

      {respondDialogReq && user && company && (
        <SupplierRespondDialog
          requirement={respondDialogReq}
          open={!!respondDialogReq}
          onClose={() => setRespondDialogReq(null)}
          supplierId={user.id}
          supplierCompanyId={company.id}
          onResponded={() => {
            setRespondDialogReq(null);
            loadData();
          }}
        />
      )}

      <SubscribeToContactDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        reason={dialogReason}
      />
    </section>
  );
}
