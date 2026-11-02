import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Gavel, Clock, ShieldCheck, ArrowLeft, TrendingUp, Users, CheckCircle2,
  AlertCircle, Share2, Heart, Download, FileText, Check, DollarSign,
  Package, MapPin, Truck, RefreshCw, Flame, Building2, MessageSquare,
  Sparkles, Award, ChevronRight, ShoppingCart, Receipt, Maximize2, Minimize2,
  Lock, LogIn, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import SafeImage from '@/components/common/SafeImage';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import BidderProfileModal, { type BidderCompany } from '@/components/auctions/BidderProfileModal';
import AuctionLiveChat from '@/components/auctions/AuctionLiveChat';
import ProtectedContact from '@/components/common/ProtectedContact';
import {
  getSimulatedAuctionById,
  getSimulatedBidHistory,
  isSimulatedAuctionId,
} from '@/data/simulatedLiveAuctions';

interface BidRecord {
  id: string;
  bidder_name: string;
  bid_amount: number;
  quantity: number;
  timestamp: string;
  status: 'accepted' | 'outbid' | 'winning';
  contact_phone?: string;
  bidder_company_id?: string | null;
}

/** The name a bid was recorded under. Never invents a verified-looking label when there is none. */
const bidderLabel = (row: any): string => row?.bidder_name || row?.bidder_company_name || 'Bidder';


