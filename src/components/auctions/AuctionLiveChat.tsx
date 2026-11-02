import React, { useState, useEffect, useRef } from 'react';
import {
  Send, MessageSquare, ShieldCheck, Building2, User, Clock,
  Maximize2, Minimize2, Users, ArrowDown, Lock, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  sender_name: string;
  sender_role: 'manufacturer' | 'bidder' | 'buyer';
  message: string;
  created_at: string;
}

interface AuctionLiveChatProps {
  auctionId: string;
  manufacturerName?: string;
  onOpenBidderProfile: (bidderName: string) => void;
  isFullPage?: boolean;
  onToggleFullPage?: () => void;
}

export default function AuctionLiveChat({
  auctionId,
  manufacturerName = 'Direct Manufacturer',
  onOpenBidderProfile,
  isFullPage = false,
  onToggleFullPage
}: AuctionLiveChatProps) {
  const { user, profile, company, buyerProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll handler
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setHasUnreadBelow(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Track if user scrolled up
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    if (isAtBottom) {
      setHasUnreadBelow(false);
    }
  };

  // Load real chats from Supabase auction_chats table
  useEffect(() => {
    let isMounted = true;
    async function loadChats() {
      try {
        const { data, error } = await supabase
          .from('auction_chats')
          .select('*')
          .eq('auction_id', auctionId)
          .order('created_at', { ascending: true });

        if (!error && data && isMounted) {
          const mapped: ChatMessage[] = data.map((d: any) => ({
            id: d.id,
            sender_name: d.sender_name || 'Verified User',
            sender_role: (d.sender_role === 'manufacturer' ? 'manufacturer' : 'buyer') as any,
            message: d.message,
            created_at: d.created_at ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          }));
          setMessages(mapped);
        } else if (isMounted) {
          setMessages([]);
        }
      } catch (err) {
        if (isMounted) setMessages([]);
      }
    }

    loadChats();

    // Realtime subscription for incoming chat messages
    const channel = supabase
      .channel(`auction_chat_room_${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_chats',
          filter: `auction_id=eq.${auctionId}`
        },
        (payload: any) => {
          if (payload.new && isMounted) {
            const newRecord = payload.new;
            setMessages(prev => {
              if (prev.some(m => m.id === newRecord.id)) return prev;
              return [
                ...prev,
                {
                  id: newRecord.id,
                  sender_name: newRecord.sender_name || 'Verified User',
                  sender_role: (newRecord.sender_role === 'manufacturer' ? 'manufacturer' : 'buyer') as any,
                  message: newRecord.message,
                  created_at: newRecord.created_at ? new Date(newRecord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
                }
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!user) {
      toast.error('Authentication Required: Please sign in with a verified account to send messages.');
      return;
    }

    const currentSenderName =
      company?.company_name ||
      buyerProfile?.company_name ||
      profile?.full_name ||
      user.email?.split('@')[0] ||
      'Bidder';

    const isUserManufacturer = company?.business_type === 'manufacturer' || profile?.role === 'supplier';
    const role: 'manufacturer' | 'buyer' = isUserManufacturer ? 'manufacturer' : 'buyer';
    const textToSend = inputText.trim();

    setInputText('');
    setSending(true);

    try {
      const tempId = `temp-${Date.now()}`;
      const localMsg: ChatMessage = {
        id: tempId,
        sender_name: `${currentSenderName} (You)`,
        sender_role: role,
        message: textToSend,
        created_at: 'Just now'
      };
      setMessages(prev => [...prev, localMsg]);

      const { data, error } = await supabase.from('auction_chats').insert({
        auction_id: auctionId,
        sender_name: currentSenderName,
        sender_role: role,
        message: textToSend
      }).select().maybeSingle();

      if (!error && data) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Derive active bidders count strictly from real database messages
  const activeParticipants = new Set(messages.map(m => m.sender_name.replace(' (You)', ''))).size;

  return (
    <div className={`bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col w-full transition-all ${
      isFullPage ? 'h-[calc(100vh-175px)] min-h-[580px]' : 'h-[520px]'
    }`}>
      {/* ── Chat Room Header ── */}
      <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] flex items-center justify-center font-bold shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {isFullPage ? '60-Minute Live Room Chat (Full Page)' : 'Live Auction Chat'}
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate">
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Users className="w-3 h-3" /> {activeParticipants} Bidders Active
              </span>
              <span>•</span>
              <span className="text-muted-foreground truncate">{manufacturerName}</span>
            </div>
          </div>
        </div>

        {/* Right Controls: Full Page Toggle */}
        {onToggleFullPage && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onToggleFullPage}
            className="h-8 px-2.5 text-xs rounded-xl flex items-center gap-1.5 bg-muted hover:bg-muted/80 font-bold text-foreground border border-border shrink-0"
          >
            {isFullPage ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span className="hidden sm:inline">Standard View</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span className="hidden sm:inline">Full Page Chat</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* ── Messages Scroll Area with Modern Compact Bubbles ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-muted/10 text-xs w-full relative flex flex-col"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6 text-muted-foreground my-auto">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 text-[#FF5A1F] flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 opacity-60" />
            </div>
            <p className="font-bold text-sm text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
              Start a conversation with the supplier.
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_name.includes('(You)');
            const isManufacturer = msg.sender_role === 'manufacturer';

            return (
              <div
                key={msg.id}
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex flex-col ${
                    isMe ? 'items-end' : 'items-start'
                  } max-w-[85%] sm:max-w-[78%] min-w-0`}
                >
                  {/* Sender Metadata Row */}
                  <div
                    className={`flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground flex-wrap ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isMe && (
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 text-white ${
                          isManufacturer ? 'bg-[#FF5A1F]' : 'bg-slate-700'
                        }`}
                      >
                        {msg.sender_name.charAt(0)}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenBidderProfile(msg.sender_name.replace(' (You)', ''))}
                      className="font-bold hover:text-[#FF5A1F] transition-colors flex items-center gap-1 cursor-pointer truncate max-w-[190px]"
                      title="Click to view verified profile"
                    >
                      <span className="truncate">{msg.sender_name}</span>
                    </button>

                    {isManufacturer ? (
                      <span className="px-1.5 py-0.5 rounded bg-[#FF5A1F]/20 text-[#FF5A1F] border border-[#FF5A1F]/30 text-[9px] font-bold shrink-0">
                        Manufacturer
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] font-semibold shrink-0">
                        Buyer
                      </span>
                    )}
                    <span className="shrink-0 text-[10px]">• {msg.created_at}</span>
                  </div>

                  {/* Compact Modern Bubble (75–85% max-width, natural text wrap, normal padding) */}
                  <div
                    className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                      isMe
                        ? 'bg-[#FF5A1F] text-white rounded-tr-xs text-left'
                        : isManufacturer
                        ? 'bg-orange-50/90 dark:bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 text-foreground rounded-tl-xs font-medium text-left'
                        : 'bg-card border border-border/80 text-foreground rounded-tl-xs text-left'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Floating Scroll to Bottom Pill */}
        {hasUnreadBelow && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="sticky bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-[#FF5A1F] text-white font-bold text-xs shadow-lg flex items-center gap-1 animate-bounce"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>New Live Messages</span>
          </button>
        )}
      </div>

      {/* ── Input Box (Auth Guarded) ── */}
      <div className="p-3 bg-card border-t border-border shrink-0">
        {!user ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-3.5 py-2.5 bg-muted/40 rounded-2xl border border-border text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#FF5A1F] shrink-0" />
              <span>Sign in with a verified account to ask supplier questions.</span>
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`; }}
              className="h-8 text-xs bg-[#FF5A1F] hover:bg-[#e04e17] text-white px-3.5 rounded-xl font-bold shrink-0 shadow-xs"
            >
              Sign in to participate
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              placeholder="Ask manufacturer about dispatch, test certs, or specs..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="text-xs h-10 rounded-xl bg-muted/40 min-w-0 flex-1 px-3"
            />
            <Button
              type="submit"
              disabled={!inputText.trim() || sending}
              size="sm"
              className="h-10 px-4 bg-[#FF5A1F] hover:bg-[#e04f1a] text-white rounded-xl shrink-0 font-bold flex items-center justify-center gap-1 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
