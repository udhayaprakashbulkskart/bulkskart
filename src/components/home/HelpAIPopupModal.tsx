import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Bot, X, Send, ArrowRight, Building2, Calculator,
  FileText, ShieldCheck, ChevronRight, HelpCircle, CheckCircle2,
  RefreshCw, Globe2, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface HelpAIMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    route: string;
  };
}

const GUIDED_PROMPTS = [
  {
    title: 'Find Verified Manufacturers',
    query: 'How do I find verified industrial manufacturers for bulk orders?',
    icon: Building2,
    badge: 'Directory',
    color: 'text-[#FF5A00]',
  },
  {
    title: 'Calculate Landed Cost & Duty',
    query: 'How does BulkSkart estimate landed cost and customs duty across ports?',
    icon: Calculator,
    badge: 'Forex & Taxes',
    color: 'text-amber-400',
  },
  {
    title: 'Post Free RFQ Requirement',
    query: 'How do I post a bulk buying requirement and receive factory quotes?',
    icon: FileText,
    badge: '100% Free',
    color: 'text-[#FF5A00]',
  },
  {
    title: 'Trade Assurance & Escrow',
    query: 'What protections exist for bulk payments and supplier delivery?',
    icon: ShieldCheck,
    badge: 'Guaranteed',
    color: 'text-emerald-400',
  },
];

const AI_KNOWLEDGE_BASE: Record<string, { answer: string; route?: string; routeLabel?: string }> = {
  manufacturer: {
    answer: 'BulkSkart lists manufacturers from India and other countries. Every verified manufacturer undergoes GST/IEC audits, ISO/CE factory certifications, and past order verification.',
    route: '/manufacturers',
    routeLabel: 'Browse Verified Manufacturers',
  },
  landed: {
    answer: 'Our AI Trade Assistant computes real-time landed cost combining FOB/CIF cargo value, sea/air freight, customs tariffs, port handling, and domestic GST across 10 global currencies using live forex rates.',
    route: '/trade-assistant',
    routeLabel: 'Open Landed Cost Calculator',
  },
  cost: {
    answer: 'You can calculate landed costs with HS code tariff estimation, freight mode selection (Sea FCL/LCL, Air Express), and live multi-currency conversion in our Import & Export Assistant.',
    route: '/trade-assistant',
    routeLabel: 'Open Trade Assistant',
  },
  rfq: {
    answer: 'Posting an RFQ on BulkSkart is completely free with 0% commission. Simply specify your target quantity, specs, destination port, and deadline. Verified suppliers will submit competitive quotations within 24–48 hours.',
    route: '/post-requirement',
    routeLabel: 'Post Your Requirement Now',
  },
  post: {
    answer: 'To post a requirement, click "Post Requirement" at the top or in the navigation. Fill in your bulk specs, unit count, and target ceiling price. Matched factories will bid directly to you.',
    route: '/post-requirement',
    routeLabel: 'Go to RFQ Posting Form',
  },
  quote: {
    answer: 'Suppliers submit binding factory quotations in our Live Reverse Auctions and RFQ comparison rooms. You can compare quotes side-by-side on price, MOQ, delivery lead time, and seller ratings.',
    route: '/auctions/reverse',
    routeLabel: 'Explore Live Reverse Auctions',
  },
  assurance: {
    answer: 'Trade Assurance guarantees your payment through escrow protection, on-time shipment compliance, pre-dispatch quality inspections, and direct dispute mediation on BulkSkart.',
    route: '/trade-assistant',
    routeLabel: 'Learn About Trade Protections',
  },
  escrow: {
    answer: 'With Escrow protection, buyer funds are held securely by BulkSkart until you receive and inspect the bulk delivery, ensuring full supplier accountability.',
    route: '/trade-assistant',
    routeLabel: 'View Escrow Details',
  },
};

