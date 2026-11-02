import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame, Clock, MapPin, Users, ArrowRight,
  TrendingUp, CheckCircle2, ShieldCheck, ChevronRight, ChevronLeft,
  Pause, Play, RefreshCw, Sparkles
} from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import CreateReverseAuctionDialog from '@/components/auctions/CreateReverseAuctionDialog';
import { assignDistinctAuctionImages, resolveAuctionImage } from '@/lib/auctionImageResolver';

export interface ReverseAuctionCardItem {
  id: string;
  auctionNumber: string;
  auctionType: 'reverse' | 'forward';
  title: string;
  category: string;
  quantity: string;
  priceRange: string;
  location: string;
  quotedCount: number;
  initialSeconds: number;
  image: string;
}

const CYCLE_SECONDS = 25;
/** 3 roomier cards fit laptop screens better than a cramped 4-up row */
const ITEMS_PER_PAGE = 3;
const MAX_RAIL_SECONDS = 24 * 60 * 60;

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function friendlyCategory(raw: unknown, auctionType: 'reverse' | 'forward'): string {
  const value = String(raw || '').trim();
  if (!value || isUuidLike(value)) {
    return auctionType === 'forward' ? 'Surplus Liquidation' : 'Industrial Bulk';
  }
  return value;
}

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const capped = Math.min(totalSeconds, MAX_RAIL_SECONDS);
  const hours = Math.floor(capped / 3600);
  const minutes = Math.floor((capped % 3600) / 60);
  const seconds = capped % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function LiveReverseAuctionsRail() {
  const navigate = useNavigate();
  const [allAuctions, setAllAuctions] = useState<ReverseAuctionCardItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(CYCLE_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [timers, setTimers] = useState<Record<string, number>>(() => {
    const nextTimers: Record<string, number> = {};
    return nextTimers;
  });

  const totalPages = Math.max(1, Math.ceil(allAuctions.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [page, totalPages]);

  // Query live database auctions (synced with Auctions Hub)
  const fetchLiveAuctions = useCallback(async () => {
    try {
      setIsSyncing(true);
      const currentTime = Date.now();
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && data && data.length > 0) {
        // Only auctions that are running right now
        const listToMap = data.filter((d: any) =>
          (d.status === 'live' || d.status === 'closing_soon') && d.end_time && new Date(d.end_time).getTime() > currentTime
        );

        const mappedFromDb: ReverseAuctionCardItem[] = listToMap.map((d: any, idx: number) => {
          const end = d.end_time ? new Date(d.end_time).getTime() : 0;
          const remaining = Math.max(0, Math.floor((end - currentTime) / 1000));

          const auctionType: 'reverse' | 'forward' = d.auction_type === 'forward' ? 'forward' : 'reverse';
          const defaultImg = auctionType === 'forward'
            ? 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80'
            : 'https://cdn.pixabay.com/photo/2016/11/29/09/32/welding-1868731_1280.jpg';

          const auctionNumber = String(d.auction_number || '').trim();
          const safeNumber =
            auctionNumber && !isUuidLike(auctionNumber)
              ? auctionNumber
              : `AUC-${String(d.id).replace(/-/g, '').slice(0, 6).toUpperCase()}`;

          return {
            id: d.id,
            auctionNumber: safeNumber,
            auctionType,
            title: d.title,
            category: friendlyCategory(d.category_name || d.category || d.category_id, auctionType),
            quantity: d.total_quantity ? `${d.total_quantity.toLocaleString()} ${d.quantity_unit || 'Units'}` : 'Bulk Lot',
            priceRange: d.starting_price
              ? `₹${Number(d.starting_price).toLocaleString('en-IN')} / ${d.quantity_unit || 'unit'}`
              : 'Competitive Bidding',
            location: d.delivery_location || 'Pan-India',
            quotedCount: Number(d.total_bids) || 0,
            initialSeconds: remaining,
            image: resolveAuctionImage({
              id: d.id,
              title: d.title || '',
              existing: d.images?.[0] || defaultImg,
            }),
          };
        });

        const merged = assignDistinctAuctionImages(mappedFromDb);
        setAllAuctions(merged);
        const nextTimers: Record<string, number> = {};
        merged.forEach((a) => {
          nextTimers[a.id] = a.initialSeconds;
        });
        setTimers(nextTimers);
      } else {
        setAllAuctions([]);
        setTimers({});
      }
    } catch (err) {
      console.error('Error fetching live auctions for 24h rail:', err);
      setAllAuctions([]);
      setTimers({});
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveAuctions();
  }, [fetchLiveAuctions]);

  // Main 25-Second Auto-Rotation Loop
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPaused || isHovered) return;

      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Advance to next page and trigger background live refresh
          setPage(currPage => (currPage + 1) % totalPages);
          fetchLiveAuctions();
          return CYCLE_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isHovered, totalPages, fetchLiveAuctions]);

  // Real-time Auction Lot Expiry Countdown Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const next: Record<string, number> = {};
        Object.keys(prev).forEach(key => {
          next[key] = Math.max(0, prev[key] - 1);
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleNextPage = () => {
    setPage(p => (p + 1) % totalPages);
    setSecondsRemaining(CYCLE_SECONDS);
  };

  const handlePrevPage = () => {
    setPage(p => (p - 1 + totalPages) % totalPages);
    setSecondsRemaining(CYCLE_SECONDS);
  };

  const handleSelectPage = (targetIndex: number) => {
    setPage(targetIndex);
    setSecondsRemaining(CYCLE_SECONDS);
  };

  // Compute current visible 4 cards
  const startIndex = page * ITEMS_PER_PAGE;
  const currentAuctions = allAuctions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  // Fill if less than 4
  const displayAuctions = currentAuctions.length === ITEMS_PER_PAGE
    ? currentAuctions
    : allAuctions.slice(0, ITEMS_PER_PAGE);

  const progressPercent = ((CYCLE_SECONDS - secondsRemaining) / CYCLE_SECONDS) * 100;

  // No running auctions in the database: the section is left out rather than filled with invented ones
  if (!isSyncing && allAuctions.length === 0) return null;

  return (
    <section
      className="relative z-20 max-w-[1400px] mx-auto w-full px-4 sm:px-5 md:px-6 mb-8 sm:mb-12"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header — wraps cleanly on laptop widths */}
      <div className="flex flex-col gap-3 mb-3 sm:mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Flame className="w-4 h-4 text-[#FF5A00] animate-bounce shrink-0" />
          <h2 className="text-xs sm:text-sm font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
            Sell Products in 24 Hours
            <span className="text-[#FF5A00] font-black bg-[#FF5A00]/15 px-1.5 py-0.5 rounded text-[10px] border border-[#FF5A00]/30">
              HOT
            </span>
          </h2>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF5A00]/15 border border-[#FF5A00]/30 text-white text-[11px] font-medium">
            <RefreshCw className={`w-3 h-3 text-[#FF5A00] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isHovered ? (
                <span className="text-amber-400 font-semibold">Paused on hover</span>
              ) : isPaused ? (
                <span className="text-amber-400 font-semibold">Feed Paused</span>
              ) : (
                <span>
                  Next batch in <strong className="text-[#FF5A00] font-mono font-bold">{secondsRemaining}s</strong>
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? 'Resume 25s auto-cycle' : 'Pause 25s auto-cycle'}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-700/80"
            title={isPaused ? 'Resume auto rotation' : 'Pause auto rotation'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1.5 px-1 max-w-[140px] overflow-hidden">
            {Array.from({ length: Math.min(totalPages, 8) }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPage(idx)}
                aria-label={`Jump to auction batch ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 shrink-0 ${
                  idx === page
                    ? 'w-5 bg-[#FF5A00] shadow-[0_0_8px_rgba(255,90,0,0.6)]'
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevPage}
              aria-label="Previous auction batch"
              className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-700/80 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              aria-label="Next auction batch"
              className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-slate-700/80 active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <Button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#FF5A00] hover:bg-[#e04e00] text-white text-xs font-bold h-8 px-3 rounded-xl shadow-[0_2px_0_#922f00] flex items-center gap-1.5 shrink-0 transition-all active:translate-y-0.5 active:shadow-none"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden min-[420px]:inline">List Product in 24h</span>
            <span className="min-[420px]:hidden">List 24h</span>
          </Button>

          <Link
            to="/auctions"
            className="text-xs sm:text-sm font-bold text-[#FF5A00] hover:text-[#e04e00] flex items-center gap-1 transition-colors group shrink-0"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-[#FF5A00] to-orange-400 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3 equal cards on desktop — readable on laptop; swipe on mobile */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0"
        >
          {displayAuctions.map((auction) => {
            const timeLeft = timers[auction.id] !== undefined ? timers[auction.id] : auction.initialSeconds;

            return (
              <div
                key={auction.id}
                role="link"
                tabIndex={0}
                onClick={() =>
                  navigate(
                    `/auctions/${auction.auctionType === 'forward' ? 'forward' : 'reverse'}/${auction.id}`
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(
                      `/auctions/${auction.auctionType === 'forward' ? 'forward' : 'reverse'}/${auction.id}`
                    );
                  }
                }}
                className="snap-start shrink-0 w-[78vw] max-w-[320px] sm:w-auto sm:max-w-none group bg-slate-900/85 hover:bg-slate-900 border border-slate-800/90 hover:border-[#FF5A00]/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer min-h-0"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950 shrink-0">
                  <SafeImage
                    src={auction.image}
                    alt={auction.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1.5 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-extrabold flex items-center gap-1 shadow-sm shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white border border-slate-700/80 font-mono flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-[#FF5A1F]" />
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-md bg-black/60 text-slate-300 font-mono text-[9px] truncate max-w-[38%]">
                      {auction.auctionNumber}
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 max-w-[75%]">
                    <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-slate-200 border border-slate-700/60 text-[10px] font-semibold truncate inline-block max-w-full">
                      {auction.category}
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between gap-2.5 min-w-0">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm group-hover:text-[#FF5A1F] transition-colors line-clamp-2 leading-snug">
                      {auction.title}
                    </h3>
                    <div className="text-xs text-slate-300 font-medium mt-1 truncate">
                      {auction.quantity}
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-[#FF5A1F] mt-1 truncate">
                      {auction.priceRange}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 gap-2">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <MapPin className="w-3 h-3 text-[#FF5A1F] shrink-0" />
                      <span className="truncate">{auction.location}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-slate-200 shrink-0">
                      <Users className="w-3 h-3 text-[#FF5A1F]" />
                      <span>{auction.quotedCount} Quoted</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Mobile Indicator Footer with Batch Label */}
      {allAuctions.length > 0 && (
        <div className="flex md:hidden items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span>Batch {page + 1} of {totalPages} ({allAuctions.length} live auctions)</span>
          <span className="text-[#FF5A00] font-medium">Swipe to browse cards</span>
        </div>
      )}

      {/* 24-Hour Product Listing Dialog */}
      <CreateReverseAuctionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          fetchLiveAuctions();
        }}
      />
    </section>
  );
}
