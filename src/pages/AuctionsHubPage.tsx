import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Gavel, ShoppingBag, Clock, Plus, Filter, Search, ShieldCheck,
  TrendingUp, MapPin, Users, ArrowRight, Zap, CheckCircle2, ChevronRight,
  Flame, Building2, Package, RefreshCw
} from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import CreateReverseAuctionDialog from '@/components/auctions/CreateReverseAuctionDialog';
import { assignDistinctAuctionImages, resolveAuctionImage } from '@/lib/auctionImageResolver';

interface AuctionItem {
  id: string;
  auction_number: string;
  auction_type: 'reverse' | 'forward';
  title: string;
  description: string;
  total_quantity: number;
  moq: number;
  quantity_unit: string;
  starting_price: number;
  reserve_price?: number;
  current_highest_bid: number | null;
  min_bid_increment: number;
  total_bids: number;
  highest_bidder_name?: string;
  end_time: string;
  status: string;
  delivery_location: string;
  images?: string[];
  manufacturer_name?: string;
  is_simulated?: true;
}

function applyTimers(list: AuctionItem[]): Record<string, number> {
  const now = Date.now();
  const timers: Record<string, number> = {};
  list.forEach((a) => {
    timers[a.id] = a.end_time
      ? Math.max(0, Math.floor((new Date(a.end_time).getTime() - now) / 1000))
      : 0;
  });
  return timers;
}

