import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  getConversations,
  getMessages,
  sendSecureMessage,
  markConversationRead,
  getSupplierInquiries,
  replyToSupplierInquiry,
  ensureManufacturerWelcomeLeads,
} from '@/lib/api';
import type { Conversation, Message, SupplierInquiry } from '@/types/types';
import { supabase } from '@/db/supabase';
import {
  Send, MessageSquare, Package, Loader2, WifiOff, RefreshCw, ArrowRight, ArrowLeft,
  Download, Building2, Sparkles, ChevronDown, ChevronUp, Mail, Phone, User, Clock,
  CheckCircle2, BadgeCheck, FileText, Globe, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PageMeta from '@/components/common/PageMeta';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { exportChatTranscript } from '@/utils/exportChatTranscript';
import ProtectedContact from '@/components/common/ProtectedContact';

export default function MessagesPage() {
  const { user, profile, company, isPaidSubscriber } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inquiries, setInquiries] = useState<SupplierInquiry[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<SupplierInquiry | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [sidebarTab, setSidebarTab] = useState<'all' | 'inquiries' | 'chats'>('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [inquiryReply, setInquiryReply] = useState('');
  const [replyingInquiry, setReplyingInquiry] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [realtimeOk, setRealtimeOk] = useState(true);
  const [subExpired, setSubExpired] = useState(false);
  const [showAiReplies, setShowAiReplies] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isBuyer = profile?.role === 'buyer';
  /** Suppliers may browse inbox free; replies require an active paid plan */
  const canReplyAsSupplier = isBuyer || Boolean(isPaidSubscriber);
  const subscriptionPath = isBuyer ? '/pricing' : '/dashboard/supplier/subscription';

  const requirePaidReply = useCallback(() => {
    if (canReplyAsSupplier) return false;
    toast.message('Subscription required to reply', {
      description: 'Activate a manufacturer plan to send quotes and chat replies.',
    });
    setSubExpired(true);
    return true;
  }, [canReplyAsSupplier]);

  // AI Chat Assistant: Suggested replies for manufacturers
  const aiChatSuggestions = useMemo(() => {
    const prodName = selectedConv?.product?.name || selectedInquiry?.product_name || 'our products';
    const contact = selectedConv ? getContactName(selectedConv) : selectedInquiry ? selectedInquiry.sender_name : 'there';
    return [
      {
        id: 'msg-1',
        category: 'Quote & Specs',
        text: `Hello ${contact}, we have verified factory capacity for ${prodName}. Our direct manufacturer rate is competitive with export packaging included. Would you like us to submit a formal quotation?`,
      },
      {
        id: 'msg-2',
        category: 'MOQ & Discount',
        text: `Hi ${contact}, regarding your volume order for ${prodName}: we can offer a tiered volume discount and flexible MOQ batches to support your procurement timeline.`,
      },
      {
        id: 'msg-3',
        category: 'Lead Time & Logistics',
        text: `We can manufacture and dispatch within 12–15 business days with complete GST/export invoices, certificate of origin, and laboratory quality test reports.`,
      },
    ];
  }, [selectedConv, selectedInquiry]);

  // ── Load conversations and direct profile inquiries ─────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    let data: Conversation[] = [];
    if (user) {
      data = await getConversations(user.id, company?.id);
      setConversations(data);
    }
    // Manufacturers: ensure 5 sample lead messages exist (one-time, automatic)
    if (user && company?.id && profile?.role === 'supplier') {
      ensureManufacturerWelcomeLeads(company.id, company.company_name || 'Your Factory');
    }
    const inqs = getSupplierInquiries(company?.id, user?.id);
    setInquiries(inqs);
    setLoadingConvs(false);
    if (!selectedConv && !selectedInquiry) {
      if (inqs.length > 0) setSelectedInquiry(inqs[0]);
      else if (data.length > 0) setSelectedConv(data[0]);
    }
  }, [user, company?.id, company?.company_name, profile?.role, selectedConv, selectedInquiry]);

  useEffect(() => {
    loadConversations();
    const handleInquiryUpdate = () => {
      const inqs = getSupplierInquiries(company?.id, user?.id);
      setInquiries(inqs);
    };
    window.addEventListener('bulkskart:inquiry_updated', handleInquiryUpdate);
    return () => window.removeEventListener('bulkskart:inquiry_updated', handleInquiryUpdate);
  }, [loadConversations, company?.id, user]);

  // ── Load messages + realtime for selected conversation ───────────────────
  useEffect(() => {
    if (!selectedConv) return;
    setSubExpired(false);
    setLoadingMsgs(true);
    getMessages(selectedConv.id).then(data => {
      setMessages(data);
      setLoadingMsgs(false);
    });

    // Mark read
    if (user) {
      markConversationRead(
        selectedConv.id,
        user.id,
        isBuyer ? 'buyer' : 'supplier'
      );
      // Update local unread count to 0
      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id
          ? { ...c, buyer_unread: isBuyer ? 0 : c.buyer_unread, supplier_unread: !isBuyer ? 0 : c.supplier_unread }
          : c
      ));
    }

    // Unsubscribe old channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    try {
      const chName = `msgs-page-${selectedConv.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const ch = supabase
        .channel(chName)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `conversation_id=eq.${selectedConv.id}`,
        }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          // Auto-clear unread on new message while page is open
          if (user) markConversationRead(selectedConv.id, user.id, isBuyer ? 'buyer' : 'supplier');
          // Refresh conversation list to update last_message
          loadConversations();
        })
        .subscribe((status) => setRealtimeOk(status === 'SUBSCRIBED'));

      channelRef.current = ch;
    } catch (e) {
      console.warn('MessagesPage realtime subscription skipped:', e);
    }

    return () => { 
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current); 
        channelRef.current = null; 
      }
    };
  }, [selectedConv?.id, user, isBuyer]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedConv || sending) return;
    if (requirePaidReply()) return;
    setSending(true);
    const { error } = await sendSecureMessage(selectedConv.id, input.trim());
    setSending(false);
    if (error === 'subscription_expired' || error === 'not_authenticated') {
      setSubExpired(true);
      return;
    }
    if (error === 'recipient_subscription_expired') {
      toast.error('The other party\'s subscription has expired. Messaging is paused.');
      return;
    }
    if (error) {
      toast.error('Failed to send message. Please try again.');
      return;
    }
    setInput('');
  };

  const getContactName = (conv: Conversation) => {
    if (!user) return 'Unknown';
    return conv.buyer_id === user.id
      ? conv.companies?.company_name ?? conv.supplier?.full_name ?? 'Supplier'
      : conv.buyer?.full_name ?? 'Buyer';
  };

  const getUnreadCount = (conv: Conversation) => {
    if (!user) return 0;
    return conv.buyer_id === user.id ? conv.buyer_unread : conv.supplier_unread;
  };

  const handleExportTranscript = () => {
    if (!selectedConv || messages.length === 0) {
      toast.info('No messages to export in this thread');
      return;
    }
    const otherPartyName = getContactName(selectedConv);
    exportChatTranscript({
      conversationId: selectedConv.id,
      participant1: {
        name: profile?.full_name || 'You',
        role: isBuyer ? 'Buyer' : 'Manufacturer',
      },
      participant2: {
        name: otherPartyName,
        role: isBuyer ? 'Manufacturer' : 'Buyer',
      },
      productName: selectedConv.product?.name,
      messages: messages.map(m => ({
        id: m.id,
        senderName: m.sender_id === user?.id ? (profile?.full_name || 'You') : otherPartyName,
        role: m.sender_id === user?.id ? (isBuyer ? 'Buyer' : 'Manufacturer') : (isBuyer ? 'Manufacturer' : 'Buyer'),
        content: m.content,
        createdAt: m.created_at,
      })),
    });
    toast.success('Negotiation transcript exported');
  };

  const handleSendInquiryReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !inquiryReply.trim() || replyingInquiry) return;
    if (requirePaidReply()) return;
    setReplyingInquiry(true);
    const senderName = profile?.full_name || company?.company_name || 'Supplier Sales Team';
    const res = replyToSupplierInquiry(selectedInquiry.id, inquiryReply.trim(), senderName);
    setReplyingInquiry(false);
    if (res.success && res.reply) {
      const updatedReplies = [...(selectedInquiry.replies || []), res.reply];
      setSelectedInquiry(prev => prev ? {
        ...prev,
        status: 'replied',
        replies: updatedReplies,
      } : null);
      setInquiryReply('');
      toast.success('Reply saved and notification dispatched to buyer!');
      if (user) {
        const inqs = getSupplierInquiries(company?.id, user.id);
        setInquiries(inqs);
      }
    } else {
      toast.error('Failed to send reply');
    }
  };

  const insertQuickReply = (text: string) => {
    if (requirePaidReply()) return;
    setInquiryReply(text);
  };

  const handleExportInquiryTranscript = () => {
    if (!selectedInquiry) return;
    exportChatTranscript({
      conversationId: `inq-${selectedInquiry.id}`,
      participant1: {
        name: profile?.full_name || company?.company_name || 'Supplier',
        role: 'Manufacturer',
      },
      participant2: {
        name: selectedInquiry.sender_name,
        role: 'Buyer',
      },
      productName: selectedInquiry.product_name ?? undefined,
      messages: [
        {
          id: `inq-msg-${selectedInquiry.id}`,
          senderName: selectedInquiry.sender_name,
          role: 'Buyer',
          content: `${selectedInquiry.subject ? `[${selectedInquiry.subject}] ` : ''}${selectedInquiry.message}${selectedInquiry.target_quantity ? ` (Target MOQ: ${selectedInquiry.target_quantity})` : ''}`,
          createdAt: selectedInquiry.created_at,
        },
        ...(selectedInquiry.replies || []).map(r => ({
          id: r.id,
          senderName: r.sender_name,
          role: 'Manufacturer' as const,
          content: r.content,
          createdAt: r.created_at,
        })),
      ],
    });
    toast.success('Inquiry transcript exported');
  };

  return (
    <DashboardLayout>
      <PageMeta
        title="Messages | BulkSkart"
        description="BulkSkart dashboard — manage your account, orders and trade activity."
        robots="noindex, nofollow"
      />
      <div className="flex-1 min-w-0 flex overflow-hidden" style={{ height: 'calc(100vh - 3.5rem)' }}>

        {/* ── Conversations & Inquiries sidebar ─────────────────────────────────── */}
        <div className={cn("w-full md:w-80 shrink-0 border-r border-border bg-sidebar flex-col", mobileView === 'chat' ? 'hidden md:flex' : 'flex')}>
          <div className="px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-sidebar-foreground">Messages & Inquiries</h2>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-semibold">
                {inquiries.length + conversations.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Real-time buyer chats & profile direct inquiries</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-sidebar-border text-xs px-2 pt-1">
            <button
              onClick={() => setSidebarTab('all')}
              className={cn("flex-1 py-1.5 text-center font-medium border-b-2 transition-colors text-[11px]",
                sidebarTab === 'all' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              All ({inquiries.length + conversations.length})
            </button>
            <button
              onClick={() => setSidebarTab('inquiries')}
              className={cn("flex-1 py-1.5 text-center font-medium border-b-2 transition-colors text-[11px]",
                sidebarTab === 'inquiries' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              Profile Inquiries ({inquiries.length})
            </button>
            <button
              onClick={() => setSidebarTab('chats')}
              className={cn("flex-1 py-1.5 text-center font-medium border-b-2 transition-colors text-[11px]",
                sidebarTab === 'chats' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              Live Chats ({conversations.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="space-y-2 p-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : (inquiries.length === 0 && conversations.length === 0) ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No conversations or direct inquiries yet.</p>
                <p className="text-[11px] text-muted-foreground mt-1">Visitors can send inquiries directly from your profile.</p>
              </div>
            ) : (
              <div className="divide-y divide-sidebar-border/50">
                {/* 1. Direct Profile Inquiries */}
                {(sidebarTab === 'all' || sidebarTab === 'inquiries') && inquiries.map(inq => {
                  const isSelected = selectedInquiry?.id === inq.id;
                  const isNew = inq.status === 'new';
                  return (
                    <button
                      key={inq.id}
                      onClick={() => {
                        setSelectedInquiry(inq);
                        setSelectedConv(null);
                        setMobileView('chat');
                      }}
                      className={cn(
                        'w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-sidebar-accent transition-colors border-l-2',
                        isSelected ? 'bg-sidebar-accent border-primary' : 'border-transparent'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {inq.sender_name[0]?.toUpperCase() || 'B'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-sidebar-foreground truncate">{inq.sender_name}</p>
                          <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-500/10 px-1 rounded shrink-0">
                            Profile Chat
                          </span>
                        </div>
                        {inq.product_name && (
                          <p className="text-[10px] text-primary/80 truncate flex items-center gap-1 mt-0.5">
                            <Package className="w-2.5 h-2.5 shrink-0" />{inq.product_name}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{inq.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                          <span>{new Date(inq.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          {inq.status === 'replied' ? (
                            <span className="text-[#FF5A00] font-medium">Replied ({inq.replies?.length || 1})</span>
                          ) : (
                            <span className="text-emerald-500 font-semibold">New Inquiry</span>
                          )}
                        </div>
                      </div>
                      {isNew && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" title="New unread inquiry" />
                      )}
                    </button>
                  );
                })}

                {/* 2. Live Chats / Conversations */}
                {(sidebarTab === 'all' || sidebarTab === 'chats') && conversations.map(conv => {
                  const name = getContactName(conv);
                  const unread = getUnreadCount(conv);
                  const isSelected = selectedConv?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConv(conv);
                        setSelectedInquiry(null);
                        setSubExpired(false);
                        setMobileView('chat');
                      }}
                      className={cn(
                        'w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-sidebar-accent transition-colors border-l-2',
                        isSelected ? 'bg-sidebar-accent border-primary' : 'border-transparent'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">
                        {name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-sidebar-foreground truncate">{name}</p>
                          <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded shrink-0">
                            Live Chat
                          </span>
                        </div>
                        {conv.product?.name && (
                          <p className="text-[10px] text-primary/80 truncate flex items-center gap-1 mt-0.5">
                            <Package className="w-2.5 h-2.5 shrink-0" />{conv.product.name}
                          </p>
                        )}
                        {conv.last_message && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                        )}
                      </div>
                      {unread > 0 && (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] text-primary-foreground shrink-0 mt-1">
                          {unread > 9 ? '9+' : unread}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Chat / Inquiry window ───────────────────────────────────────────── */}
        <div className={cn("flex-1 min-w-0 flex flex-col", mobileView === 'list' ? 'hidden md:flex' : 'flex')}>
          {!selectedConv && !selectedInquiry ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-medium">Select a conversation or direct inquiry to start chatting</p>
              <p className="text-xs text-muted-foreground">Inquiries from your supplier profile and live chats will show here</p>
            </div>
          ) : selectedInquiry ? (
            /* ── DIRECT PROFILE INQUIRY VIEW ────────────────── */
            <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-background">
              {/* Inquiry Header */}
              <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-lg"
                  aria-label="Back to inquiries list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
                  {selectedInquiry.sender_name[0]?.toUpperCase() || 'B'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-foreground truncate">{selectedInquiry.sender_name}</p>
                    {selectedInquiry.sender_company && (
                      <span className="text-xs text-muted-foreground truncate">({selectedInquiry.sender_company})</span>
                    )}
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Direct Supplier Inquiry
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5 text-xs text-muted-foreground">
                    {selectedInquiry.sender_email && (
                      <a href={`mailto:${selectedInquiry.sender_email}`} className="flex items-center gap-1 hover:text-primary hover:underline">
                        <Mail className="w-3 h-3 text-primary" /> {selectedInquiry.sender_email}
                      </a>
                    )}
                    {selectedInquiry.sender_phone && (
                      <a href={`tel:${selectedInquiry.sender_phone}`} className="flex items-center gap-1 hover:text-primary hover:underline">
                        <Phone className="w-3 h-3 text-emerald-500" /> {selectedInquiry.sender_phone}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to="/dashboard/supplier/quotes">
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                      title="Create or manage formal quotation for this buyer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Submit Formal Quote</span>
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportInquiryTranscript}
                    className="h-8 gap-1.5 text-xs border-border"
                    title="Export inquiry transcript"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              </div>

              {/* Inquiry Content & Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Target Product Banner */}
                {selectedInquiry.product_name && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{selectedInquiry.product_name}</p>
                        {selectedInquiry.target_quantity && (
                          <p className="text-[11px] text-muted-foreground">Requested Quantity / MOQ: <span className="font-bold text-foreground">{selectedInquiry.target_quantity}</span></p>
                        )}
                      </div>
                    </div>
                    {selectedInquiry.product_slug && (
                      <Link to={`/products/${selectedInquiry.product_slug}`} target="_blank" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5 shrink-0">
                        View Product <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                )}

                {/* Initial Buyer Inquiry Bubble */}
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedInquiry.sender_name}</span>
                    <span>•</span>
                    <span>{new Date(selectedInquiry.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="max-w-[85%] bg-card border border-border rounded-2xl rounded-tl-sm p-4 shadow-xs space-y-2">
                    {selectedInquiry.subject && (
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span className="text-primary">Subject:</span> {selectedInquiry.subject}
                      </p>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{selectedInquiry.message}</p>
                  </div>
                </div>

                {/* Replies Thread */}
                {(selectedInquiry.replies || []).map((reply) => {
                  const isSupplier = reply.sender === 'supplier' || reply.sender_name.toLowerCase().includes('supplier') || reply.sender_name.toLowerCase().includes('sales');
                  return (
                    <div key={reply.id} className={cn("flex flex-col gap-1", isSupplier ? "items-end" : "items-start")}>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{reply.sender_name}</span>
                        <span>•</span>
                        <span>{new Date(reply.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                      <div className={cn(
                        "max-w-[85%] p-3.5 rounded-2xl text-sm shadow-xs",
                        isSupplier ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border text-foreground rounded-tl-sm"
                      )}>
                        <p className="whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inquiry Quick AI Replies — locked for unpaid manufacturers */}
              <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-primary" /> Quick Quote & Replies:
                </span>
                <button
                  type="button"
                  onClick={() => insertQuickReply(`Dear ${selectedInquiry.sender_name}, based on your requested target volume of ${selectedInquiry.target_quantity || '1,000'} ${selectedInquiry.quantity_unit || 'units'}, our direct factory price is $2.15/unit FOB. Lead time is 12–14 days with standard export seaworthy packaging. Shall we prepare a formal proforma invoice?`)}
                  className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold rounded-full px-2.5 py-1 whitespace-nowrap transition-colors"
                >
                  ⚡ Send Pricing Quote ($/unit)
                </button>
                <button
                  type="button"
                  onClick={() => insertQuickReply(`Hello ${selectedInquiry.sender_name}, thank you for your inquiry! We have ready factory capacity for ${selectedInquiry.product_name || 'this requirement'}. Please confirm your destination port so we can include CIF freight estimates.`)}
                  className="text-[10px] bg-card hover:bg-muted border border-border rounded-full px-2.5 py-1 whitespace-nowrap text-foreground transition-colors"
                >
                  Accept & Request Port
                </button>
                <button
                  type="button"
                  onClick={() => insertQuickReply(`Hi ${selectedInquiry.sender_name}, our factory is ISO 9001 and ISO 14001 certified. We provide 3.1 mill test certificates, pre-shipment inspection reports, and sample testing for quality clearance.`)}
                  className="text-[10px] bg-card hover:bg-muted border border-border rounded-full px-2.5 py-1 whitespace-nowrap text-foreground transition-colors"
                >
                  Quality & Certifications
                </button>
                <button
                  type="button"
                  onClick={() => insertQuickReply(`Hello ${selectedInquiry.sender_name}, we have sent product technical specifications to your email ${selectedInquiry.sender_email}. Feel free to contact our engineering desk.`)}
                  className="text-[10px] bg-card hover:bg-muted border border-border rounded-full px-2.5 py-1 whitespace-nowrap text-foreground transition-colors"
                >
                  Confirm Email Dispatch
                </button>
              </div>

              {/* Reply Form — subscription gate for unpaid manufacturers */}
              {!canReplyAsSupplier ? (
                <div className="px-4 py-4 border-t border-border shrink-0 bg-amber-500/5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">Subscribe to reply to buyers</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          You can read all inquiries. An active manufacturer plan unlocks quotes and chat replies.
                        </p>
                      </div>
                    </div>
                    <Link to={subscriptionPath} className="shrink-0 w-full sm:w-auto">
                      <Button className="w-full sm:w-auto bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold gap-1.5 text-xs h-9">
                        <Sparkles className="w-3.5 h-3.5" /> View Plans &amp; Subscribe
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInquiryReply} className="px-4 py-3 border-t border-border flex gap-2 shrink-0 bg-background">
                  <Input
                    value={inquiryReply}
                    onChange={e => setInquiryReply(e.target.value)}
                    placeholder={`Reply to ${selectedInquiry.sender_name}…`}
                    className="flex-1 bg-card border-border text-foreground"
                    disabled={replyingInquiry}
                    maxLength={4000}
                  />
                  <Button type="submit" disabled={replyingInquiry || !inquiryReply.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 font-bold">
                    {replyingInquiry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              )}
            </div>
          ) : selectedConv ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-lg"
                  aria-label="Back to conversations list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {getContactName(selectedConv)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{getContactName(selectedConv)}</p>
                  <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
                    {selectedConv.product?.name && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <Package className="w-3 h-3 shrink-0 text-primary" />
                        {selectedConv.product.name}
                      </p>
                    )}
                    <ProtectedContact
                      phone={(selectedConv.buyer as any)?.phone || (selectedConv.supplier as any)?.phone}
                      contactType="inquiry"
                      variant="inline"
                      showActions={false}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportTranscript}
                    className="h-8 gap-1.5 text-xs border-border"
                    title="Export conversation transcript"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  {!realtimeOk && (
                    <span className="flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2 py-0.5 shrink-0">
                      <WifiOff className="w-3 h-3" /> Disconnected
                    </span>
                  )}
                </div>
              </div>

              {/* Realtime error banner */}
              {!realtimeOk && (
                <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs shrink-0">
                  <WifiOff className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">Connection lost. Messages may be delayed.</span>
                  <button onClick={() => window.location.reload()} className="underline font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Reconnect
                  </button>
                </div>
              )}

              {/* Subscription required / expired overlay for replies */}
              {(subExpired || !canReplyAsSupplier) ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Keep message history readable */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMsgs ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-10">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No messages yet. Subscribe to start the conversation.</p>
                      </div>
                    ) : messages.map(msg => {
                      const isMine = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div className={cn(
                            'max-w-[85%] p-3 rounded-2xl text-sm shadow-xs',
                            isMine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border text-foreground rounded-tl-sm'
                          )}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                  <div className="px-4 py-5 border-t border-border bg-amber-500/5 text-center space-y-3 shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">
                        {subExpired && canReplyAsSupplier ? 'Your subscription has expired' : 'Subscribe to reply to this buyer'}
                      </p>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        You can read the full thread. Activate a manufacturer plan to send quotes and chat replies.
                      </p>
                    </div>
                    <Link to={subscriptionPath}>
                      <Button className="bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold gap-2">
                        <Sparkles className="w-4 h-4" /> View Plans &amp; Subscribe <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMsgs ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-10">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No messages yet. Start the conversation.</p>
                      </div>
                    ) : messages.map(msg => {
                      const isMine = msg.sender_id === user?.id;
                      const isUrgent = /(?:^|\b)(?:urgent|asap|emergency|rush|immediate|priority)(?:\b|$)/i.test(msg.content);
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          {!isMine && (
                            <div className="flex items-center gap-1.5 mb-1 px-1">
                              <span className="text-[11px] font-bold text-foreground/80 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-primary" />
                                {getContactName(selectedConv)}
                              </span>
                              {isUrgent && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-red-600 text-white animate-pulse">
                                  🚨 URGENT
                                </span>
                              )}
                            </div>
                          )}
                          <div className={cn(
                            'max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm shadow-xs',
                            isMine
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : isUrgent
                              ? 'bg-card border-2 border-red-500/80 text-foreground rounded-bl-sm ring-2 ring-red-500/20'
                              : 'bg-card border border-border text-foreground rounded-bl-sm'
                          )}>
                            <p className="text-pretty break-words leading-relaxed">{msg.content}</p>
                            <p className={cn('text-[10px] mt-1 text-right', isMine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  {/* AI CHAT ASSISTANT (Prompt requirement: suggested replies with Use Reply | Edit | Send) */}
                  {!isBuyer && (
                    <div className="px-4 py-2.5 bg-muted/40 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#FF5A00]" />
                          <span>AI Chat Assistant (Suggested Replies)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAiReplies(prev => !prev)}
                          className="text-[11px] text-[#FF5A00] hover:underline flex items-center gap-0.5"
                        >
                          {showAiReplies ? (
                            <><span>Hide</span> <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <><span>Show Suggestions</span> <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      </div>

                      {showAiReplies && (
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {aiChatSuggestions.map((reply: { id: string; category: string; text: string }) => (
                            <div
                              key={reply.id}
                              className="p-2 rounded-xl bg-card border border-border hover:border-[#FF5A00]/40 transition-colors text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold text-[#FF5A00] bg-[#FF5A00]/10 px-1.5 py-0.2 rounded">
                                  {reply.category}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {/* Use Reply */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (requirePaidReply()) return;
                                      setInput(reply.text);
                                      toast.success('Inserted AI reply into input');
                                    }}
                                    className="text-[10px] font-bold text-foreground/80 hover:text-foreground bg-muted px-2 py-0.5 rounded transition-colors"
                                  >
                                    Use Reply
                                  </button>
                                  {/* Edit */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (requirePaidReply()) return;
                                      setInput(reply.text);
                                    }}
                                    className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 px-2 py-0.5 rounded transition-colors"
                                  >
                                    Edit
                                  </button>
                                  {/* Send */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (requirePaidReply()) return;
                                      setInput(reply.text);
                                      toast.info('Review text and press Send to dispatch.');
                                    }}
                                    className="text-[10px] font-bold text-white bg-[#FF5A00] hover:bg-[#e04f00] px-2.5 py-0.5 rounded transition-colors"
                                  >
                                    Send
                                  </button>
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                                "{reply.text}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Input */}
                  <form onSubmit={handleSend} className="px-4 py-3 border-t border-border flex gap-2 shrink-0 bg-background">
                    <Input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 bg-card border-border text-foreground"
                      disabled={sending}
                      maxLength={4000}
                    />
                    <Button type="submit" disabled={sending || !input.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
