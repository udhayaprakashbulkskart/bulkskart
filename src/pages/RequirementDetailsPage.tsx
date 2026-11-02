import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Share2, Bookmark, CheckCircle2, Copy, Eye, Calendar,
  ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut,
  Package, MapPin, FileText, CreditCard, Clock, ShieldCheck,
  Building2, MessageSquare, Send, Paperclip, ChevronDown, ChevronUp,
  Download, ArrowRight, Zap, TrendingUp, CheckCircle, XCircle,
  Sparkles, Lock, Star, Heart, AlertCircle, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRequirementById,
  getQuotationsForRequirement,
  createQuotation,
  getRequirements,
  getCompanies,
  getMarketplaceProducts,
  incrementRequirementViewCount,
  checkDirectMessageQuota,
  checkSupplierPaidSubscription,
  checkSupplierAiMatchingAccess,
  getOrCreateConversation
} from '@/lib/api';
import type { Requirement, Quotation, Company, Product } from '@/types/types';
import SafeImage from '@/components/common/SafeImage';
import PageMeta from '@/components/common/PageMeta';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import SubscribeToContactDialog, { type SubscriptionReason } from '@/components/common/SubscribeToContactDialog';
import AIQuotationModal from '@/components/common/AIQuotationModal';
import SubmitQuotationWizard from '@/components/rfq/SubmitQuotationWizard';
import ProtectedContact from '@/components/common/ProtectedContact';
import {
  calculateProductMatchScore,
  generateAIQuotationDraft,
  type MatchedProduct,
  type AIQuotationDraft,
  type AIChatReply,
} from '@/lib/aiSalesAssistant';
import { resolveRfqImage } from '@/lib/contentImages';


const CATEGORY_GALLERIES: Record<string, string[]> = {
  machinery: [
    'https://cdn.pixabay.com/photo/2016/09/12/07/48/mechanical-1663275_1280.jpg',
    'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80'
  ],
  packaging: [
    'https://cdn.pixabay.com/photo/2014/04/05/11/07/cardboard-314504_1280.jpg',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'
  ],
  electronics: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80'
  ],
  agriculture: [
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=800&auto=format&fit=crop&q=80'
  ]
};

const PIPELINE_STEPS = [
  { key: 'active', label: 'Active', icon: Zap },
  { key: 'responses', label: 'Responses', icon: MessageSquare },
  { key: 'negotiation', label: 'Negotiation', icon: TrendingUp },
  { key: 'deal_finalized', label: 'Deal Finalized', icon: ShieldCheck },
  { key: 'fulfilled', label: 'Fulfilled', icon: CheckCircle },
  { key: 'closed', label: 'Closed', icon: XCircle }
];