export default function HelpAIPopupModal() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showToastTrigger, setShowToastTrigger] = useState(false);
  const [hasDismissedToast, setHasDismissedToast] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<HelpAIMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: "👋 Welcome to BulkSkart Help AI! I'm your global sourcing and trade assistant. How can I help you scale your B2B trade today?",
      timestamp: 'Just now',
    },
  ]);

  // Listen for open event from Hero, In-feed sections, or Navigation
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setShowToastTrigger(false);
    };
    window.addEventListener('open-help-ai-popup', handleOpen);
    return () => window.removeEventListener('open-help-ai-popup', handleOpen);
  }, []);

  // Show gentle automated popup prompt after 4 seconds if not already opened
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasDismissedToast && !isOpen) {
        setShowToastTrigger(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [hasDismissedToast, isOpen]);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (userText: string) => {
    if (!userText.trim()) return;

    const newMsg: HelpAIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const lower = userText.toLowerCase();
      let matched = AI_KNOWLEDGE_BASE.rfq;

      for (const [key, value] of Object.entries(AI_KNOWLEDGE_BASE)) {
        if (lower.includes(key)) {
          matched = value;
          break;
        }
      }

      const aiReply: HelpAIMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: matched.answer,
        timestamp: 'Just now',
        suggestedAction: matched.route
          ? {
              label: matched.routeLabel || 'Explore on BulkSkart',
              route: matched.route,
            }
          : undefined,
      };

      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 600);
  };

  const handlePromptClick = (promptQuery: string) => {
    handleSendMessage(promptQuery);
  };

  return (
    <>
      {/* ── 1. Gentle Landing Page Welcome Prompt (Bottom-Right) ── */}
      {showToastTrigger && !isOpen && (
        <div className="fixed bottom-20 right-4 z-40 max-w-sm w-[calc(100%-2rem)] bg-[#0d121f]/95 border border-[#FF5A00]/40 backdrop-blur-xl shadow-2xl rounded-2xl p-3.5 text-foreground animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5A00] to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-orange-950/50">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  BulkSkart Help AI
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                <button
                  onClick={() => {
                    setShowToastTrigger(false);
                    setHasDismissedToast(true);
                  }}
                  className="text-muted-foreground hover:text-white p-0.5 rounded"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug mb-2.5">
                Need help finding factories, calculating landed costs, or posting a bulk RFQ?
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsOpen(true);
                    setShowToastTrigger(false);
                  }}
                  className="h-7 px-3 bg-[#FF5A00] hover:bg-[#e04e00] text-white text-[11px] font-bold rounded-lg shadow-sm gap-1"
                >
                  <Bot className="w-3 h-3" />
                  Chat with Help AI
                </Button>
                <button
                  onClick={() => {
                    setShowToastTrigger(false);
                    setHasDismissedToast(true);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-slate-200"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Interactive Help AI Modal Overlay ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0f19] border border-slate-800 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-foreground">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5A00] to-amber-500 flex items-center justify-center shadow-md shadow-orange-950/60">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      BulkSkart Help AI Assistant
                    </h3>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1.5 py-0">
                      Online • Multi-Currency
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Instant factory matching, landed duty estimation & RFQ guidance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label="Close Help AI"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Prompt Carousel / Pills */}
            <div className="px-4 sm:px-6 py-2.5 bg-slate-900/40 border-b border-slate-800/60 shrink-0">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                Suggested Trade Topics
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GUIDED_PROMPTS.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={prompt.title}
                      onClick={() => handlePromptClick(prompt.query)}
                      className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-[#FF5A00]/50 text-left transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className={`w-3.5 h-3.5 ${prompt.color}`} />
                        <span className="text-[9px] font-mono text-muted-foreground bg-slate-800 px-1 py-0.2 rounded">
                          {prompt.badge}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-200 group-hover:text-white line-clamp-1">
                        {prompt.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 min-h-[220px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#FF5A00] text-white rounded-br-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {msg.text}

                    {msg.suggestedAction && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsOpen(false);
                            navigate(msg.suggestedAction!.route);
                          }}
                          className="h-7 text-[11px] font-bold bg-[#FF5A00]/15 hover:bg-[#FF5A00] text-[#FF5A00] hover:text-white border-[#FF5A00]/40 gap-1.5 transition-colors"
                        >
                          <span>{msg.suggestedAction.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1 px-1">
                    {msg.sender === 'user' ? 'You' : 'BulkSkart AI'} • {msg.timestamp}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-slate-900/60 border border-slate-800 px-3 py-2 rounded-xl w-fit">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF5A00]" />
                  <span>BulkSkart AI is finding answers...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/80 flex items-center gap-2 shrink-0"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about manufacturers, landed costs, RFQs, customs..."
                className="bg-slate-950 border-slate-800 focus-visible:ring-[#FF5A00] text-xs sm:text-sm text-white placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="bg-[#FF5A00] hover:bg-[#e04e00] text-white px-3 sm:px-4 font-bold h-9 shrink-0 gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask</span>
              </Button>
            </form>

            {/* Direct Shortcuts Footer */}
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-900 text-[11px] flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
              <span className="flex items-center gap-1 text-[10px]">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified B2B Intelligence
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/post-requirement');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Post RFQ
                </button>
                <span>•</span>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/manufacturers');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Manufacturers
                </button>
                <span>•</span>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/trade-assistant');
                  }}
                  className="hover:text-[#FF5A00] font-semibold transition-colors"
                >
                  Full Trade Assistant Suite →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