export default function AuctionsHubPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const isForwardRoute = location.pathname.includes('/forward');
  const [activeTab, setActiveTab] = useState<'reverse' | 'forward'>(isForwardRoute ? 'forward' : 'reverse');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'sold'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [relistData, setRelistData] = useState<any>(null);
  const [allAuctions, setAllAuctions] = useState<AuctionItem[]>([]);
  const [timeRemainings, setTimeRemainings] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadDbAuctions() {
      try {
        const { data, error } = await supabase
          .from('auctions')
          .select('*')
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        const mapped: AuctionItem[] = (!error && data ? data : []).map((d: any) => {
          const img = resolveAuctionImage({
            id: d.id,
            title: d.title || '',
            existing: d.images,
          });
          return {
            id: d.id,
            auction_number: d.auction_number,
            auction_type: d.auction_type === 'forward' ? 'forward' : 'reverse',
            title: d.title,
            description: d.description || '',
            total_quantity: d.total_quantity || 1,
            moq: d.moq || 1,
            quantity_unit: d.quantity_unit || 'Units',
            starting_price: Number(d.starting_price) || 0,
            current_highest_bid: d.current_highest_bid ? Number(d.current_highest_bid) : null,
            min_bid_increment: Number(d.min_bid_increment) || 10,
            total_bids: d.total_bids || 0,
            highest_bidder_name: d.highest_bidder_name,
            end_time: d.end_time || '',
            status: d.status || 'live',
            delivery_location: d.delivery_location || 'Pan-India',
            images: [img],
            manufacturer_name: d.manufacturer_name || undefined,
          };
        });

        const merged = assignDistinctAuctionImages(mapped as AuctionItem[]) as AuctionItem[];
        setAllAuctions(merged);
        setTimeRemainings(applyTimers(merged));
      } catch {
        if (isMounted) {
          setAllAuctions([]);
          setTimeRemainings({});
        }
      }
    }

    loadDbAuctions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update live countdown timers every second
  useEffect(() => {
    const updateTimers = () => {
      const now = Date.now();
      const updated: Record<string, number> = {};
      allAuctions.forEach((auc) => {
        const diff = Math.max(0, Math.floor((new Date(auc.end_time).getTime() - now) / 1000));
        updated[auc.id] = diff;
      });
      setTimeRemainings(updated);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [allAuctions]);

  function formatTime(sec?: number) {
    if (!sec || sec <= 0) return '00:00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Filter auctions
  const displayedAuctions = allAuctions
    .filter(auc => auc.auction_type === activeTab)
    .filter(auc => {
      const sec = timeRemainings[auc.id] ?? 2400;
      const isConcluded = sec <= 0 || auc.status === 'sold' || auc.status === 'concluded' || auc.status === 'completed' || auc.status === 'unsold';
      if (statusFilter === 'live') return !isConcluded;
      if (statusFilter === 'sold') return isConcluded;
      return true;
    })
    .filter(auc => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        auc.title.toLowerCase().includes(q) ||
        auc.auction_number.toLowerCase().includes(q) ||
        auc.delivery_location.toLowerCase().includes(q)
      );
    });

  return (
    <MainLayout>
      <div className="bg-background min-h-screen pb-20">
        
        {/* ── Hero Banner ── */}
        <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-black text-white py-8 sm:py-10 border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/30 text-xs font-bold mb-3">
                  <Flame className="w-3.5 h-3.5 fill-[#FF5A1F]" />
                  60-Minute Real-Time Bidding Auctions
                </div>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
                  60-Minute Live Reverse Auctions: Sell Your Bulk Product
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 mt-2 max-w-2xl">
                  A live reverse auction is when a manufacturer has a bulk product they want to sell within 60 minutes through real-time bidding.
                </p>
              </div>

              {/* Quick Action CTAs */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold text-xs sm:text-sm h-11 px-5 rounded-xl shadow-[0_3px_0_#922f00] flex items-center gap-1.5 transition-all active:translate-y-0.5 active:shadow-none"
                >
                  <Flame className="w-4 h-4 fill-white" />
                  ⚡ Sell Products in 24 Hours (Hot)
                </Button>
                <Link to="/post-requirement">
                  <Button
                    variant="ghost"
                    className="border border-[#FF5A00]/50 text-white hover:bg-[#FF5A00]/15 font-bold text-xs sm:text-sm h-11 px-5 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Post Sourcing RFQ
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Container ── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6">
          
          {/* Rules & Anti-Sniping Alert */}
          <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2.5 text-xs text-foreground">
              <ShieldCheck className="w-5 h-5 text-[#FF5A1F] shrink-0" />
              <span>
                <strong>Compulsory ₹5,000 60-Minute Subscription:</strong> Every auction requires a fixed ₹5,000 posting subscription with country-wise statutory tax (e.g., India 18% GST = ₹5,900) and verified tax invoice. Any qualifying bid in the final 120s adds +2 minutes anti-sniping.
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#FF5A1F] shrink-0">
              Verified Subscription Engine
            </span>
          </div>

          {/* Navigation Tabs (Reverse vs Forward) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-4 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setActiveTab('reverse');
                  navigate('/auctions/reverse');
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'reverse'
                    ? 'bg-[#FF5A1F] text-white shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Flame className="w-4 h-4 fill-current" />
                Live Reverse Auctions (60-Min Bulk Sales)
                <span className="px-1.5 py-0.2 text-[10px] rounded bg-white/20 text-white font-bold">
                  60-Min
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('forward');
                  navigate('/auctions/forward');
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'forward'
                    ? 'bg-[#FF5A1F] text-white shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Gavel className="w-4 h-4" />
                Forward Auctions (Machinery & Plants)
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setStatusFilter('live')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'live' ? 'bg-card text-[#FF5A1F] shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Live (Active Lots)
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('sold')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'sold' ? 'bg-card text-emerald-600 shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  History & Concluded
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  All Lots
                </button>
              </div>

              <div className="relative w-44 sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search lots..."
                  className="pl-9 h-9 rounded-xl text-xs bg-card"
                />
              </div>
            </div>
          </div>

          {/* Tab Description Banner */}
          {activeTab === 'reverse' && (
            <div className="mb-6 p-4 rounded-2xl bg-card border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  Live Manufacturer Reverse Auctions
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manufacturers have listed these bulk inventory lots for immediate sale within a 60-minute live bidding window. Buyers submit bids in real-time.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="shrink-0 text-xs bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-9 px-3.5 rounded-xl shadow-[0_2px_0_#922f00] flex items-center gap-1.5 transition-all active:translate-y-0.5"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                ⚡ List Product in 24h
              </Button>
            </div>
          )}

          {/* Auction Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedAuctions.map(auc => {
              const seconds = timeRemainings[auc.id] ?? 2400;
              const isSold = seconds <= 0 || auc.status === 'sold' || auc.status === 'concluded';
              const formattedTime = formatTime(seconds);
              const detailPath = auc.auction_type === 'reverse'
                ? `/auctions/reverse/${auc.id}`
                : `/auctions/forward/${auc.id}`;

              return (
                <div
                  key={auc.id}
                  className="bg-[#0e121b]/95 hover:bg-[#151a26] border border-slate-800/90 hover:border-[#FF5A00]/70 rounded-2xl overflow-hidden shadow-md hover:shadow-[0_12px_28px_rgba(255,90,0,0.22)] hover:-translate-y-1 transition-all flex flex-col backdrop-blur-md"
                >
                  {/* Top Image Banner */}
                  <div className="relative h-48 bg-muted overflow-hidden">
                    <SafeImage
                      src={
                        auc.images?.[0] ||
                        resolveAuctionImage({ id: auc.id, title: auc.title })
                      }
                      alt={auc.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    
                    {/* Status Pill & Auction ID */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      {isSold ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          SOLD OUT
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600 text-white flex items-center gap-1 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          LIVE 60-MIN
                        </span>
                      )}
                      <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-black/75 text-white backdrop-blur-sm">
                        {auc.auction_number}
                      </span>
                    </div>

                    {/* Dynamic Countdown Clock */}
                    <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-xl text-xs font-bold font-mono shadow-md backdrop-blur-md flex items-center gap-1.5 ${
                      isSold
                        ? 'bg-emerald-950/80 text-emerald-400'
                        : seconds <= 300
                        ? 'bg-red-600/90 text-white animate-pulse'
                        : 'bg-black/80 text-white'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {isSold ? 'Concluded' : formattedTime}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Manufacturer Name & Location */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span className="flex items-center gap-1 font-semibold text-foreground truncate max-w-[180px]">
                          <Building2 className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                          <span className="truncate">{auc.manufacturer_name || 'Verified Manufacturer'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{auc.delivery_location}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <Link to={detailPath}>
                        <h3 className="text-sm sm:text-base font-bold text-foreground hover:text-[#FF5A1F] transition-colors line-clamp-2 leading-snug">
                          {auc.title}
                        </h3>
                      </Link>

                      {/* Lot Size */}
                      <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-muted-foreground">
                        <Package className="w-3.5 h-3.5 text-[#FF5A1F]" />
                        <span>Bulk Lot: <strong>{auc.total_quantity.toLocaleString()} {auc.quantity_unit}</strong></span>
                        <span className="text-muted-foreground/60">• MOQ: {auc.moq}</span>
                      </div>

                      {/* Price Metrics Box */}
                      <div className="grid grid-cols-2 gap-2 mt-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <div>
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                            Starting Base Price
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                            ₹{auc.starting_price.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#FF5A1F] font-bold uppercase">
                            {isSold ? 'Final Winning Bid' : 'Current Leading Bid'}
                          </div>
                          <div className="text-sm sm:text-base font-bold text-[#FF5A1F] mt-0.5">
                            {auc.current_highest_bid !== null && auc.total_bids > 0
                              ? `₹${auc.current_highest_bid.toLocaleString('en-IN')}`
                              : 'No bids yet'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 mt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#FF5A1F]" />
                        <span>{auc.total_bids} Bids</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {isSold && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRelistData({
                                title: auc.title,
                                description: auc.description,
                                total_quantity: auc.total_quantity,
                                quantity_unit: auc.quantity_unit,
                                starting_price: auc.starting_price,
                                reserve_price: auc.reserve_price,
                                min_bid_increment: auc.min_bid_increment,
                                delivery_location: auc.delivery_location
                              });
                              setCreateDialogOpen(true);
                            }}
                            className="font-bold text-xs h-9 px-2.5 border-[#FF5A1F] text-[#FF5A1F] hover:bg-[#FF5A1F]/10 flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Re-list Lot</span>
                          </Button>
                        )}
                        <Link to={detailPath} className="shrink-0">
                          <Button
                            size="sm"
                            className={`font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1 shadow-sm ${
                              isSold
                                ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                : 'bg-[#FF5A1F] hover:bg-[#e04e17] text-white'
                            }`}
                          >
                            <span>{isSold ? 'View Lot' : 'Enter Live Room'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {displayedAuctions.length === 0 && (
            <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border p-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-bold text-foreground">No matching auctions</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No lots matching your filter criteria. Launch a new 60-minute bulk sale right now!
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="mt-4 bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-[0_2px_0_#922f00] flex items-center gap-1.5 transition-all active:translate-y-0.5"
              >
                <Flame className="w-3.5 h-3.5 mr-1" />
                ⚡ List Product in 24 Hours (Hot)
              </Button>
            </div>
          )}

        </div>

      </div>

      {/* Manufacturer Launch 60-Min Reverse Auction Dialog */}
      <CreateReverseAuctionDialog
        open={createDialogOpen}
        onOpenChange={(op) => {
          setCreateDialogOpen(op);
          if (!op) setRelistData(null);
        }}
        initialData={relistData}
      />
    </MainLayout>
  );
}