export default function ForwardAuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, company, buyerProfile } = useAuth();

  // Selected Auction State
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'bids' | 'chat' | 'quotes'>('bids');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // Bidder Profile Modal State
  const [selectedBidder, setSelectedBidder] = useState<{ name: string; companyId: string | null } | null>(null);
  const [bidderCompanies, setBidderCompanies] = useState<Record<string, BidderCompany>>({});
  const [bidderModalOpen, setBidderModalOpen] = useState(false);

  // Live countdown timer state (seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isSoldConcluded, setIsSoldConcluded] = useState<boolean>(false);

  const [bidHistory, setBidHistory] = useState<BidRecord[]>([]);

  // Reliable Back Button Handler
  const handleBackNavigation = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/auctions/reverse');
    }
  };

  // Load auction from database by id (or local simulation seed)
  useEffect(() => {
    let isMounted = true;
    async function loadAuctionData() {
      if (!id) return;
      setLoading(true);

      try {
        if (isSimulatedAuctionId(id)) {
          const sim = getSimulatedAuctionById(id);
          if (sim && isMounted) {
            const remSec = Math.max(
              0,
              Math.floor((new Date(sim.end_time).getTime() - Date.now()) / 1000)
            );
            setSecondsRemaining(remSec);
            setIsSoldConcluded(false);
            setAuction({
              ...sim,
              specifications: {
                note: 'Temporary sample lot for live-board demonstration. No personal seller identity is shown.',
              },
              manufacturer_name: sim.manufacturer_name,
            });
            setBidHistory(
              getSimulatedBidHistory(sim).map((b) => ({
                ...b,
                timestamp: new Date(b.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }))
            );
            setQuotations([]);
          } else if (isMounted) {
            setAuction(null);
          }
          if (isMounted) setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('auctions')
          .select('*')
          .or(`id.eq.${id},auction_number.eq.${id}`)
          .maybeSingle();

        if (!error && data && isMounted) {
          const now = Date.now();
          let remSec = 45 * 60;
          if (data.end_time) {
            remSec = Math.max(0, Math.floor((new Date(data.end_time).getTime() - now) / 1000));
          }
          setSecondsRemaining(remSec);
          setIsSoldConcluded(remSec <= 0 || data.status === 'concluded' || data.status === 'sold');

          // Fetch real bids from auction_bids table first to determine leading bid
          const { data: bidsData } = await supabase
            .from('auction_bids')
            .select('*')
            .eq('auction_id', data.id)
            .order('created_at', { ascending: false });

          const hasRealBids = Boolean(bidsData && bidsData.length > 0);
          const realLeadingBid = hasRealBids ? Number(bidsData![0].bid_amount) : null;
          const realLeadingBidder = hasRealBids ? bidderLabel(bidsData![0]) : null;

          // Real company records behind the bids and the listing, so profile pop-ups show stored facts only
          const companyIds = [...new Set([...(bidsData ?? []).map((b: any) => b.bidder_company_id), data.seller_company_id].filter(Boolean))] as string[];
          let companyMap: Record<string, BidderCompany> = {};
          if (companyIds.length > 0) {
            const { data: companyRows } = await supabase
              .from('companies')
              .select('id, company_name, business_type, city, state, country, verification_status, created_at, rating_avg, contact_phone, annual_turnover')
              .in('id', companyIds);
            companyMap = Object.fromEntries((companyRows ?? []).map((c: any) => [c.id, c as BidderCompany]));
            if (isMounted) setBidderCompanies(companyMap);
          }

          setAuction({
            ...data,
            auction_type: data.auction_type || 'reverse',
            title: data.title,
            starting_price: Number(data.starting_price) || 0,
            current_highest_bid: realLeadingBid,
            highest_bidder_name: realLeadingBidder || data.highest_bidder_name || '',
            highest_bidder_company_id: hasRealBids ? bidsData![0].bidder_company_id ?? null : null,
            min_bid_increment: Number(data.min_bid_increment) || 1,
            total_quantity: Number(data.total_quantity) || 1,
            quantity_unit: data.quantity_unit || 'Units',
            images: data.images?.length ? data.images : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800'],
            specifications: data.specifications || {},
            manufacturer_name: companyMap[data.seller_company_id]?.company_name || 'Seller'
          });

          if (hasRealBids && isMounted) {
            setBidHistory(bidsData!.map((b: any, idx: number) => ({
              id: b.id,
              bidder_name: bidderLabel(b),
              bidder_company_id: b.bidder_company_id ?? null,
              bid_amount: Number(b.bid_amount),
              quantity: Number(b.quantity) || data.total_quantity,
              timestamp: new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: idx === 0 ? 'winning' : 'outbid',
              contact_phone: companyMap[b.bidder_company_id]?.contact_phone || undefined
            })));
          } else if (isMounted) {
            setBidHistory([]);
          }

          // Fetch real supplier quotations from database for this tender/auction
          const { data: quoteData } = await supabase
            .from('quotations')
            .select('*')
            .or(`rfq_id.eq.${data.id},rfq_id.eq.${data.requirement_id || data.id}`)
            .order('created_at', { ascending: false });

          if (quoteData && quoteData.length > 0 && isMounted) {
            setQuotations(quoteData.map((q: any) => ({
              id: q.id,
              supplier_name: q.supplier_name || 'Supplier',
              supplier_location: q.supplier_location || 'India',
              unit_price: Number(q.unit_price) || Number(q.price_per_unit) || 0,
              moq: Number(q.moq) || Number(data.total_quantity) || 1000,
              lead_time_days: Number(q.lead_time_days) || 7,
              gst_percent: Number(q.gst_rate) || 18,
              freight_included: Boolean(q.freight_included),
              validity_days: Number(q.validity_days) || 14,
              rating: Number(q.rating) > 0 ? Number(q.rating) : null,
              is_shortlisted: Boolean(q.is_shortlisted),
              status: q.status || 'active',
              submitted_at: q.created_at ? new Date(q.created_at).toLocaleDateString() : 'Active'
            })));
          } else if (isMounted) {
            setQuotations([]);
          }
        } else if (isMounted) {
          setAuction(null);
        }
      } catch (err) {
        console.warn('Error loading auction data:', err);
        if (isMounted) setAuction(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAuctionData();

    if (isSimulatedAuctionId(id)) {
      const simTick = setInterval(() => {
        if (!isMounted || !id) return;
        const sim = getSimulatedAuctionById(id);
        if (!sim) return;
        const remSec = Math.max(
          0,
          Math.floor((new Date(sim.end_time).getTime() - Date.now()) / 1000)
        );
        setSecondsRemaining(remSec);
        setIsSoldConcluded(false);
        setAuction((prev: any) =>
          prev
            ? {
                ...prev,
                ...sim,
                manufacturer_name: sim.manufacturer_name,
              }
            : prev
        );
        setBidHistory(
          getSimulatedBidHistory(sim).map((b) => ({
            ...b,
            timestamp: new Date(b.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }))
        );
      }, 8000);

      return () => {
        isMounted = false;
        clearInterval(simTick);
      };
    }

    // Setup Realtime Sync for incoming bids on this auction
    const bidsChannel = supabase
      .channel(`live_bids_sync_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_bids'
        },
        (payload: any) => {
          if (payload.new && (payload.new.auction_id === id || payload.new.auction_id === auction?.id)) {
            const newBid = payload.new;
            setBidHistory(prev => [
              {
                id: newBid.id,
                bidder_name: bidderLabel(newBid),
                bidder_company_id: newBid.bidder_company_id ?? null,
                bid_amount: Number(newBid.bid_amount),
                quantity: Number(newBid.quantity) || 1,
                timestamp: new Date(newBid.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'winning'
              },
              ...prev.map(b => ({ ...b, status: 'outbid' as const }))
            ]);

            setAuction((prev: any) => prev ? ({
              ...prev,
              current_highest_bid: Number(newBid.bid_amount),
              highest_bidder_name: bidderLabel(newBid),
              highest_bidder_company_id: newBid.bidder_company_id ?? null,
              total_bids: (prev.total_bids || 0) + 1
            }) : prev);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(bidsChannel);
    };
  }, [id]);

  // State for Supplier Quotations & Purchase Order Award Modal
  const [quotations, setQuotations] = useState<any[]>([]);
  const [selectedQuoteForAward, setSelectedQuoteForAward] = useState<any | null>(null);
  const [awardOrderDialogOpen, setAwardOrderDialogOpen] = useState(false);
  const [isAwardingOrder, setIsAwardingOrder] = useState(false);

  // Supplier quote submission fields
  const [quoteUnitPrice, setQuoteUnitPrice] = useState<string>('');
  const [quoteMoq, setQuoteMoq] = useState<number>(1000);
  const [quoteLeadTime, setQuoteLeadTime] = useState<number>(7);
  const [quoteFreight, setQuoteFreight] = useState<'included' | 'extra'>('included');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const isBuyerRole = !profile?.role || profile?.role === 'buyer' || company?.business_type !== 'manufacturer';

  const handleToggleShortlist = async (quoteId: string) => {
    if (!user) {
      toast.error('Authentication Required: Please sign in to shortlist quotations.');
      setAuthDialogOpen(true);
      return;
    }
    if (!isBuyerRole) {
      toast.error('Only authenticated buyers can shortlist supplier quotations.');
      return;
    }

    setQuotations(prev => prev.map(q => q.id === quoteId ? { ...q, is_shortlisted: !q.is_shortlisted } : q));
    toast.success('Supplier quotation status updated!');
    try {
      await supabase.from('quotations').update({ is_shortlisted: true }).eq('id', quoteId);
    } catch {
      // safe fallback
    }
  };

  const handleOpenAwardDialog = (quote: any) => {
    if (!user) {
      toast.error('Authentication Required: Please sign in to accept quotations and award purchase orders.');
      setAuthDialogOpen(true);
      return;
    }
    if (!isBuyerRole) {
      toast.error('Only verified buyers can accept quotations and award purchase orders.');
      return;
    }
    setSelectedQuoteForAward(quote);
    setAwardOrderDialogOpen(true);
  };

  const handleConfirmAwardOrder = async () => {
    if (!user) {
      toast.error('Authentication Required: You must be signed in as a verified buyer.');
      setAuthDialogOpen(true);
      return;
    }
    if (!selectedQuoteForAward) return;
    if (isSoldConcluded) {
      toast.error('Auction is already closed.');
      return;
    }

    setIsAwardingOrder(true);
    try {
      const poNum = `PO-${auction.auction_number || 'AUCT'}-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalAmount = Number(selectedQuoteForAward.unit_price) * Number(auction.total_quantity);
      const gstAmount = Math.round(totalAmount * ((Number(selectedQuoteForAward.gst_percent) || 18) / 100));

      await supabase.from('orders').insert({
        order_number: poNum,
        buyer_id: user.id,
        seller_company_id: auction.seller_company_id || null,
        total_amount: totalAmount + gstAmount,
        tax_amount: gstAmount,
        status: 'pending_payment',
        payment_status: 'pending',
        notes: `Awarded from 60-Minute Reverse Auction ${auction.auction_number} to ${selectedQuoteForAward.supplier_name}`
      });

      setIsAwardingOrder(false);
      setAwardOrderDialogOpen(false);
      setIsSoldConcluded(true);
      toast.success(`Purchase Order Generated! (${poNum})`, {
        description: `Order officially awarded to ${selectedQuoteForAward.supplier_name} at ₹${selectedQuoteForAward.unit_price}/${auction.quantity_unit}. Contract released to Escrow.`
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to award Purchase Order');
      setIsAwardingOrder(false);
    }
  };

  const handleSubmitSupplierQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Authentication Required: Please sign in as a manufacturer to submit quotations.');
      setAuthDialogOpen(true);
      return;
    }

    const priceNum = parseFloat(quoteUnitPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid quotation unit price.');
      return;
    }

    setIsSubmittingQuote(true);
    try {
      const supplierName = company?.company_name || profile?.full_name || 'Your company (You)';
      const newQ = {
        id: `quote-${Date.now()}`,
        supplier_name: supplierName,
        supplier_location: company?.city ? `${company.city}, ${company.state || 'India'}` : 'Direct Factory Quotation',
        unit_price: priceNum,
        moq: quoteMoq,
        lead_time_days: quoteLeadTime,
        gst_percent: 18,
        freight_included: quoteFreight === 'included',
        validity_days: 14,
        rating: 5.0,
        is_shortlisted: false,
        status: 'active',
        submitted_at: 'Just now'
      };

      setQuotations(prev => [newQ, ...prev]);
      setActiveTab('quotes');
      toast.success(`Quotation of ₹${priceNum}/${auction.quantity_unit} submitted successfully!`, {
        description: 'The buyer has been notified and can now review and award your quotation.'
      });
      setQuoteUnitPrice('');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Form bid calculation - Fix Bug 5: Initial State is EMPTY string, not 0!
  const [bidInput, setBidInput] = useState<string>('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [isFullPageChat, setIsFullPageChat] = useState(false);

  // Robust Numeric Input Handler: prevents "0100" and "069" bugs
  const handleBidInputChange = (raw: string) => {
    // allow only digits and decimal point
    let clean = raw.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    // strip leading zeros: "0100" -> "100", "069" -> "69", but keep "0."
    if (clean.length > 1 && clean.startsWith('0') && !clean.startsWith('0.')) {
      clean = clean.replace(/^0+/, '');
    }
    setBidInput(clean);
  };

  // Quick increment buttons (+₹1, +₹2, +₹5): calculate numerically from current valid bid value
  const handleQuickIncrement = (inc: number) => {
    const currentTyped = parseFloat(bidInput);
    const base = (!isNaN(currentTyped) && currentTyped > 0)
      ? currentTyped
      : (Number(auction?.current_highest_bid) || Number(auction?.starting_price) || 0);

    const calculated = Math.round((base + inc) * 100) / 100;
    setBidInput(calculated.toString());
  };

  // Dynamic Total Order Value Calculations:
  // If empty or invalid: Gross = —, GST = —, Total = — (Never show misleading ₹0)
  const parsedBid = parseFloat(bidInput);
  const isValidBidPrice = !isNaN(parsedBid) && parsedBid > 0;
  const lotTotalQuantity = Number(auction?.total_quantity) || 0;
  const grossLotOrderValue = (isValidBidPrice && lotTotalQuantity > 0)
    ? parsedBid * lotTotalQuantity
    : null;
  const gstAmount = grossLotOrderValue !== null ? Math.round(grossLotOrderValue * 0.18) : null;
  const totalWithGst = (grossLotOrderValue !== null && gstAmount !== null)
    ? grossLotOrderValue + gstAmount
    : null;

  // Minimum allowed bid for validation
  const minAllowedBid = (Number(auction?.current_highest_bid) > 0)
    ? Number(auction?.current_highest_bid) + (Number(auction?.min_bid_increment) || 1)
    : (Number(auction?.starting_price) || 1);

  // Active bidders count derived strictly from real bids
  const activeBiddersCount = new Set(bidHistory.map(b => b.bidder_name.replace(' (You)', ''))).size;

  // Countdown timer ticker & auto-conclusion when server end_time expires
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          setIsSoldConcluded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Place Bid Handler
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSoldConcluded || secondsRemaining <= 0) {
      toast.error('Auction Closed: Bidding has concluded for this lot.');
      return;
    }

    // Strict Authentication Guard
    if (!user) {
      setAuthDialogOpen(true);
      toast.error('Authentication Required: Please sign in to participate in the auction.');
      return;
    }

    if (!isBuyerRole) {
      toast.error('Only verified enterprise buyers can place bids in this auction.');
      return;
    }

    const numericBid = parseFloat(bidInput);
    if (isNaN(numericBid) || numericBid <= 0) {
      toast.error('Please enter a valid bid amount.');
      return;
    }

    if (numericBid < minAllowedBid) {
      toast.error(`Minimum allowed bid is ₹${minAllowedBid.toLocaleString('en-IN')} per ${auction.quantity_unit}.`);
      return;
    }

    setSubmittingBid(true);
    try {
      const authenticatedBidderName =
        (profile?.full_name && profile.full_name.trim().length > 0)
          ? profile.full_name.trim()
          : (buyerProfile?.company_name && buyerProfile.company_name.trim().length > 0)
          ? buyerProfile.company_name.trim()
          : (company?.company_name && company.company_name.trim().length > 0)
          ? company.company_name.trim()
          : (user?.email?.split('@')[0] || 'Bidder');

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auction.id);
      if (isUUID) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('place_forward_bid', {
            p_auction_id: auction.id,
            p_bid_amount: numericBid,
            p_quantity: auction.total_quantity,
            p_bidder_company_name: authenticatedBidderName
          });

          if (rpcErr) {
            const { error: insertErr } = await supabase.from('auction_bids').insert({
              auction_id: auction.id,
              bidder_user_id: user?.id,
              bidder_name: authenticatedBidderName,
              bid_amount: numericBid,
              quantity: auction.total_quantity,
              status: 'valid'
            });
            if (insertErr) {
              toast.error(insertErr.message || 'Your bid could not be recorded. Please try again.');
              return;
            }
          } else if (rpcRes && rpcRes.anti_sniping_extended) {
            setSecondsRemaining(prev => prev + 120);
            toast.info('⚡ Anti-Sniping triggered: Auction extended by +2 minutes!');
          }
        } catch (dbErr: any) {
          toast.error(dbErr?.message || 'Your bid could not be recorded. Please try again.');
          return;
        }
      } else {
        // Anti-sniping check
        if (secondsRemaining <= 120 && auction.anti_sniping_enabled) {
          setSecondsRemaining(prev => prev + 120);
          toast.info('⚡ Anti-Sniping triggered: Auction extended by +2 minutes!');
        }
      }

      const newBid: BidRecord = {
        id: `bid-${Date.now()}`,
        bidder_name: `${authenticatedBidderName} (You)`,
        bid_amount: numericBid,
        quantity: auction.total_quantity,
        timestamp: 'Just now',
        status: 'winning',
        contact_phone: (profile as any)?.phone || undefined
      };

      setBidHistory(prev => [newBid, ...prev.map(b => ({ ...b, status: 'outbid' as const }))]);
      setAuction((prev: any) => ({
        ...prev,
        current_highest_bid: numericBid,
        total_bids: (prev.total_bids || 0) + 1,
        highest_bidder_name: `${authenticatedBidderName} (Your Active Bid)`
      }));

      toast.success(`Live Bid of ₹${numericBid.toLocaleString('en-IN')} recorded! You currently hold the leading bid.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to place bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  // Open Bidder Profile Modal
  const handleOpenBidder = (name: string, companyId?: string | null) => {
    // Chat messages only carry a name; match it against the companies already loaded for this lot.
    const plainName = name.replace(/\s*\((You|Your Active Bid)\)/gi, '').trim().toLowerCase();
    const resolvedId = companyId
      ?? Object.values(bidderCompanies).find((c) => c.company_name.trim().toLowerCase() === plainName)?.id
      ?? null;
    setSelectedBidder({ name, companyId: resolvedId });
    setBidderModalOpen(true);
  };

  // Switch to Next Live Auction Lot
  const handleSwitchToNextLot = () => {
    navigate('/auctions');
  };

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isReverse = auction?.auction_type === 'reverse';

  if (loading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FF5A1F] mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Loading real-time auction lot...</p>
        </div>
      </MainLayout>
    );
  }

  if (!auction) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-md mx-auto">
          <Gavel className="w-12 h-12 text-muted-foreground/60 mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-1">Auction Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This live auction does not exist or has already concluded.
          </p>
          <Link to="/auctions">
            <Button className="bg-[#FF5A1F] hover:bg-[#e04f00] text-white">
              Browse Live Auctions
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-background pb-6">
        
        {/* ── Top Fixed Navigation Bar & Safe Back Button ── */}
        <div className="bg-card border-b border-border sticky top-0 z-20 px-4 py-2.5 sm:px-6">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackNavigation}
                className="h-9 px-2 text-foreground hover:bg-muted font-bold text-xs flex items-center gap-1 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-[#FF5A1F]" />
                <span className="hidden sm:inline">Back to Auctions</span>
                <span className="sm:hidden">Back</span>
              </Button>

              <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />

              {/* Breadcrumb Navigation */}
              <nav className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                <Link to="/" className="hover:text-foreground">Home</Link>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <Link to="/auctions/reverse" className="hover:text-foreground">60-Min Reverse Auctions</Link>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <span className="font-semibold text-foreground truncate max-w-[280px]">
                  {auction.auction_number}
                </span>
              </nav>
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Full Page Chat Toggle Button */}
              <Button
                variant={isFullPageChat ? "default" : "outline"}
                size="sm"
                onClick={() => setIsFullPageChat(!isFullPageChat)}
                className={`h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  isFullPageChat
                    ? 'bg-[#FF5A1F] text-white hover:bg-[#e04f1a] shadow-sm'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                {isFullPageChat ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exit Full Page</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span className="hidden sm:inline">Full Page Chat</span>
                  </>
                )}
              </Button>

              {/* Developer shortcut that fakes the last 5 seconds of the countdown. Never shown on the live site. */}
              {import.meta.env.DEV && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSecondsRemaining(5);
                    toast.info('Simulating final 5 seconds to test 60-min SOLD conclusion!');
                  }}
                  className="h-8 text-[11px] font-semibold border-orange-200 dark:border-orange-900 text-[#FF5A1F] hidden sm:flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" /> Test Expiration
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  toast.success('Auction room link copied to clipboard');
                }}
                className="h-8 px-2.5 rounded-xl text-xs"
              >
                <Share2 className="w-3.5 h-3.5 mr-1" /> Share
              </Button>
            </div>
          </div>
        </div>

        {/* ── Main Container (Balanced Responsive Alignment or Full Page Chat) ── */}
        {isFullPageChat ? (
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-4">
            {/* Top Compact Lot Summary & Quick Bid Bar */}
            <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted border border-border shrink-0">
                  <SafeImage
                    src={auction.images?.[0] || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&q=80'}
                    alt={auction.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5A1F] text-white">
                      60-Min Live Auction
                    </span>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground">
                      {auction.auction_number}
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[9px]">
                      Verified Manufacturer
                    </Badge>
                  </div>
                  <h1 className="text-sm sm:text-base font-bold text-foreground truncate max-w-[500px]">
                    {auction.title}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Lot Size: {auction.total_quantity?.toLocaleString('en-IN')} {auction.unit} • {auction.city}, {auction.state}
                  </p>
                </div>
              </div>

              {/* Status & Quick Bid Form */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {/* Timer */}
                <div className="px-3.5 py-1.5 rounded-2xl bg-orange-50 dark:bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FF5A1F] animate-pulse" />
                  <div>
                    <div className="text-[9px] font-semibold text-muted-foreground uppercase">Countdown</div>
                    <div className="text-xs sm:text-sm font-black font-mono text-[#FF5A1F]">
                      {formattedTime}
                    </div>
                  </div>
                </div>

                {/* Leading Bid */}
                <div className="px-3.5 py-1.5 rounded-2xl bg-muted/50 border border-border flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-[9px] font-semibold text-muted-foreground uppercase">Leading Bid</div>
                    <div className="text-xs sm:text-sm font-black text-foreground">
                      {auction.current_highest_bid !== null
                        ? `₹${Number(auction.current_highest_bid).toLocaleString('en-IN')}/${auction.quantity_unit || 'Unit'}`
                        : 'No bids yet'}
                    </div>
                  </div>
                </div>

                {/* Quick Bid Button */}
                <form onSubmit={handlePlaceBid} className="flex items-center gap-1.5">
                  <div className="relative w-28 sm:w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={bidInput}
                      onChange={e => handleBidInputChange(e.target.value)}
                      placeholder={minAllowedBid.toString()}
                      disabled={isSoldConcluded}
                      className="pl-6 h-9 rounded-xl text-xs font-bold bg-background"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSoldConcluded || submittingBid}
                    size="sm"
                    className="h-9 px-3.5 bg-[#FF5A1F] hover:bg-[#e04f1a] text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    {!user ? 'Sign in to participate' : submittingBid ? 'Submitting...' : 'Submit Bid'}
                  </Button>
                </form>

                {/* Exit Full Page Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullPageChat(false)}
                  className="h-9 px-3 rounded-xl text-xs font-semibold border-border hover:bg-muted"
                >
                  <Minimize2 className="w-3.5 h-3.5 mr-1 text-[#FF5A1F]" /> Standard View
                </Button>
              </div>
            </div>

            {/* Full Page Chat Area */}
            <AuctionLiveChat
              auctionId={auction.id || auction.auction_number}
              manufacturerName={auction.manufacturer_name}
              onOpenBidderProfile={handleOpenBidder}
              isFullPage={true}
              onToggleFullPage={() => setIsFullPageChat(false)}
            />
          </div>
        ) : (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-5">
          
          {/* ── 60-Minute Live Reverse Auction Title Banner ── */}
          <div className="mb-5 p-4 rounded-3xl bg-card border border-border shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5A1F] text-white flex items-center gap-1 shadow-sm">
                    <Flame className="w-3 h-3 fill-white" /> 60-Minute Live Reverse Auction
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted border border-border text-foreground">
                    {auction.auction_number}
                  </span>
                  {isSoldConcluded ? (
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                      SOLD / CONCLUDED
                    </Badge>
                  ) : (
                    <Badge className="bg-red-600 text-white font-bold text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> LIVE BIDDING
                    </Badge>
                  )}
                </div>

                <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-snug">
                  60 Minutes: Sell Your Bulk Product Lot — {auction.title}
                </h1>

                <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                  A live reverse auction is when a manufacturer has a bulk product they want to sell within 60 minutes through real-time bidding.
                </p>
              </div>

              {/* Manufacturer Tag */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 shrink-0 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">Listing Manufacturer</div>
                  <button
                    type="button"
                    onClick={() => handleOpenBidder(auction.manufacturer_name, auction.seller_company_id)}
                    className="text-xs sm:text-sm font-bold text-foreground hover:text-[#FF5A1F] transition-colors flex items-center gap-1"
                  >
                    <span>{auction.manufacturer_name}</span>
                    {bidderCompanies[auction.seller_company_id]?.verification_status === 'verified' && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── 60-Minute Auction Sold / Concluded Banner (When Timer Expires) ── */}
          {isSoldConcluded && (
            <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-zinc-900 border-2 border-emerald-500/50 shadow-lg text-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        60-Minute Auction Concluded
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold">
                        LOT SOLD OUT
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                      Bulk Lot Awarded to {auction.highest_bidder_name}
                    </h2>
                    <p className="text-xs text-zinc-300 mt-1">
                      Final Winning Bid: <strong>₹{Number(auction.current_highest_bid).toLocaleString('en-IN')}/{auction.quantity_unit}</strong> • Total Value: <strong>₹{(Number(auction.current_highest_bid) * Number(auction.total_quantity)).toLocaleString('en-IN')}</strong> ({Number(auction.total_bids)} Total Bids Placed)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <Button
                    onClick={() => {
                      toast.success('Purchase Order Generated!', {
                        description: `Order for ${auction.total_quantity} ${auction.quantity_unit} awarded to ${auction.highest_bidder_name}. Ready for Escrow settlement.`
                      });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 shadow-md"
                  >
                    <ShoppingCart className="w-4 h-4" /> View Purchase Order
                  </Button>

                  <Button
                    onClick={handleSwitchToNextLot}
                    className="bg-[#FF5A1F] hover:bg-[#e04f1a] text-white font-bold text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 shadow-md"
                  >
                    <Sparkles className="w-4 h-4" /> View Next Live 60-Min Lot
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── 12-Column Balanced Responsive Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ── Left 7 Columns: Product Gallery + Specifications + Live Room Chat ── */}
            <div className="lg:col-span-7 space-y-6 min-w-0">
              
              {/* Image Preview & Thumbnails */}
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="relative aspect-[16/10] bg-muted">
                  <SafeImage
                    src={auction.images?.[selectedImage] || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800'}
                    alt={auction.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Floating Countdown Badge */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-600 text-white shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      LIVE 60-MIN SALE
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-black/80 backdrop-blur-md text-white shadow-lg border border-white/20">
                      <Clock className="w-3.5 h-3.5 text-red-400" />
                      {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Anti-Sniping Indicator */}
                  <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1 border border-white/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>+2 Min Anti-Sniping Active</span>
                  </div>
                </div>

                {auction.images && auction.images.length > 1 && (
                  <div className="p-3 bg-muted/30 flex gap-2 overflow-x-auto">
                    {auction.images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                          selectedImage === idx ? 'border-[#FF5A1F] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <SafeImage src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lot Specifications & Logistics */}
              <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#FF5A1F]" />
                  Lot Specifications & Technical Parameters
                </h2>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-5">
                  {auction.description}
                </p>

                {auction.specifications && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {Object.entries(auction.specifications).map(([key, val]: [string, any]) => (
                      <div key={key} className="p-3 rounded-2xl bg-muted/40 border border-border/60">
                        <div className="text-[11px] font-semibold text-muted-foreground">{key}</div>
                        <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{String(val)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery & Logistics Details */}
                <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-muted-foreground block font-medium">Factory Location</span>
                    <span className="font-bold text-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                      {auction.delivery_location}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-muted-foreground block font-medium">Dispatch Readiness</span>
                    <span className="font-bold text-foreground mt-0.5 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                      {auction.freight_terms || 'Within 24 Hours'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-muted-foreground block font-medium">Escrow Protection</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      100% Escrow Protected
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Tabs: Bid Activity Stream VS Live Room Chat VS Supplier Quotations */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveTab('bids')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                      activeTab === 'bids'
                        ? 'bg-[#FF5A1F] text-white shadow-sm'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Live Bids ({bidHistory.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('quotes')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                      activeTab === 'quotes'
                        ? 'bg-[#FF5A1F] text-white shadow-sm'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    Supplier Quotations ({quotations.length})
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                      activeTab === 'chat'
                        ? 'bg-[#FF5A1F] text-white shadow-sm'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Live Auction Room Chat
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </button>
                </div>

                {activeTab === 'bids' ? (
                  /* Bid Stream */
                  <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-semibold text-foreground">{activeBiddersCount} Bidders Active</span>
                        <span>•</span>
                        <span>Click on any bidder to inspect profile</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Stream
                      </span>
                    </div>

                    {bidHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground my-4">
                        <Gavel className="w-8 h-8 opacity-40 text-[#FF5A1F] mb-2" />
                        <p className="font-bold text-sm text-foreground">No bids yet</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          Be the first verified buyer to submit a live bid for this lot.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {bidHistory.map(bid => (
                          <div key={bid.id} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleOpenBidder(bid.bidder_name, bid.bidder_company_id)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer hover:scale-105 transition-transform ${
                                  bid.status === 'winning' ? 'bg-[#FF5A1F] text-white' : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {bid.bidder_name.charAt(0)}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBidder(bid.bidder_name, bid.bidder_company_id)}
                                    className="font-bold text-foreground hover:text-[#FF5A1F] transition-colors truncate text-left"
                                  >
                                    {bid.bidder_name}
                                  </button>
                                  {bid.status === 'winning' && (
                                    <Badge className="bg-emerald-600 text-white text-[9px] h-4 px-1.5">
                                      Leading Bid
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                                  <span>{bid.quantity.toLocaleString()} {auction.quantity_unit} • {bid.timestamp}</span>
                                  {bid.contact_phone && <span className="hidden sm:inline text-muted-foreground/40">•</span>}
                                  {bid.contact_phone && <span className="inline-flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">Phone:</span>
                                    <ProtectedContact
                                      phone={bid.contact_phone}
                                      contactType="bidder"
                                      variant="inline"
                                      showActions={false}
                                      isPostOwner={Boolean(user && auction && (user.id === auction.seller_id || user.id === (auction as any).created_by || user.id === (auction as any).user_id || user.id === (auction as any).owner_id))}
                                    />
                                  </span>}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 ml-2">
                              <div className="font-bold text-[#FF5A1F]">
                                ₹{bid.bid_amount.toLocaleString('en-IN')}/{auction.quantity_unit}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                ₹{(bid.bid_amount * bid.quantity).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : activeTab === 'quotes' ? (
                  /* Supplier Quotations Comparison & Order Award Console */
                  <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-foreground">
                          Competing Supplier Quotations ({quotations.length})
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Compare commercial bids, freight terms, lead time, and award purchase orders
                        </p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs w-fit">
                        Competitive Sourcing
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {quotations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 border border-border/60 rounded-2xl">
                          <FileText className="w-8 h-8 text-muted-foreground/60 mb-2" />
                          <p className="font-bold text-sm text-foreground">No supplier quotations submitted yet</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                            Verified manufacturers can submit commercial price bids and dispatch terms during this tender.
                          </p>
                        </div>
                      ) : (
                        quotations.map(quote => (
                          <div
                            key={quote.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              quote.is_shortlisted
                                ? 'bg-[#FF5A1F]/5 border-[#FF5A1F]/40 shadow-xs'
                                : 'bg-muted/30 border-border/70 hover:border-border'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-foreground text-sm">
                                    {quote.supplier_name}
                                  </span>
                                  {quote.is_shortlisted && (
                                    <Badge className="bg-[#FF5A1F] text-white text-[10px] font-bold">
                                      ★ Shortlisted
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span>{quote.supplier_location}</span>
                                  <span>•</span>
                                  {quote.rating ? <span>⭐ {quote.rating} Rating</span> : null}
                                  <span>•</span>
                                  <span>{quote.submitted_at}</span>
                                </div>
                              </div>

                              <div className="text-left sm:text-right shrink-0">
                                <div className="text-lg sm:text-xl font-bold text-[#FF5A1F]">
                                  ₹{quote.unit_price}
                                  <span className="text-xs font-normal text-muted-foreground">/{auction.quantity_unit}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  Total: ₹{(quote.unit_price * auction.total_quantity).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            {/* Commercial Specs Pills */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/50 text-[11px]">
                              <div className="bg-background/80 p-2 rounded-xl border border-border/50">
                                <span className="text-muted-foreground block text-[10px]">MOQ:</span>
                                <span className="font-bold text-foreground">{quote.moq.toLocaleString()} {auction.quantity_unit}</span>
                              </div>
                              <div className="bg-background/80 p-2 rounded-xl border border-border/50">
                                <span className="text-muted-foreground block text-[10px]">Lead Time:</span>
                                <span className="font-bold text-foreground">{quote.lead_time_days} Days Dispatch</span>
                              </div>
                              <div className="bg-background/80 p-2 rounded-xl border border-border/50">
                                <span className="text-muted-foreground block text-[10px]">Freight:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {quote.freight_included ? 'Included (Door)' : 'Extra at actuals'}
                                </span>
                              </div>
                              <div className="bg-background/80 p-2 rounded-xl border border-border/50">
                                <span className="text-muted-foreground block text-[10px]">Quote Validity:</span>
                                <span className="font-bold text-foreground">{quote.validity_days} Days</span>
                              </div>
                            </div>

                            {/* Action Buttons: strictly only for authenticated buyers when valid quote exists */}
                            <div className="flex items-center justify-end gap-2 mt-3 pt-2">
                              {!user ? (
                                <Button
                                  size="sm"
                                  onClick={() => setAuthDialogOpen(true)}
                                  className="h-8 px-3 text-xs font-bold bg-[#FF5A1F] hover:bg-[#e04f1a] text-white rounded-xl shadow-xs"
                                >
                                  Sign in to participate
                                </Button>
                              ) : isBuyerRole && quote.status !== 'expired' && quote.status !== 'rejected' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleShortlist(quote.id)}
                                    className="h-8 px-3 text-xs font-semibold rounded-xl border-border"
                                  >
                                    {quote.is_shortlisted ? 'Remove Shortlist' : 'Shortlist Offer'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenAwardDialog(quote)}
                                    className="h-8 px-4 text-xs font-bold bg-[#FF5A1F] hover:bg-[#e04f1a] text-white rounded-xl shadow-xs"
                                  >
                                    Accept & Award PO
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* Live Chat */
                  <AuctionLiveChat
                    auctionId={auction.id || auction.auction_number}
                    manufacturerName={auction.manufacturer_name}
                    onOpenBidderProfile={handleOpenBidder}
                    isFullPage={false}
                    onToggleFullPage={() => setIsFullPageChat(true)}
                  />
                )}
              </div>

            </div>

            {/* ── Right 5 Columns: Sticky 60-Minute Real-Time Bidding Console ── */}
            <div className="lg:col-span-5 space-y-6 min-w-0">
              
              <div className="bg-card border-2 border-[#FF5A1F]/40 rounded-3xl p-5 sm:p-6 shadow-md sticky top-20">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                  <div>
                    <span className="text-[11px] font-bold text-[#FF5A1F] uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-[#FF5A1F]" /> 60-Minute Bidding Room
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                      Place Real-Time Bid
                    </h2>
                  </div>
                  {isSoldConcluded ? (
                    <Badge className="bg-emerald-600 text-white font-bold text-xs">
                      SOLD
                    </Badge>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-600/10 text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      LIVE
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 mb-4">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
                    <span>Current Leading Bid</span>
                    {auction.highest_bidder_name ? (
                      <button
                        type="button"
                        onClick={() => handleOpenBidder(auction.highest_bidder_name, auction.highest_bidder_company_id)}
                        className="text-[11px] text-[#FF5A1F] font-bold hover:underline"
                      >
                        {auction.highest_bidder_name}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-normal">
                        No bids yet
                      </span>
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#FF5A1F] mt-1 flex items-baseline gap-1">
                    {auction.current_highest_bid !== null ? (
                      <>
                        ₹{Number(auction.current_highest_bid).toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-muted-foreground">
                          / {auction.quantity_unit || 'Unit'}
                        </span>
                      </>
                    ) : (
                      <span className="text-xl sm:text-2xl font-bold text-muted-foreground">
                        No bids yet
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                    <span>Base Price: ₹{Number(auction.starting_price).toLocaleString('en-IN')}</span>
                    <span>Min Step: +₹{Number(auction.min_bid_increment).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Countdown Timer Display */}
                <div className={`p-3.5 rounded-2xl border mb-5 flex items-center justify-between text-xs ${
                  isSoldConcluded
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-muted/40 border-border/60'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isSoldConcluded ? 'text-emerald-500' : 'text-[#FF5A1F]'}`} />
                    <span className="font-semibold text-foreground">
                      {isSoldConcluded ? 'Auction Status:' : 'Closing In (60-Min Window):'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {isSoldConcluded ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">SOLD OUT</span>
                    ) : (
                      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    )}
                  </span>
                </div>

                {/* Bidding Form */}
                <form onSubmit={handlePlaceBid} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Your Real-Time Bid (₹ / {auction.quantity_unit})</span>
                      <span className="text-muted-foreground text-[10px]">
                        Min ₹{minAllowedBid.toLocaleString('en-IN')}
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                        ₹
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        disabled={isSoldConcluded}
                        value={bidInput}
                        onChange={e => handleBidInputChange(e.target.value)}
                        placeholder={minAllowedBid.toString()}
                        className="pl-8 h-12 text-base font-bold text-foreground rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  {/* Step Buttons: calculate numerically from current valid bid (+1, +2, +5) */}
                  {!isSoldConcluded && (
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 5].map(inc => (
                        <button
                          key={inc}
                          type="button"
                          onClick={() => handleQuickIncrement(inc)}
                          className="py-1.5 rounded-lg border border-border/80 bg-muted/30 hover:border-[#FF5A1F] text-[11px] font-bold text-foreground transition-all active:scale-95 cursor-pointer"
                        >
                          +₹{inc}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Lot Calculation Summary: Dynamic calculation or dash placeholders when empty */}
                  <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 text-xs space-y-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Total Lot Quantity:</span>
                      <span className="font-bold text-foreground">
                        {lotTotalQuantity.toLocaleString()} {auction.quantity_unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gross Lot Order Value:</span>
                      <span className="font-bold text-foreground">
                        {grossLotOrderValue !== null ? `₹${grossLotOrderValue.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] pt-1.5 border-t border-border/30">
                      <span>GST (18% Estimate):</span>
                      <span className="font-semibold text-foreground">
                        {gstAmount !== null ? `₹${gstAmount.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-1.5 border-t border-border/50 font-bold text-foreground">
                      <span>Total including GST:</span>
                      <span className="text-[#FF5A1F]">
                        {totalWithGst !== null ? `₹${totalWithGst.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Action CTA */}
                  {isSoldConcluded ? (
                    <Button
                      type="button"
                      onClick={handleSwitchToNextLot}
                      className="w-full h-12 rounded-xl text-sm font-bold bg-[#FF5A1F] hover:bg-[#e04f1a] text-white shadow-lg flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Browse Next Live 60-Min Lot
                    </Button>
                  ) : !user ? (
                    <div className="space-y-2.5">
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-500 dark:text-amber-400">
                        <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                        <div>
                          <p className="font-bold text-foreground">Verified Buyer Login Required</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            Guest and unauthenticated bidding is strictly disabled to prevent simulated offers. Please sign in to submit real-time bids.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setAuthDialogOpen(true)}
                        className="w-full h-12 rounded-xl text-sm font-bold bg-[#FF5A1F] hover:bg-[#e04e17] text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        Sign in to participate
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submittingBid}
                      className="w-full h-12 rounded-xl text-sm font-bold bg-[#FF5A1F] hover:bg-[#e04e17] text-white shadow-lg flex items-center justify-center gap-2"
                    >
                      {submittingBid ? (
                        'Broadcasting Real-Time Bid...'
                      ) : (
                        <>
                          <Flame className="w-4 h-4 fill-white" />
                          Submit Real-Time Bid {isValidBidPrice ? `(₹${parsedBid.toLocaleString('en-IN')})` : ''}
                        </>
                      )}
                    </Button>
                  )}
                </form>

                {/* Anti-Sniping Protection Notice */}
                <div className="mt-4 p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-start gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-[#FF5A1F] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Anti-Sniping Protected:</strong> Bids placed within the final 2 minutes extend the countdown by +2 minutes for transparent price discovery.
                  </div>
                </div>

                {/* 24-Hour Compulsory Subscription & Verified Tax Invoice Card */}
                <div className="mt-3.5 p-3.5 rounded-2xl bg-orange-50/60 dark:bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5 text-[#FF5A1F]">
                      <Receipt className="w-3.5 h-3.5" />
                      ₹5,000 Participation Fee Paid (₹5,900 Total)
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[9px]">
                      Verified Manufacturer
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    This lot was verified and published under the compulsory 24-Hour Sell Products Bidding Participation with statutory 18% GST paid in full.
                  </p>
                  <div className="pt-2 border-t border-[#FF5A1F]/20 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Tax Jurisdiction: <strong>India (18% GST)</strong></span>
                    <span className="font-mono font-semibold text-foreground">Inv #BS-INV-2026-89412</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
        )}

      </div>

      {/* Interactive Bidder Profile Modal */}
      <BidderProfileModal
        bidderName={selectedBidder?.name ?? null}
        company={selectedBidder?.companyId ? bidderCompanies[selectedBidder.companyId] ?? null : null}
        open={bidderModalOpen}
        onOpenChange={setBidderModalOpen}
        isPostOwner={Boolean(user && auction && (user.id === auction.seller_id || user.id === (auction as any).created_by || user.id === (auction as any).user_id || user.id === (auction as any).owner_id))}
      />

      {/* ── Purchase Order Award Modal ── */}
      {awardOrderDialogOpen && selectedQuoteForAward && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAwardOrderDialogOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-bold w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Award Purchase Order (PO)</h3>
                <p className="text-xs text-muted-foreground">Finalize order terms and release contract via BulkSkart Escrow</p>
              </div>
            </div>

            {/* Official PO Header */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="font-mono font-bold text-foreground">PO-BS-RFQ-{auction.auction_number.replace(/\D/g, '') || '1042'}-89</span>
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold text-[10px]">
                  Verified B2B Purchase Order
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Awarded Supplier:</span>
                  <span className="font-bold text-foreground">{selectedQuoteForAward.supplier_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Delivery Destination:</span>
                  <span className="font-bold text-foreground">{auction.delivery_location}</span>
                </div>
              </div>
            </div>

            {/* Itemized Financial Breakdown */}
            <div className="p-4 rounded-2xl bg-background border border-border space-y-2 text-xs">
              <div className="font-bold text-foreground pb-1 border-b border-border text-xs flex justify-between">
                <span>Commercial Terms Breakdown</span>
                <span>Amount (INR)</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Base Cost ({auction.total_quantity.toLocaleString()} {auction.quantity_unit} @ ₹{selectedQuoteForAward.unit_price}):</span>
                <span className="font-mono font-semibold text-foreground">₹{(selectedQuoteForAward.unit_price * auction.total_quantity).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST (Estimated {selectedQuoteForAward.gst_percent}%):</span>
                <span className="font-mono font-semibold text-foreground">₹{((selectedQuoteForAward.unit_price * auction.total_quantity) * (selectedQuoteForAward.gst_percent / 100)).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Freight & Handling:</span>
                <span className="font-mono font-semibold text-emerald-500">
                  {selectedQuoteForAward.freight_included ? '₹0 (Included Door Delivery)' : 'To be billed at actuals'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Dispatch Window:</span>
                <span className="font-semibold text-foreground">{selectedQuoteForAward.lead_time_days} Days from Escrow Confirmation</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-bold text-sm text-foreground">
                <span>Total Escrow Amount:</span>
                <span className="text-[#FF5A1F] text-base">
                  ₹{((selectedQuoteForAward.unit_price * auction.total_quantity) * (1 + selectedQuoteForAward.gst_percent / 100)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Protection Notice */}
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <ShieldCheck className="w-4 h-4 text-[#FF5A1F] shrink-0 mt-0.5" />
              <span>
                <strong>100% Escrow Protection:</strong> Funds are locked securely until physical inspection and proof of delivery (POD) is confirmed by buyer.
              </span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setAwardOrderDialogOpen(false)}
                className="flex-1 h-11 rounded-xl border-border text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAwardOrder}
                disabled={isAwardingOrder}
                className="flex-1 h-11 rounded-xl bg-[#FF5A1F] hover:bg-[#e04f1a] text-white font-bold text-xs shadow-md"
              >
                {isAwardingOrder ? 'Generating & Signing PO...' : 'Confirm & Release Purchase Order'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Verified Buyer Authentication Required Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
              <Lock className="w-5 h-5 text-[#FF5A1F]" />
              Verified Buyer Login Required
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              To place legally binding bids in 60-Minute Real-Time Auctions, you must sign in with verified enterprise credentials. Anonymous or simulated bidding is strictly disabled on BulkSkart.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-muted/50 border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auction Lot:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">{auction.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Intended Bid:</span>
                <span className="font-bold text-[#FF5A1F]">₹{(isValidBidPrice ? parsedBid : minAllowedBid).toLocaleString('en-IN')} / {auction.quantity_unit}</span>
              </div>
              <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
                <span>Total Lot Value:</span>
                <span className="font-bold text-foreground">₹{((isValidBidPrice ? parsedBid : minAllowedBid) * auction.total_quantity).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                type="button"
                onClick={() => {
                  setAuthDialogOpen(false);
                  navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
                }}
                className="w-full h-11 bg-[#FF5A1F] hover:bg-[#e04e17] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Log In with Verified Account
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAuthDialogOpen(false);
                  navigate(`/register?role=buyer&returnUrl=${encodeURIComponent(window.location.pathname)}`);
                }}
                className="w-full h-11 font-medium rounded-xl border-border text-primary hover:bg-muted flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Register as Verified Buyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