export default function RequirementDetailsPage() {
  const { rfqId } = useParams<{ rfqId: string }>();
  const navigate = useNavigate();
  const { user, profile, company } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [req, setReq] = useState<Requirement | null>(null);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [similarReqs, setSimilarReqs] = useState<Requirement[]>([]);
  const [recommendedSuppliers, setRecommendedSuppliers] = useState<Company[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'history'>('overview');
  const [isSaved, setIsSaved] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [likedProducts, setLikedProducts] = useState<Record<string, boolean>>({});

  const [sendQuoteOpen, setSendQuoteOpen] = useState(false);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [subDialogReason, setSubDialogReason] = useState<SubscriptionReason>('not_logged_in');

  const [quotePrice, setQuotePrice] = useState<number | ''>('');
  const [quoteMoq, setQuoteMoq] = useState<number | ''>('');
  const [quoteDeliveryDays, setQuoteDeliveryDays] = useState<number | ''>(20);
  const [quotePaymentTerms, setQuotePaymentTerms] = useState('30% Advance, 70% against BL/Dispatch');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Role detection: is the current viewer the buyer who posted this requirement?
  const isRequirementPoster = Boolean(user?.id && req?.buyer_id && req.buyer_id === user.id);
  const isSupplierViewer = (profile?.role as string) === 'supplier' || (profile?.role as string) === 'manufacturer' || !isRequirementPoster;

  // The buyer, as the database knows them. Nothing about the buyer is invented.
  const buyerProfile = useMemo(() => {
    const poster = req?.profiles;
    const name = poster?.full_name?.trim() || 'Buyer';
    return {
      name,
      phone: (poster?.phone || (req as { buyer_phone?: string | null } | null)?.buyer_phone || '').trim(),
      location: [req?.destination_city, req?.destination_country].filter(Boolean).join(', '),
      initials: name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase() || 'B',
      category: req?.categories?.name || '',
      verified: Boolean(req?.is_verified_buyer),
      memberSince: poster?.created_at ? new Date(poster.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '',
    };
  }, [req]);

  // Verified subscription status for manufacturer/supplier
  const [isPaidSubscription, setIsPaidSubscription] = useState<boolean | null>(null);
  const [hasAiMatchingAccess, setHasAiMatchingAccess] = useState<boolean>(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  useEffect(() => {
    async function verifySubscription() {
      if (!company?.id && !user?.id) {
        setIsPaidSubscription(false);
        setHasAiMatchingAccess(false);
        return;
      }
      setCheckingSubscription(true);
      try {
        if (company?.id) {
          const res = await checkSupplierPaidSubscription(company.id, company);
          setIsPaidSubscription(res.allowed);
        } else {
          setIsPaidSubscription(false);
        }

        const aiRes = await checkSupplierAiMatchingAccess(company?.id, user?.id);
        setHasAiMatchingAccess(Boolean(aiRes.allowed && aiRes.hasAiMatching));
      } catch (err) {
        setIsPaidSubscription(false);
        setHasAiMatchingAccess(false);
      } finally {
        setCheckingSubscription(false);
      }
    }
    verifySubscription();
  }, [company?.id, user?.id]);

  // ─── AI Sales Assistant State ─────────────────────────────
  const [aiQuoteModalOpen, setAiQuoteModalOpen] = useState(false);
  const [selectedAiProduct, setSelectedAiProduct] = useState<MatchedProduct | null>(null);
  const [aiQuotationDraft, setAiQuotationDraft] = useState<AIQuotationDraft | null>(null);

  // Compute AI Matched Products from manufacturer catalogue
  const aiMatchedProducts = useMemo<MatchedProduct[]>(() => {
    if (!req || !relatedProducts || relatedProducts.length === 0) return [];
    const sourceProducts: Product[] = relatedProducts;
    const scored: MatchedProduct[] = [];
    
    for (const p of sourceProducts) {
      const score = calculateProductMatchScore(p, req);
      if (score > 25) {
        const priceNum = p.price_min ? (p.price_currency === 'INR' ? p.price_min : Math.round(p.price_min * 83.5)) : 280;
        scored.push({
          id: p.id,
          name: p.name || req.title,
          slug: p.slug || 'product',
          categoryName: p.category_id || undefined,
          price: priceNum,
          priceINR: priceNum,
          priceCurrency: 'INR',
          moq: p.moq || 1,
          moqUnit: p.moq_unit || req.quantity_unit || 'Pieces',
          availableQuantity: (p as any).available_quantity || Math.max(Number(req.quantity) || 100, 500),
          estimatedDeliveryDays: (p as any).delivery_days || 7,
          matchScore: score,
          image: p.images?.[0] || req.attachment_url || undefined,
          unitCompatibility: true
        });
      }
    }

    return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  }, [req, relatedProducts]);

  const handleOpenAiQuoteModal = async (prod: MatchedProduct) => {
    if (!user) {
      setSubDialogReason('not_logged_in');
      setSubscribeDialogOpen(true);
      return;
    }
    if (!company) {
      setSubDialogReason('not_registered_business');
      setSubscribeDialogOpen(true);
      return;
    }
    // Database backend subscription verification for AI matching (₹7,500 Business Package or ₹7,500 AI Add-on)
    const aiCheck = await checkSupplierAiMatchingAccess(company.id, user.id);
    if (!aiCheck.allowed || !aiCheck.hasAiMatching) {
      setSubDialogReason('ai_matching_subscription');
      setSubscribeDialogOpen(true);
      return;
    }

    if (!req) return;
    const draft = generateAIQuotationDraft(req, prod);
    setSelectedAiProduct(prod);
    setAiQuotationDraft(draft);
    setAiQuoteModalOpen(true);
  };

  const loadData = useCallback(async () => {
    if (!rfqId) return;
    setLoading(true);
    setError(null);

    try {
      let fetchedReq = await getRequirementById(rfqId);

      if (!fetchedReq) {
        // An unknown id is not found. No requirement is ever made up.
        setReq(null);
        setError('This requirement is not available. It may have been closed or removed.');
        return;
      }

      setReq(fetchedReq);

      if (fetchedReq.id) {
        incrementRequirementViewCount(fetchedReq.id);
      }

      const dbQuotes = await getQuotationsForRequirement(fetchedReq.id);
      setQuotes(dbQuotes);

      const simReqs = await getRequirements({
        categoryId: fetchedReq.category_id || undefined,
        limit: 4
      });
      setSimilarReqs(simReqs.filter(r => r.id !== fetchedReq.id).slice(0, 4));

      const compList = await getCompanies({ verified: true, limit: 4 });
      setRecommendedSuppliers(compList);

      const prodRes = await getMarketplaceProducts({
        categoryId: fetchedReq.category_id || undefined,
        pageSize: 6
      });
      setRelatedProducts(prodRes.products.slice(0, 6));

    } catch (err: any) {
      console.error('Error loading requirement details:', err);
      setError(err?.message || 'Failed to load requirement details.');
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    loadData();
    window.scrollTo(0, 0);
  }, [loadData]);

  const galleryImages = useMemo(() => {
    if (req?.attachment_url) return [req.attachment_url];
    const resolved = resolveRfqImage({
      title: req?.title,
      attachment_url: req?.attachment_url,
      category: req?.categories?.name || req?.categories?.slug,
      categories: req?.categories,
    });
    return [resolved];
  }, [req]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: req?.title || 'BulkSkart Requirement',
          text: `Check out this live buying requirement on BulkSkart: ${req?.title}`,
          url
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(url);
    toast.success('Requirement URL copied to clipboard!');
  };

  const handleSaveToggle = () => {
    setIsSaved(prev => {
      const next = !prev;
      if (next) toast.success('Requirement saved to watchlist!');
      else toast.info('Requirement removed from watchlist');
      return next;
    });
  };

  const handleCopyRfqId = () => {
    const code = req?.req_number || `RFQ-${(req?.id || '').slice(0, 6).toUpperCase()}`;
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code} to clipboard!`);
  };

  const handlePrevImage = () => {
    setActiveImageIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };
  const handleNextImage = () => {
    setActiveImageIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handleChatWithBuyer = async () => {
    if (!user) {
      setSubDialogReason('not_logged_in');
      setSubscribeDialogOpen(true);
      return;
    }
    if (!company) {
      setSubDialogReason('not_registered_business');
      setSubscribeDialogOpen(true);
      return;
    }
    // Gating: Only subscription paid manufacturers can message buyers
    const subCheck = await checkSupplierPaidSubscription(company.id, company);
    if (!subCheck.allowed) {
      setSubDialogReason(subCheck.reason);
      setSubscribeDialogOpen(true);
      return;
    }
    if (!req?.buyer_id) {
      toast.error('This buyer cannot be messaged yet.');
      return;
    }
    // A real conversation with the real buyer, opened in Messages.
    const { id, error: conversationError } = await getOrCreateConversation(req.buyer_id, user.id, company.id, req.id);
    if (conversationError || !id) {
      toast.error('Could not open the conversation. Please try again.');
      return;
    }
    navigate(`/dashboard/supplier/messages?conv=${id}`);
  };

  // The buyer opens a real conversation with a supplier who quoted.
  const handleMessageSupplier = async (supplierId: string, supplierCompanyId: string) => {
    if (!user) {
      setSubDialogReason('not_logged_in');
      setSubscribeDialogOpen(true);
      return;
    }
    const { id, error: conversationError } = await getOrCreateConversation(user.id, supplierId, supplierCompanyId, req?.id);
    if (conversationError || !id) {
      toast.error('Could not open the conversation. Please try again.');
      return;
    }
    navigate(`/dashboard/buyer/messages?conv=${id}`);
  };

  const handleOpenSendQuote = async () => {
    if (!user) {
      setSubDialogReason('not_logged_in');
      setSubscribeDialogOpen(true);
      return;
    }
    if (!company) {
      setSubDialogReason('not_registered_business');
      setSubscribeDialogOpen(true);
      return;
    }
    // Gating: Only subscription paid manufacturers can send quotes
    const subCheck = await checkSupplierPaidSubscription(company.id, company);
    if (!subCheck.allowed) {
      setSubDialogReason(subCheck.reason === 'no_subscription' ? 'quotation_subscription' : subCheck.reason);
      setSubscribeDialogOpen(true);
      return;
    }
    setQuoteMoq(req?.quantity ?? '');
    setSendQuoteOpen(true);
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotePrice || !req) {
      toast.error('Please enter your unit price');
      return;
    }
    setSubmittingQuote(true);
    try {
      if (company && user) {
        const quoteRes = await createQuotation({
          requirement_id: req.id,
          supplier_company_id: company.id,
          supplier_id: user.id,
          buyer_id: req.buyer_id,
          unit_price: Number(quotePrice),
          currency: req.currency || 'INR',
          moq: Number(quoteMoq) || req.quantity,
          moq_unit: req.quantity_unit || 'Pieces',
          delivery_days: Number(quoteDeliveryDays) || 20,
          payment_terms: quotePaymentTerms,
          delivery_terms: 'FOB / Door Delivery',
          notes: quoteNotes,
          status: 'pending',
          is_draft: false
        });

        if (quoteRes?.error) {
          toast.error(quoteRes.error);
          if (quoteRes.error.includes('subscription')) {
            setSendQuoteOpen(false);
            setSubDialogReason('quotation_subscription');
            setSubscribeDialogOpen(true);
          }
          return;
        }
      }
      toast.success('Your quotation has been securely submitted to the buyer!');
      setSendQuoteOpen(false);
      const updated = await getQuotationsForRequirement(req.id);
      setQuotes(updated);
      setActiveTab('quotes');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit quote');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const specificationsList = useMemo(() => {
    if (!req) return [];
    if (req.specifications && req.specifications.includes(':')) {
      return req.specifications
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const parts = line.split(':');
          return {
            label: parts[0]?.trim() || '',
            value: parts.slice(1).join(':')?.trim() || ''
          };
        });
    }

    // No written specifications: show only what the requirement itself states.
    const rows = [
      { label: 'Product Name', value: req.title },
      { label: 'Quantity', value: `${req.quantity.toLocaleString()} ${req.quantity_unit || ''}`.trim() },
    ];
    if (req.deadline) rows.push({ label: 'Deadline', value: new Date(req.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) });
    return rows;
  }, [req]);

  // Only quotations that exist in the database. No quotes are ever added to make a requirement look busy.
  const displayQuotes = quotes;

  if (loading) {
    return (
      <MainLayout>
        <div className="bg-background text-foreground min-h-screen py-8 px-4 sm:px-6">
          <div className="max-w-[1400px] mx-auto space-y-6 animate-pulse">
            <div className="h-6 w-64 bg-white/10 rounded-md" />
            <div className="h-10 w-3/4 bg-white/10 rounded-md" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="aspect-[16/10] bg-white/10 rounded-2xl" />
                <div className="h-28 bg-white/10 rounded-2xl" />
                <div className="h-44 bg-white/10 rounded-2xl" />
              </div>
              <div className="space-y-4">
                <div className="h-64 bg-white/10 rounded-2xl" />
                <div className="h-44 bg-white/10 rounded-2xl" />
                <div className="h-80 bg-white/10 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !req) {
    return (
      <MainLayout>
        <PageMeta title="Requirement Not Available | BulkSkart" description="The requested buying requirement is not available." robots="noindex, nofollow" />
        <div className="bg-background text-foreground min-h-screen flex items-center justify-center p-4">
          <div className="bg-card border border-border p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Requirement Not Found</h2>
            <p className="text-sm text-white/60">
              {error || `Unable to load RFQ with ID "${rfqId}". It may have expired or been removed.`}
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="flex-1 border border-border text-white hover:bg-white/10"
              >
                Go Back
              </Button>
              <Button
                onClick={loadData}
                className="flex-1 bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const rfqCode = req.req_number || `RFQ - ${(req.id || '').slice(0, 6).toUpperCase()}`;
  const categoryName = req.categories?.name || 'Uncategorised';
  const buyerLocation = [req.destination_city, req.destination_country].filter(Boolean).join(', ');
  const targetPriceDisplay = req.budget_min && req.budget_max
    ? `₹${req.budget_min.toLocaleString()} - ₹${req.budget_max.toLocaleString()}`
    : req.budget_min
    ? `₹${req.budget_min.toLocaleString()}`
    : 'Not Specified';

  return (
    <MainLayout>
      <PageMeta
        title={`${req.title} (${rfqCode}) — Live Buying Requirement | BulkSkart`}
        description={req.description || `View verified buyer requirement for ${req.title}. Quantity: ${req.quantity} ${req.quantity_unit}. Destination: ${req.destination_country || 'Global'}. Target budget: ${req.budget_min || req.budget_max ? `${req.currency || '$'}${req.budget_min || req.budget_max}` : 'Negotiable'}. Submit quotation on BulkSkart.`}
        keywords={`${req.title}, bulk RFQ, buy ${req.title}, wholesale requirement, ${req.categories?.name || 'industrial'}, B2B supply lead`}
        canonical={`/requirement/${rfqId}`}
        ogType="website"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Requirements', item: '/requirements' },
          { name: `${req.title} (${rfqCode})`, item: `/requirement/${rfqId}` },
        ]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Demand',
          name: req.title,
          description: req.description || `Bulk purchase request for ${req.quantity} ${req.quantity_unit} of ${req.title}`,
          sku: rfqCode,
          itemOffered: {
            '@type': 'Product',
            name: req.title,
            category: req.categories?.name,
          },
          priceSpecification: req.budget_min || req.budget_max ? {
            '@type': 'UnitPriceSpecification',
            price: req.budget_min || req.budget_max || 0,
            priceCurrency: req.currency || 'USD',
          } : undefined,
          eligibleRegion: {
            '@type': 'Place',
            name: req.destination_country || 'Global',
          },
        }}
      />

      <div className="bg-background text-foreground min-h-screen pb-24 md:pb-16 selection:bg-[#FF5A00]/30 selection:text-white">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-5 md:px-6 pt-3 sm:pt-4 md:pt-6">

          {/* ── BREADCRUMB NAVIGATION ─────────────────────── */}
          <Breadcrumbs
            items={[
              { name: 'Live Buying Requirements', href: '/requirements' },
              ...(categoryName ? [{ name: categoryName, href: `/requirements?category=${encodeURIComponent(categoryName)}` }] : []),
              { name: req.title },
            ]}
            className="mb-3 text-muted-foreground/80"
          />

          {/* ── TOP HEADER BLOCK: Status, Views, Date, Actions matching Image 1 ─ */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 md:p-6 mb-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Active
                </span>

                <span className="inline-flex items-center gap-1 text-xs text-white/60">
                  <Eye className="w-3.5 h-3.5 text-white/40" />
                  <span>{(req.view_count ?? 0).toLocaleString()} Views</span>
                </span>

                <span className="text-white/20">•</span>

                <span className="inline-flex items-center gap-1 text-xs text-white/60">
                  <Calendar className="w-3.5 h-3.5 text-white/40" />
                  <span>Posted on {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="border border-border bg-white/5 hover:bg-white/10 text-white text-xs h-9 px-3 gap-1.5 rounded-xl font-medium"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveToggle}
                  className={`border border-border text-xs h-9 px-3 gap-1.5 rounded-xl font-medium transition-all ${
                    isSaved ? 'bg-[#FF5A00]/20 text-[#FF5A00] border-[#FF5A00]/50' : 'bg-white/5 hover:bg-white/10 text-white'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#FF5A00]' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </Button>
              </div>
            </div>

            <div className="pt-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {req.title}
              </h1>

              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border">
                  {categoryName}
                </span>

                <button
                  onClick={handleCopyRfqId}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground border border-border transition-colors group"
                  title="Click to copy RFQ code"
                >
                  <span>{rfqCode}</span>
                  <Copy className="w-3 h-3 text-muted-foreground group-hover:text-[#FF5A00] transition-colors" />
                </button>
              </div>
            </div>

            {/* ── FUNCTIONAL TABS matching Image 1 ───────────────────────── */}
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'quotes', label: `Quotes (${displayQuotes.length})` },
                  { id: 'history', label: 'History' },
                ].map(t => {
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as typeof activeTab)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[38px] ${
                        active
                          ? 'bg-[#FF5A00] text-white shadow-[0_2px_12px_rgba(255,90,0,0.35)]'
                          : 'bg-card text-foreground/80 hover:text-foreground border border-border hover:border-primary/40'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── TWO-COLUMN MAIN CONTENT (Desktop Left/Right, Mobile Single-Column) ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">

            {/* LEFT COLUMN: Gallery, Summary, Description, Specs, Delivery (8/12 cols) */}
            <div className="lg:col-span-8 space-y-5 md:space-y-6 min-w-0">

              {activeTab === 'overview' && (
                <>
                  {/* 1. INTERACTIVE IMAGE GALLERY matching Image 1 */}
                  <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 md:p-5 shadow-xl">
                    <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-xl overflow-hidden bg-black/60 border border-border group">
                      <SafeImage
                        src={galleryImages[activeImageIndex] || galleryImages[0]}
                        alt={`${req.title} - Image ${activeImageIndex + 1}`}
                        className="w-full h-full object-cover transition-all duration-300 cursor-zoom-in"
                        onClick={() => setFullscreenImage(true)}
                      />

                      <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md border border-border text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
                        <Maximize2 className="w-3 h-3 text-[#FF5A00]" />
                        <span>{activeImageIndex + 1}/{galleryImages.length}</span>
                      </div>

                      <button
                        onClick={handlePrevImage}
                        aria-label="Previous image"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-border transition-all opacity-80 hover:opacity-100 backdrop-blur-sm"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        aria-label="Next image"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-border transition-all opacity-80 hover:opacity-100 backdrop-blur-sm"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 mt-3 items-center">
                      {galleryImages.slice(0, 5).map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative ${
                            activeImageIndex === idx
                              ? 'border-[#FF5A00] scale-[1.02] shadow-[0_0_10px_rgba(255,90,0,0.4)]'
                              : 'border-border opacity-70 hover:opacity-100'
                          }`}
                        >
                          <SafeImage src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}

                      {galleryImages.length > 5 && (
                        <button
                          onClick={() => setFullscreenImage(true)}
                          className="aspect-square rounded-lg bg-[#181B26] border border-border text-white/80 hover:text-white flex flex-col items-center justify-center text-xs font-bold transition-all hover:bg-[#222736]"
                        >
                          <span>+{galleryImages.length - 5}</span>
                          <span className="text-[10px] text-white/50">View All</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. REQUIREMENT SUMMARY CARDS GRID matching Image 1 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center gap-2 text-white/50 text-[11px] sm:text-xs">
                        <Package className="w-4 h-4 text-[#FF5A00] shrink-0" />
                        <span>Required Quantity</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-white mt-1.5 truncate">
                        {req.quantity.toLocaleString()} {req.quantity_unit || 'Pieces'}
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center gap-2 text-white/50 text-[11px] sm:text-xs">
                        <CreditCard className="w-4 h-4 text-[#FF5A00] shrink-0" />
                        <span>Target Price</span>
                      </div>
                      <div className={`text-sm sm:text-base font-extrabold mt-1.5 truncate ${
                        targetPriceDisplay === 'Not Specified' ? 'text-[#FF5A00]' : 'text-white'
                      }`}>
                        {targetPriceDisplay}
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center gap-2 text-white/50 text-[11px] sm:text-xs">
                        <Calendar className="w-4 h-4 text-[#FF5A00] shrink-0" />
                        <span>Required By</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-white mt-1.5 truncate">
                        {req.deadline ? new Date(req.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '31 Dec 2026'}
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center gap-2 text-white/50 text-[11px] sm:text-xs">
                        <MapPin className="w-4 h-4 text-[#FF5A00] shrink-0" />
                        <span>Delivery Location</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-white mt-1.5 truncate" title={buyerLocation}>
                        {buyerLocation}
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center gap-2 text-white/50 text-[11px] sm:text-xs">
                        <FileText className="w-4 h-4 text-[#FF5A00] shrink-0" />
                        <span>Purchase Type</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-white mt-1.5 truncate">
                        Bulk Purchase
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center gap-2 text-white/50 text-[11px] sm:text-xs">
                        <CreditCard className="w-4 h-4 text-[#FF5A00] shrink-0" />
                        <span>Payment Terms</span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-white mt-1.5 truncate">
                        To be Discussed
                      </div>
                    </div>
                  </div>

                  {/* 3. REQUIREMENT DESCRIPTION matching Image 1 */}
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xl">
                    <div className="flex items-center gap-2 text-sm font-bold text-white mb-2.5">
                      <FileText className="w-4 h-4 text-[#FF5A00]" />
                      <span>Requirement Description</span>
                    </div>

                    <div className={`text-xs sm:text-sm text-white/80 leading-relaxed ${
                      !showFullDescription ? 'line-clamp-3 sm:line-clamp-none' : ''
                    }`}>
                      {req?.description || 'The buyer did not add a description.'}
                    </div>

                    <button
                      onClick={() => setShowFullDescription(prev => !prev)}
                      className="mt-2.5 text-xs font-bold text-[#FF5A00] hover:text-[#ff782e] flex items-center gap-1 sm:hidden transition-colors"
                    >
                      <span>{showFullDescription ? 'Read Less' : 'Read More'}</span>
                      {showFullDescription ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* 4. DYNAMIC SPECIFICATIONS MATRIX matching Image 1 */}
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                      <Sparkles className="w-4 h-4 text-[#FF5A00]" />
                      <span>Specifications</span>
                    </div>

                    <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                      {specificationsList.map((spec, i) => (
                        <div
                          key={i}
                          className={`grid grid-cols-1 sm:grid-cols-3 p-3 text-xs sm:text-sm ${
                            i % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                          }`}
                        >
                          <div className="text-muted-foreground font-medium sm:col-span-1">
                            {spec.label}
                          </div>
                          <div className="text-foreground font-semibold sm:col-span-2 mt-0.5 sm:mt-0">
                            {spec.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. DELIVERY LOCATION & MAP matching Image 1 */}
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <MapPin className="w-4 h-4 text-[#FF5A00]" />
                        <span>Delivery Location</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-500" />
                        Privacy Protected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative rounded-xl overflow-hidden border border-border h-48 bg-muted">
                        <iframe
                          title="Delivery Location Map"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          style={{ border: 0 }}
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyB_LJOYJL-84SMuxNB7LtRGhxEQLjswvy0&q=${encodeURIComponent(buyerLocation)}&language=en&region=cn`}
                          allowFullScreen
                        />
                        <div className="absolute bottom-2 left-2 bg-card/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border text-xs text-foreground font-bold flex items-center gap-1.5 shadow-md">
                          <MapPin className="w-3.5 h-3.5 text-[#FF5A00]" />
                          <span>{buyerLocation}</span>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
                          <div className="text-muted-foreground font-medium">Address Details</div>
                          <div className="text-sm font-bold text-foreground">{buyerLocation}</div>
                          <div className="text-muted-foreground">
                            <strong>Delivery type:</strong> As per supplier agreement
                          </div>
                          <div className="text-muted-foreground">
                            <strong>Landmark:</strong> Industrial Estate / GIDC
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-200/90 text-xs flex items-start gap-2">
                          <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong>Full address:</strong> Shared strictly with selected suppliers after quotation approval.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. ADDITIONAL INFORMATION matching Image 1 */}
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                      <FileText className="w-4 h-4 text-[#FF5A00]" />
                      <span>Additional Information</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">RFQ ID</span>
                        <span className="text-foreground font-mono font-bold mt-0.5 block">{rfqCode}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Posted By</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Verified Buyer (Details shared after quote)
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Company Type</span>
                        <span className="text-foreground font-bold mt-0.5 block">Manufacturer / Wholesaler / Trader</span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border">
                        <span className="text-muted-foreground block">Expected Response Time</span>
                        <span className="text-foreground font-bold mt-0.5 block">Within 7 Days</span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border sm:col-span-2">
                        <span className="text-muted-foreground block">Preferred Communication</span>
                        <span className="text-foreground font-bold mt-0.5 block">Chat on BulkSkart / Direct RFQ Negotiation</span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border border-border sm:col-span-2">
                        <span className="text-muted-foreground block">Documents Required</span>
                        <span className="text-foreground font-bold mt-0.5 block">Product catalog, price list, delivery timeline</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* QUOTES TAB */}
              {activeTab === 'quotes' && (
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xl flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Quotation Proposals</h3>
                      <p className="text-xs text-white/60">Compare prices, MOQ, and terms from verified Indian manufacturers</p>
                    </div>
                    <Button
                      onClick={handleOpenSendQuote}
                      className="bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-md"
                    >
                      Send Your Quote
                    </Button>
                  </div>

                  {displayQuotes.map((q, idx) => {
                    const comp = (q as any).companies;
                    const isOwnQuote = Boolean(
                      user?.id && (q.supplier_id === user.id || (company?.id && q.supplier_company_id === company.id))
                    );
                    return (
                      <div
                        key={q.id || idx}
                        className="bg-card border border-border hover:border-[#FF5A00]/40 rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-800 border border-border overflow-hidden flex items-center justify-center font-bold text-white text-sm sm:text-base shrink-0">
                              {comp?.logo_url ? (
                                <SafeImage src={comp.logo_url} alt={comp?.company_name || 'Supplier'} className="w-full h-full object-cover" />
                              ) : (
                                <span>{(comp?.company_name || 'ST').slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-white text-sm sm:text-base leading-snug">{comp?.company_name || 'Verified Supplier'}</h4>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Verified
                                </span>
                              </div>
                              <div className="text-xs text-white/60 flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span>{comp?.business_type || 'Manufacturer'}</span>
                                <span>•</span>
                                <span>{[comp?.city, comp?.state].filter(Boolean).join(', ')}</span>
                                <span>•</span>
                                {comp?.review_count ? (
                                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                    <Star className="w-3 h-3 fill-amber-400" />
                                    {comp.rating_avg} ({comp.review_count})
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                            <div className="text-base sm:text-lg font-black text-[#FF5A00] whitespace-nowrap">
                              ₹{q.unit_price} <span className="text-xs font-semibold text-white/70">/ {q.moq_unit || 'Piece'}</span>
                            </div>
                            <div className="text-[11px] text-white/50 whitespace-nowrap">
                              Total: ₹{(q.total_price || (q.unit_price * (q.moq || 1))).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-muted/40 p-3 rounded-xl border border-border">
                          <div>
                            <span className="text-muted-foreground">MOQ:</span>{' '}
                            <strong className="text-foreground">{q.moq?.toLocaleString()} {q.moq_unit || 'Pieces'}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Delivery:</span>{' '}
                            <strong className="text-foreground">{q.delivery_days ? `${q.delivery_days} Days` : 'Not stated'}</strong>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground">Terms:</span>{' '}
                            <strong className="text-foreground truncate block">{q.payment_terms || 'Advance / LC'}</strong>
                          </div>
                        </div>

                        {q.notes && (
                          <p className="text-xs text-white/70 italic bg-white/5 p-2.5 rounded-lg border border-white/5">
                            "{q.notes}"
                          </p>
                        )}

                        {/* B2B Role Permission: Manufacturers can only message the Requirement Poster (Buyer). Only the Buyer can message quoting suppliers */}
                        {isRequirementPoster ? (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMessageSupplier(q.supplier_id, q.supplier_company_id)}
                              className="border border-border bg-white/5 text-white hover:bg-white/10 text-xs h-9 px-3 gap-1.5 w-full sm:w-auto justify-center"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Message Supplier
                            </Button>
                          </div>
                        ) : isOwnQuote ? (
                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5" /> Your Submitted Proposal
                            </span>
                            <Button
                              size="sm"
                              onClick={() => {
                                setQuotePrice(q.unit_price || '');
                                setQuoteMoq(q.moq ?? '');
                                setQuoteDeliveryDays(q.delivery_days ?? '');
                                setSendQuoteOpen(true);
                              }}
                              className="bg-white/10 hover:bg-white/15 text-white text-xs h-8 px-3"
                            >
                              Update Your Quote
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-1.5 text-xs text-white/50">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Verified Manufacturer Quote · Market Benchmark</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={handleChatWithBuyer}
                              className="border border-[#FF5A00]/40 bg-[#FF5A00]/10 hover:bg-[#FF5A00]/20 text-[#FF5A00] font-bold text-xs h-8 px-3 gap-1.5 w-full sm:w-auto justify-center"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Chat with Requirement Poster
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* HISTORY TAB: only events that are recorded */}
              {activeTab === 'history' && (
                <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                  <h3 className="text-lg font-bold text-white">RFQ Timeline</h3>
                  <div className="border-l-2 border-[#FF5A00] pl-4 space-y-4 ml-2 text-xs">
                    <div>
                      <div className="text-[#FF5A00] font-bold">Requirement Posted</div>
                      <div className="text-white/50 text-[11px]">
                        {req ? new Date(req.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                      <p className="text-white/80 mt-0.5">
                        {req?.quantity.toLocaleString()} {req?.quantity_unit} of {req?.title}
                      </p>
                    </div>
                    {quotes.length > 0 && (
                      <div>
                        <div className="text-white font-bold">Quotations Received</div>
                        <p className="text-white/80 mt-0.5">{quotes.length} quotation{quotes.length === 1 ? '' : 's'} submitted by suppliers.</p>
                      </div>
                    )}
                    {req?.deadline && (
                      <div>
                        <div className="text-amber-400 font-bold">Deadline</div>
                        <p className="text-white/80 mt-0.5">{new Date(req.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Buyer Card, Deal Pipeline, Similar RFQs, Suppliers (4/12 cols) */}
            <div className="lg:col-span-4 space-y-5 md:space-y-6 min-w-0">

              {/* ─── AI PRODUCT MATCH CARD (Gated behind ₹7,500 Business Package or ₹7,500 AI Add-on) ─── */}
              {hasAiMatchingAccess && aiMatchedProducts.length > 0 ? (
                <div className="bg-card border-2 border-[#FF5A00]/30 hover:border-[#FF5A00]/50 rounded-2xl p-4 sm:p-5 shadow-xl transition-all space-y-3.5 bg-gradient-to-b from-[#1C1510] via-card to-card">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-[#FF5A00]/15 text-[#FF5A00]">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                          AI Product Match
                        </h3>
                        <p className="text-[11px] text-white/50">
                          AI found these products from your catalogue
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-[#FF5A00]/20 text-[#FF5A00] border-[#FF5A00]/40 text-[10px] font-mono">
                      {aiMatchedProducts[0].matchScore}% Top Match
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {aiMatchedProducts.map((prod, idx) => (
                      <div
                        key={prod.id || idx}
                        className="bg-[#12141F] border border-white/10 hover:border-[#FF5A00]/40 rounded-xl p-3 space-y-2.5 transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          {prod.image && (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-12 h-12 rounded-lg object-cover bg-black/40 border border-white/10 shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-white truncate">{prod.name}</h4>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono shrink-0">
                                {prod.matchScore}% Match
                              </span>
                            </div>
                            <div className="text-[11px] text-white/60 mt-0.5">
                              Price: <strong className="text-white">₹{prod.priceINR.toLocaleString('en-IN')}</strong> / {prod.moqUnit}
                            </div>
                          </div>
                        </div>

                        {/* Specs grid: Match %, Product price, MOQ, Available quantity, Estimated delivery */}
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-[#171A27] p-2 rounded-lg border border-white/5">
                          <div className="text-white/60">
                            MOQ: <span className="font-bold text-white">{prod.moq} {prod.moqUnit}</span>
                          </div>
                          <div className="text-white/60">
                            Available Qty: <span className="font-bold text-white">{prod.availableQuantity.toLocaleString()}</span>
                          </div>
                          <div className="text-white/60 col-span-2">
                            Estimated Delivery: <span className="font-bold text-emerald-400">{prod.estimatedDeliveryDays} days</span>
                          </div>
                        </div>

                        {/* CTA: Use for Quote (Prompt Requirement) */}
                        <Button
                          onClick={() => handleOpenAiQuoteModal(prod)}
                          size="sm"
                          className="w-full bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold text-xs h-9 rounded-xl shadow-md gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Use for Quote</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Non-subscribed upgrade CTA card */
                <div className="bg-[#12141E] border-2 border-[#FF5A00]/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 bg-gradient-to-b from-[#1C1510] via-[#12141E] to-[#12141E]">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-[#FF5A00]/20 text-[#FF5A00]">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                          AI Product Matching
                        </h3>
                        <p className="text-[11px] text-white/50">
                          Automated factory catalogue RFQ matching
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-[#FF5A00]/20 text-[#FF5A00] border-[#FF5A00]/40 text-[10px] font-bold">
                      ₹7,500 Plan / Add-on
                    </Badge>
                  </div>

                  <p className="text-xs text-white/70 leading-relaxed">
                    Instantly match your factory catalog products with live buyer RFQs, auto-calculate MOQ margins, and generate 1-click quotations.
                  </p>

                  <div className="space-y-2 text-xs bg-[#171A27] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-white/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                      <span>94%+ Automatic Catalog Spec Match</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                      <span>1-Click AI Quotation Generator</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                      <span>50 Live RFQ Direct Responses / Month (Unlimited on Growth)</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                      <span>Verified Manufacturer Seal & Priority Inbox</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (!user) {
                        setSubDialogReason('not_logged_in');
                      } else if (!company) {
                        setSubDialogReason('not_registered_business');
                      } else {
                        setSubDialogReason('ai_matching_subscription');
                      }
                      setSubscribeDialogOpen(true);
                    }}
                    className="w-full bg-[#FF5A00] hover:bg-[#e04f00] text-white font-extrabold text-xs h-11 rounded-xl shadow-lg shadow-[#FF5A00]/20 gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Unlock AI Product Match — ₹7,500/mo or AI Add-on</span>
                  </Button>
                </div>
              )}

              {/* 1. BUYER INFORMATION CARD */}
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-white">Buyer Information</h3>
                  {buyerProfile.verified && (
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified Buyer
                    </span>
                  )}
                </div>

                <div className="pt-3.5 space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-border flex items-center justify-center font-bold text-white text-base shrink-0 shadow-sm">
                      {buyerProfile.initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-white text-sm sm:text-base leading-snug">{buyerProfile.name}</h4>
                      {buyerProfile.location && <p className="text-xs text-white/70 mt-0.5">{buyerProfile.location}</p>}
                      {buyerProfile.memberSince && <p className="text-[11px] text-white/50 mt-0.5">Member since {buyerProfile.memberSince}</p>}
                    </div>
                  </div>

                  {/* Buyer phone: only a real number, and only for paid subscribers */}
                  {buyerProfile.phone && (
                    <div className="pt-1">
                      <ProtectedContact phone={buyerProfile.phone} name={buyerProfile.name} contactType="buyer" variant="card" />
                    </div>
                  )}

                  {/* Buyer CTA Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <Button
                      onClick={handleOpenSendQuote}
                      className="w-full bg-[#FF5A00] hover:bg-[#e04f00] text-white font-extrabold text-sm h-11 rounded-xl shadow-[0_2px_12px_rgba(255,90,0,0.4)] flex items-center justify-center gap-2"
                    >
                      <span>Send Quote</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={handleChatWithBuyer}
                      className="w-full border border-border bg-white/5 hover:bg-white/10 text-white font-bold text-sm h-11 rounded-xl flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4 text-[#FF5A00]" />
                      <span>Message {buyerProfile.name.split(' ')[0]}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* 2. DEAL STATUS PIPELINE matching Image 1 */}
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-white">Deal Status</h3>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>

                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {PIPELINE_STEPS.slice(0, 3).map((step) => {
                      const Icon = step.icon;
                      const isActive = step.key === 'active';
                      return (
                        <div key={step.key} className="flex flex-col items-center">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                              isActive
                                ? 'bg-[#FF5A00] text-white border-[#FF5A00] shadow-[0_0_12px_rgba(255,90,0,0.5)]'
                                : 'bg-[#181B26] text-white/50 border-border'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`text-[11px] mt-1.5 font-bold ${isActive ? 'text-[#FF5A00]' : 'text-white/60'}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/5">
                    {PIPELINE_STEPS.slice(3, 6).map((step) => {
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex flex-col items-center">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center border bg-[#181B26] text-white/40 border-border">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] mt-1.5 font-medium text-white/50">
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. SIMILAR REQUIREMENTS: real requirements only */}
              {similarReqs.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-white">Similar Requirements</h3>
                  <Link to="/requirements" className="text-xs font-bold text-[#FF5A00] hover:text-[#ff782e] flex items-center gap-1">
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="pt-3 space-y-3">
                  {similarReqs.map((r) => ({
                    id: r.id,
                    title: r.title,
                    category: r.categories?.name || '',
                    location: [r.destination_city, r.destination_country].filter(Boolean).join(', '),
                    date: new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    image: r.attachment_url || '',
                  })).map((sReq) => (
                    <Link
                      key={sReq.id}
                      to={`/requirements/${sReq.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-[#141722] hover:bg-[#1E2232] border border-white/5 hover:border-[#FF5A00]/40 transition-all group"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/50 shrink-0 border border-border">
                        <SafeImage src={sReq.image} alt={sReq.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white group-hover:text-[#FF5A00] transition-colors truncate">
                          {sReq.title}
                        </h4>
                        <div className="text-[11px] text-white/50 truncate mt-0.5">
                          {sReq.category}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1">
                          <span className="truncate">{sReq.location}</span>
                          <span>•</span>
                          <span>{sReq.date}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              )}

              {/* 4. RECOMMENDED SUPPLIERS: verified companies from the database */}
              {recommendedSuppliers.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="text-base font-bold text-white">Recommended Suppliers</h3>
                  <Link to="/companies" className="text-xs font-bold text-[#FF5A00] hover:text-[#ff782e] flex items-center gap-1">
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="pt-3 space-y-3">
                  {recommendedSuppliers.map((c) => ({
                    id: c.id,
                    slug: c.slug,
                    name: c.company_name,
                    type: c.business_type || 'Supplier',
                    location: [c.city, c.country].filter(Boolean).join(', '),
                    rating: c.rating_avg,
                    reviews: c.review_count,
                  })).map((sup, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#141722] border border-white/5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-800 border border-border flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {sup.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{sup.name}</h4>
                            <div className="text-[10px] text-white/50 truncate">
                              {sup.type} • {sup.location}
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                          Verified
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        {sup.reviews ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {sup.rating} ({sup.reviews})
                          </span>
                        ) : <span />}
                        <Link to={`/companies/${sup.slug}`}>
                          <Button
                            size="sm"
                            className="bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold text-[11px] h-7 px-3 rounded-lg"
                          >
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          </div>

          {/* ── YOU MAY ALSO LIKE: real products only ───────── */}
          {relatedProducts.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                You may <span className="text-[#FF5A00]">also like</span>
              </h2>
              <Link to="/products" className="text-xs font-bold text-[#FF5A00] hover:text-[#ff782e] flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {relatedProducts.map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                moq: p.moq ? `${p.moq.toLocaleString()} ${p.moq_unit || ''}`.trim() : 'On request',
                price: p.price_min != null
                  ? `${p.price_currency || 'INR'} ${p.price_min.toLocaleString()}${p.price_max != null && p.price_max !== p.price_min ? ` - ${p.price_max.toLocaleString()}` : ''}`
                  : 'Price on request',
                image: p.images?.[0] || '',
              })).map(prod => {
                const isLiked = likedProducts[prod.id] || false;
                return (
                  <div
                    key={prod.id}
                    className="bg-card border border-border hover:border-[#FF5A00]/40 rounded-xl overflow-hidden transition-all group flex flex-col shadow-md"
                  >
                    <div className="aspect-square relative bg-black/40 overflow-hidden">
                      <SafeImage
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={() => {
                          setLikedProducts(prev => ({ ...prev, [prod.id]: !isLiked }));
                          toast.success(!isLiked ? 'Added to favorites' : 'Removed from favorites');
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-border transition-all"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                      </button>
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <Link to={`/products/${prod.slug}`} className="block">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#FF5A00] transition-colors">
                            {prod.name}
                          </h4>
                        </Link>
                        <div className="text-[10px] text-white/50 mt-0.5">
                          MOQ: <span className="text-emerald-400 font-semibold">{prod.moq}</span>
                        </div>
                      </div>
                      <div className="text-xs font-extrabold text-[#FF5A00] mt-1.5 truncate">
                        {prod.price}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ── MOBILE FIXED BOTTOM ACTION BAR matching Image 2 ──────────────── */}
      {(
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-2.5 px-4 md:hidden flex items-center gap-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] pb-safe">
          <Button
            variant="ghost"
            onClick={handleChatWithBuyer}
            className="flex-1 border border-border bg-white/5 hover:bg-white/10 text-white font-bold text-xs h-11 rounded-xl flex items-center justify-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4 text-[#FF5A00]" />
            <span>Message Buyer</span>
          </Button>

          <Button
            onClick={handleOpenSendQuote}
            className="flex-1 bg-[#FF5A00] hover:bg-[#e04f00] text-white font-extrabold text-xs h-11 rounded-xl shadow-[0_2px_12px_rgba(255,90,0,0.4)] flex items-center justify-center gap-1.5"
          >
            <span>Send Quote</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── FULLSCREEN IMAGE ZOOM MODAL ──────────────────────────────────── */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-white pb-2 border-b border-border">
            <div className="text-sm font-bold truncate max-w-md">
              {req.title} • Image {activeImageIndex + 1} of {galleryImages.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                className="text-white hover:bg-white/10 h-8 w-8 p-0"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono">{Math.round(zoomLevel * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                className="text-white hover:bg-white/10 h-8 w-8 p-0"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFullscreenImage(false);
                  setZoomLevel(1);
                }}
                className="text-white hover:bg-white/10 h-8 px-3 rounded-lg text-xs"
              >
                Close
              </Button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto p-4 relative">
            <img
              src={galleryImages[activeImageIndex]}
              alt="Fullscreen Zoom View"
              style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out' }}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            />
          </div>

          <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 border-t border-border">
            {galleryImages.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveImageIndex(i);
                  setZoomLevel(1);
                }}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  activeImageIndex === i ? 'border-[#FF5A00]' : 'border-border opacity-60'
                }`}
              >
                <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 3-STEP SUBMIT QUOTATION WIZARD (MATCHING SCREENS 3, 4, 5) ─────────────────── */}
      <SubmitQuotationWizard
        open={sendQuoteOpen}
        onOpenChange={setSendQuoteOpen}
        rfq={{
          id: req.id,
          reqNumber: rfqCode,
          title: req.title,
          quantity: req.quantity,
          quantityUnit: req.quantity_unit,
          targetPriceMin: req.budget_min || 60,
          targetPriceMax: req.budget_max || 75,
          deliveryLocation: buyerLocation,
          deliveryTimeText: 'Within 7-10 days',
          paymentTerms: '50% advance, 50% before dispatch',
          endSecondsRemaining: 26 * 60 + 51
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      <SubscribeToContactDialog
        open={subscribeDialogOpen}
        onClose={() => setSubscribeDialogOpen(false)}
        reason={subDialogReason}
      />

      {/* AI Quotation Draft Modal (Prompt Requirement: Never send without manufacturer confirmation) */}
      <AIQuotationModal
        open={aiQuoteModalOpen}
        onOpenChange={setAiQuoteModalOpen}
        requirement={req}
        product={selectedAiProduct}
        initialDraft={aiQuotationDraft}
        onSuccess={() => {
          loadData();
        }}
        onRequireSubscription={() => {
          setSubDialogReason('quotation_subscription');
          setSubscribeDialogOpen(true);
        }}
      />

    </MainLayout>
  );
}
