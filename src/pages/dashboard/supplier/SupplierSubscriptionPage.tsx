import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  CheckCircle, Zap, Shield, BarChart3, Users, Globe,
  Star, CreditCard, RefreshCw, Mail, Loader2,
  FileText, Download, ExternalLink, Receipt,
  Check, ChevronDown, Calculator, Info, Sparkles
} from 'lucide-react';
import PageMeta from '@/components/common/PageMeta';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CurrencyContext';
import { getActiveSubscription } from '@/lib/api';
import { useRazorpay } from '@/hooks/useRazorpay';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { Subscription } from '@/types/types';

interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  plan_label: string;
  plan_tier: string;
  billing_cycle: string;
  total_amount: number;
  base_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  supply_type: string;
  bill_to_gst: string | null;
  razorpay_payment_id: string | null;
  pdf_url: string | null;
  status: string;
  created_at: string;
}

interface Plan {
  tier: string;
  label: string;
  basePrice: number | null;
  priceInr: number | null;
  priceDisplay: string;
  tagline: string;
  features: string[];
  highlight: string;
  popular: boolean;
  enterprise: boolean;
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  starter:    <Zap className="w-5 h-5" />,
  business:   <Star className="w-5 h-5" />,
  growth:     <BarChart3 className="w-5 h-5" />,
  enterprise: <Globe className="w-5 h-5" />,
};

const TRUST_ITEMS = [
  { icon: Shield,    label: 'Secure Payments',   desc: 'Powered by Razorpay' },
  { icon: RefreshCw, label: 'Cancel Anytime',    desc: 'No lock-in contracts' },
  { icon: Globe,     label: 'Global Reach',       desc: 'Buyers worldwide' },
];

export default function SupplierSubscriptionPage() {
  const { user, profile, company } = useAuth();
  const {
    countryConfig,
    setCountry,
    availableCountries,
    autoDetectedSource,
    formatLocalPrice,
    calculatePricing,
  } = useCountry();

  const [activeSub, setActiveSub]       = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub]     = useState(true);
  const [invoices, setInvoices]         = useState<SubscriptionInvoice[]>([]);
  const [loadingInv, setLoadingInv]     = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan]   = useState<Plan | null>(null);
  const { startCheckout, loading: checkoutLoading } = useRazorpay();

  const localizedPlans: Plan[] = [
    {
      tier: 'starter',
      label: 'Starter',
      basePrice: countryConfig.plans.starter,
      priceInr: Math.round(countryConfig.plans.starter * (countryConfig.currency === 'INR' ? 1 : 83.5)),
      priceDisplay: formatLocalPrice(countryConfig.plans.starter),
      tagline: 'Perfect for new suppliers — allows only 5 post responses',
      highlight: '5 RFQ responses / month (Strict Limit)',
      features: ['5 product listings', '5 Post / RFQ responses / month (Strict)', 'Direct buyer messaging (within 5 quotes)', 'Standard directory visibility', 'Email support', 'Basic analytics'],
      popular: false,
      enterprise: false,
    },
    {
      tier: 'business',
      label: 'Business',
      basePrice: countryConfig.plans.business,
      priceInr: Math.round(countryConfig.plans.business * (countryConfig.currency === 'INR' ? 1 : 83.5)),
      priceDisplay: formatLocalPrice(countryConfig.plans.business),
      tagline: 'Most popular for growing businesses — 50 post responses + AI accessibility',
      highlight: '50 RFQ responses/mo + AI Accessibility',
      features: ['Full AI Accessibility Suite included', 'AI Product Matching (94%+ Spec Match)', '1-Click AI Quotation Generator', '50 Post / RFQ responses / month', 'Send Quotations to Live RFQs', '50 product listings', 'Priority visibility', 'Verified supplier badge', 'Priority chat support'],
      popular: true,
      enterprise: false,
    },
    {
      tier: 'growth',
      label: 'Growth',
      basePrice: countryConfig.plans.growth,
      priceInr: Math.round(countryConfig.plans.growth * (countryConfig.currency === 'INR' ? 1 : 83.5)),
      priceDisplay: formatLocalPrice(countryConfig.plans.growth),
      tagline: 'For high-volume exporters — UNLIMITED post responses',
      highlight: 'UNLIMITED responses (No lead limits)',
      features: ['UNLIMITED Post / RFQ responses', 'Full AI Accessibility Suite included', 'Unlimited product listings', 'Top visibility ranking', 'Featured in categories', 'Advanced analytics & export trends', '3 team members', 'VIP Phone & WhatsApp support', 'Priority badge'],
      popular: false,
      enterprise: false,
    },
    {
      tier: 'enterprise',
      label: 'Enterprise',
      basePrice: null,
      priceInr: null,
      priceDisplay: 'Custom',
      tagline: 'For large enterprises & OEMs',
      highlight: 'Unlimited leads & dedicated SLA',
      features: ['Unlimited product listings', 'Unlimited RFQ leads', 'Dedicated account manager', 'Custom branded storefront', 'API access', '10+ team members', 'SLA guarantee'],
      popular: false,
      enterprise: true,
    },
  ];

  useEffect(() => {
    if (!company?.id) { setLoadingSub(false); setLoadingInv(false); return; }
    getActiveSubscription(company.id).then(sub => {
      setActiveSub(sub as Subscription | null);
      setLoadingSub(false);
    });
  }, [company?.id]);

  const fetchInvoices = useCallback(async () => {
    if (!user?.id) { setLoadingInv(false); return; }
    setLoadingInv(true);
    const { data, error } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load invoices'); }
    else { setInvoices((data ?? []) as SubscriptionInvoice[]); }
    setLoadingInv(false);
  }, [user?.id]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDownload = async (inv: SubscriptionInvoice) => {
    setDownloadingId(inv.id);
    try {
      // If pdf_url is stale or missing, regenerate
      if (!inv.pdf_url) {
        const { error } = await supabase.functions.invoke('generate-gst-invoice', {
          body: { invoice_id: inv.id },
        });
        if (error) throw new Error('Generation failed');
        await fetchInvoices();
        toast.success('Invoice generated. Click Download again.');
        setDownloadingId(null);
        return;
      }
      // Open in new tab — user prints as PDF via browser
      window.open(inv.pdf_url, '_blank', 'noopener');
    } catch {
      toast.error('Failed to open invoice. Please try again.');
    }
    setDownloadingId(null);
  };

  const handleSubscribe = async (plan: Plan) => {
    if (plan.enterprise) {
      window.location.href = 'mailto:info@bulkskart.com?subject=Enterprise Plan Inquiry';
      return;
    }
    if (!company?.id) {
      toast.error('Company profile required. Please complete your company registration first.', {
        action: { label: 'Complete Profile', onClick: () => window.location.href = '/dashboard/supplier/profile' },
        duration: 6000,
      });
      return;
    }
    if (!user || !profile) { toast.error('Please sign in to subscribe.'); return; }
    // Show transparent breakdown dialog for supplier confirmation
    setConfirmPlan(plan);
  };

  const executeCheckout = (plan: Plan) => {
    setConfirmPlan(null);
    if (!company?.id || !user || !profile) return;
    const breakdown = plan.basePrice ? calculatePricing(plan.basePrice) : null;
    const totalAmount = breakdown ? breakdown.totalPayable : (plan.priceInr ?? 0);
    startCheckout({
      plan_tier:     plan.tier,
      plan_label:    `${plan.label} Plan`,
      price_inr:     totalAmount,
      billing_cycle: 'monthly',
      company_id:    company.id,
      user_name:     profile.full_name ?? '',
      user_email:    user.email ?? '',
      onSuccess: () => {
        getActiveSubscription(company.id).then(sub => setActiveSub(sub as Subscription | null));
        setTimeout(fetchInvoices, 4000); // allow EF time to generate
      },
    });
  };

  const handleSubscribeAddon = (addonKey: 'ai_accessibility' | 'flash_sell_24h') => {
    if (!company?.id) {
      toast.error('Company profile required. Please complete your registration first.', {
        action: { label: 'Complete Profile', onClick: () => window.location.href = '/dashboard/supplier/profile' },
        duration: 6000,
      });
      return;
    }
    if (!user || !profile) { toast.error('Please sign in to purchase add-ons.'); return; }

    const isAi = addonKey === 'ai_accessibility';
    const baseInr = isAi ? 7500 : 5000;
    const breakdown = calculatePricing(baseInr);
    const totalAmount = breakdown.totalPayable;
    const label = isAi ? 'AI Accessibility Add-on' : '24 Hours Sell Products';

    startCheckout({
      plan_tier: isAi ? 'ai_accessibility' : 'flash_sell_24h',
      plan_label: label,
      price_inr: totalAmount,
      billing_cycle: isAi ? 'monthly' : 'one_time',
      company_id: company.id,
      user_name: profile.full_name ?? '',
      user_email: user.email ?? '',
      onSuccess: () => {
        toast.success(`${label} activated successfully!`);
        getActiveSubscription(company.id).then(sub => setActiveSub(sub as Subscription | null));
        setTimeout(fetchInvoices, 4000);
      },
    });
  };


  const isCurrentPlan = (tier: string) => activeSub?.tier === tier && activeSub?.status === 'active';
  const isDowngrade = (tier: string) => {
    const order = ['starter', 'business', 'growth', 'enterprise'];
    const currentIdx = order.indexOf(activeSub?.tier ?? '');
    const thisIdx = order.indexOf(tier);
    return activeSub?.status === 'active' && thisIdx < currentIdx;
  };

  const formatINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(n);

  const tierColor: Record<string, string> = {
    starter:    'bg-orange-500/10 text-[#FF5A00] border-[#FF5A00]/30',
    business:   'bg-primary/10 text-primary border-primary/20',
    growth:     'bg-purple-50 text-purple-700 border-purple-200',
    enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <DashboardLayout>
      <PageMeta
        title="Subscription Plans — Supplier | BulkSkart"
        description="BulkSkart dashboard — manage your account, orders and trade activity."
        robots="noindex, nofollow"
      />
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl w-full mx-auto px-4 md:px-6 py-6">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Subscription & Billing</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your plan and download GST tax invoices for all payments.
            </p>
          </div>

          {/* Active subscription status */}
          {!loadingSub && activeSub && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3.5 mb-6 text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-500 capitalize">{activeSub.tier} Plan</span>
                    <Badge className="bg-green-500/20 text-green-600 border border-green-500/30 text-[10px] font-bold">Active</Badge>
                    {activeSub.has_ai_access && (
                      <Badge className="bg-[#FF5A00]/20 text-[#FF5A00] border border-[#FF5A00]/30 text-[10px] font-bold">AI Enabled</Badge>
                    )}
                  </div>
                  <p className="text-xs text-green-500/80 mt-0.5">
                    Quotation Quota: <strong>{activeSub.used_rfq_leads ?? 0} / {activeSub.max_rfq_leads >= 999999 ? '∞ Unlimited' : activeSub.max_rfq_leads}</strong> responses used this billing cycle
                    {activeSub.ends_at && ` · Renews ${new Date(activeSub.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-green-600 bg-green-500/15 px-2.5 py-1 rounded-md">
                {activeSub.tier === 'starter' && '5 Total Responses Allowed'}
                {activeSub.tier === 'business' && '50 Total Responses + AI Included'}
                {activeSub.tier === 'growth' && 'Unlimited Responses Allowed'}
              </div>
            </div>
          )}

          <Tabs defaultValue="plans" className="w-full">
            <TabsList className="mb-6 h-9">
              <TabsTrigger value="plans" className="text-xs gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Plans
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> GST Invoices
                {invoices.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-px text-[10px] font-semibold leading-none">
                    {invoices.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── PLANS TAB ── */}
            <TabsContent value="plans">
              {/* Billing Region, Currency & Tax Jurisdiction Bar */}
              <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{countryConfig.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        Billing Jurisdiction: {countryConfig.name}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {countryConfig.currency} ({countryConfig.symbol})
                      </Badge>
                      {autoDetectedSource === 'login' ? (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          Synced with Company Country
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Auto-detected
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                      <span>Country Tax: <strong className="text-foreground">{countryConfig.taxLabel}</strong></span>
                      <span>•</span>
                      <span>Processing Fee: <strong className="text-foreground">{countryConfig.feeDescription}</strong></span>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold shrink-0">
                      <Globe className="w-3.5 h-3.5 text-primary" /> Change Billing Country
                      <ChevronDown className="w-3 h-3 opacity-60 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-72 overflow-y-auto bg-popover border-border">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground border-b border-border">
                      Select Company Billing Jurisdiction
                    </div>
                    {availableCountries.map(c => (
                      <DropdownMenuItem
                        key={c.code}
                        onClick={() => setCountry(c.code)}
                        className={`text-xs gap-2 py-2 cursor-pointer ${c.code === countryConfig.code ? 'bg-primary/10 text-primary font-bold' : ''}`}
                      >
                        <span className="text-base">{c.flag}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="truncate">{c.name}</span>
                            <span className="font-mono text-xs">{c.currency}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            {c.taxLabel} · Fee {(c.feePercent * 100).toFixed(1)}%
                          </span>
                        </div>
                        {c.code === countryConfig.code && <Check className="w-3.5 h-3.5 text-primary ml-1 shrink-0" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {localizedPlans.map(plan => {
                  const current  = isCurrentPlan(plan.tier);
                  const downgrade = isDowngrade(plan.tier);
                  const loading  = checkoutLoading;
                  const breakdown = plan.basePrice ? calculatePricing(plan.basePrice) : null;

                  return (
                    <div
                      key={plan.tier}
                      className={`relative flex flex-col rounded-xl border-2 bg-card transition-shadow ${
                        current ? 'border-green-500 shadow-md' : plan.popular ? 'border-primary shadow-md' : 'border-border'
                      }`}
                    >
                      {current && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-green-500 text-white text-[11px] px-2.5 py-0.5 whitespace-nowrap">Current Plan</Badge>
                        </div>
                      )}
                      {!current && plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground text-[11px] px-2.5 py-0.5 whitespace-nowrap">Most Popular</Badge>
                        </div>
                      )}
                      <div className={`px-5 pt-6 pb-4 rounded-t-xl ${plan.popular && !current ? 'bg-primary/5' : ''}`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                          current ? 'bg-green-100 text-green-600' : plan.popular ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {TIER_ICONS[plan.tier]}
                        </div>
                        <p className="text-base font-bold text-foreground">{plan.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">{plan.tagline}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-foreground">{plan.priceDisplay}</span>
                          {plan.priceDisplay !== 'Custom' && <span className="text-xs text-muted-foreground">/month</span>}
                        </div>
                        <div className={`mt-2 text-[11px] font-semibold rounded-full px-2 py-0.5 inline-block ${
                          plan.popular ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {plan.highlight}
                        </div>
                      </div>

                      {/* Mini Breakdown */}
                      {breakdown && (
                        <div className="mx-5 mb-3 p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] space-y-1">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Base Subscription</span>
                            <span>{formatLocalPrice(breakdown.basePrice)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>{countryConfig.taxLabel}</span>
                            <span>+{formatLocalPrice(breakdown.taxAmount)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Processing Fee</span>
                            <span>+{formatLocalPrice(breakdown.feeAmount)}</span>
                          </div>
                          <div className="border-t border-border pt-1 flex justify-between font-bold text-foreground">
                            <span>Total Payable</span>
                            <span className="text-primary">{formatLocalPrice(breakdown.totalPayable)}/mo</span>
                          </div>
                        </div>
                      )}

                      <div className="px-5 pb-2"><div className="border-t border-border" /></div>
                      <ul className="px-5 pb-4 space-y-1.5 flex-1">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-px" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="px-5 pb-5">
                        <Button
                          onClick={() => handleSubscribe(plan)}
                          disabled={current || downgrade || loading}
                          className={`w-full text-xs h-9 font-semibold ${
                            current
                              ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                              : plan.enterprise
                              ? 'bg-muted text-foreground border border-border hover:bg-muted/80'
                              : plan.popular
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'bg-muted text-foreground border border-border hover:bg-muted/80'
                          }`}
                        >
                          {loading ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…
                            </span>
                          ) : current ? (
                            'Current Active Plan'
                          ) : downgrade ? (
                            'Downgrade not available'
                          ) : plan.enterprise ? (
                            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Sales</span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" /> Subscribe · {breakdown ? `${formatLocalPrice(breakdown.totalPayable)}/mo` : `${plan.priceDisplay}/mo`}
                            </span>
                          )}
                        </Button>
                        {plan.enterprise && (
                          <p className="text-[10px] text-center text-muted-foreground mt-1.5 flex items-center justify-center gap-1">
                            <Mail className="w-3.5 h-3.5" /> info@bulkskart.com
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Standalone Add-on Services Section ── */}
              <div className="mt-8 mb-8 border-t border-border pt-6">
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-[#FF5A00]" />
                    <h2 className="text-lg font-bold text-foreground">Supplier Growth Add-on Services</h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Accelerate inquiry conversion with AI automation or 24-hour instant liquidation spotlights. Compatible with any active plan or standalone.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* AI Accessibility Add-on */}
                  <div className="rounded-xl border-2 border-[#FF5A00]/40 bg-card p-5 relative shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-[#FF5A00] text-white text-[10px] font-bold">
                          ⚡ AI Power
                        </Badge>
                        <span className="text-xl font-black text-foreground">₹7,500 <span className="text-xs font-normal text-muted-foreground">/mo (excl. GST)</span></span>
                      </div>
                      <h3 className="text-base font-bold text-foreground">AI Accessibility Add-on</h3>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        Adds AI trade assistant, 1-click quotation drafting, and 94%+ automated catalog matching to any plan.
                      </p>
                      <ul className="space-y-2 mb-5 text-xs text-muted-foreground border-t border-border pt-3">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                          <span>AI Product Matching (94%+ Spec Match with Buyer RFQs)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                          <span>1-Click AI Quotation Generator & Drafting</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                          <span>AI Sourcing & Buyer Requirement Matcher</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                          <span>Priority AI Lead Routing & Instant Alerts</span>
                        </li>
                      </ul>
                    </div>
                    <Button
                      disabled={checkoutLoading}
                      onClick={() => handleSubscribeAddon('ai_accessibility')}
                      className="w-full text-xs h-10 font-bold bg-[#FF5A00] hover:bg-[#e04e00] text-white shadow-sm"
                    >
                      {checkoutLoading ? (
                        <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Purchase AI Add-on · ₹9,027 total (incl. GST)</span>
                      )}
                    </Button>
                  </div>

                  {/* 24 Hours Sell Products Add-on */}
                  <div className="rounded-xl border-2 border-amber-500/40 bg-card p-5 relative shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                          🔥 Flash Spotlight
                        </Badge>
                        <span className="text-xl font-black text-foreground">₹5,000 <span className="text-xs font-normal text-muted-foreground">/24 Hours (excl. GST)</span></span>
                      </div>
                      <h3 className="text-base font-bold text-foreground">24 Hours Sell Products</h3>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        Flash 24-hour marketplace spotlight ribbon & push notifications broadcast to buyers on BulkSkart.
                      </p>
                      <ul className="space-y-2 mb-5 text-xs text-muted-foreground border-t border-border pt-3">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Top Homepage & Marketplace 24H Spotlight Placement</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Direct Factory WhatsApp & Call Lead Routing</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>High Urgency 24-Hour Deal Banner & Countdown</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Zero Platform Commission on All Bulk Orders</span>
                        </li>
                      </ul>
                    </div>
                    <Button
                      disabled={checkoutLoading}
                      onClick={() => handleSubscribeAddon('flash_sell_24h')}
                      className="w-full text-xs h-10 font-bold bg-gradient-to-r from-amber-500 to-[#FF5A00] hover:opacity-90 text-white shadow-sm"
                    >
                      {checkoutLoading ? (
                        <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Activate 24H Spotlight · ₹6,018 total (incl. GST)</span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── Checkout Confirmation Dialog ── */}
              {confirmPlan && confirmPlan.basePrice && (() => {
                const brk = calculatePricing(confirmPlan.basePrice);
                return (
                  <Dialog open={!!confirmPlan} onOpenChange={() => setConfirmPlan(null)}>
                    <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                      <DialogHeader>
                        <div className="flex items-center gap-2 text-primary">
                          <Receipt className="w-5 h-5 text-primary" />
                          <DialogTitle className="text-base font-bold">
                            Review Subscription & Tax Invoice Summary
                          </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground">
                          Billing Jurisdiction: {countryConfig.flag} {countryConfig.name} ({countryConfig.currency})
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3 py-2 text-xs">
                        <div className="p-3 bg-muted rounded-lg space-y-1.5">
                          <div className="flex justify-between font-semibold text-foreground text-sm">
                            <span>{confirmPlan.label} Supplier Plan</span>
                            <span>{countryConfig.symbol} {countryConfig.currency}</span>
                          </div>
                          <p className="text-muted-foreground">{confirmPlan.tagline}</p>
                          <div className="flex justify-between text-muted-foreground pt-1">
                            <span>Billing Cycle</span>
                            <span>Monthly with automatic renewal (Cancel anytime)</span>
                          </div>
                        </div>

                        <div className="border border-border rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Base Plan Fee</span>
                            <span className="font-semibold text-foreground">{formatLocalPrice(brk.basePrice)}</span>
                          </div>
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>{countryConfig.taxName} ({countryConfig.taxLabel})</span>
                            <span className="text-foreground font-medium">+{formatLocalPrice(brk.taxAmount)}</span>
                          </div>
                          <div className="flex justify-between items-center text-muted-foreground">
                            <div>
                              <span>Payment Gateway Fee</span>
                              <p className="text-[10px] text-muted-foreground/80">{countryConfig.feeDescription}</p>
                            </div>
                            <span className="text-foreground font-medium">+{formatLocalPrice(brk.feeAmount)}</span>
                          </div>
                          <div className="border-t border-border pt-2 flex justify-between items-center text-sm font-bold">
                            <span className="text-foreground">Total Payable Today</span>
                            <span className="text-primary text-base">{formatLocalPrice(brk.totalPayable)}</span>
                          </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-primary" /> Tax Invoicing & Compliance
                          </p>
                          <p>
                            An official tax invoice compliant with {countryConfig.taxName} regulations in {countryConfig.name} will be generated upon successful authorization and stored in your GST/Tax Invoices tab.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setConfirmPlan(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-primary text-white font-bold gap-1.5"
                          onClick={() => executeCheckout(confirmPlan)}
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pay {formatLocalPrice(brk.totalPayable)} & Activate
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })()}

              {/* Trust strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {TRUST_ITEMS.map(({ icon: Icon, label, desc }) => (
                  <Card key={label} className="border border-border bg-muted/20">
                    <CardContent className="p-3 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                        <p className="text-[11px] text-muted-foreground">{desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* FAQ */}
              <div className="bg-muted/30 border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Frequently Asked Questions</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { q: 'When does my subscription activate?', a: 'Instantly after payment — you can contact buyers right away.' },
                    { q: 'Can I upgrade mid-month?',            a: 'Yes. Upgrading activates the new plan immediately.' },
                    { q: 'What payment methods are accepted?',  a: 'All major credit/debit cards, UPI, net banking and wallets via Razorpay.' },
                    { q: 'Do unused leads carry over?',         a: 'RFQ leads reset every 30 days and do not carry over.' },
                  ].map(({ q, a }) => (
                    <div key={q}>
                      <p className="text-xs font-semibold text-foreground">{q}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── INVOICES TAB ── */}
            <TabsContent value="invoices">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">GST Tax Invoices</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All subscription payments include an 18% GST tax invoice. Open invoice and use browser Print → Save as PDF.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={fetchInvoices}>
                  <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
              </div>

              {loadingInv ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading invoices…</span>
                </div>
              ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No invoices yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Invoices are generated automatically after each successful subscription payment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* GST note banner */}
                  <div className="bg-orange-500/10 border border-[#FF5A00]/30 rounded-lg px-4 py-3 flex items-start gap-2.5 text-xs text-[#FF5A00]">
                    <FileText className="w-4 h-4 shrink-0 mt-px text-[#FF5A00]" />
                    <p>
                      All invoices include CGST + SGST @ 9% each (18% total GST). SAC Code: 9984 — Online Information &amp; Database Retrieval Services.
                      Click <strong>Open Invoice</strong> to view, then use <strong>Print → Save as PDF</strong> for a PDF copy.
                    </p>
                  </div>

                  {/* Invoice rows */}
                  <div className="w-full max-w-full overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2 whitespace-nowrap pr-4">Invoice No.</th>
                          <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2 whitespace-nowrap pr-4">Date</th>
                          <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2 whitespace-nowrap pr-4">Plan</th>
                          <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2 whitespace-nowrap pr-4">Base</th>
                          <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2 whitespace-nowrap pr-4">GST (18%)</th>
                          <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2 whitespace-nowrap pr-4">Total</th>
                          <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2 whitespace-nowrap pr-4">Status</th>
                          <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pb-2 whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(inv => {
                          const gstTotal = inv.cgst_amount + inv.sgst_amount + inv.igst_amount;
                          const isDownloading = downloadingId === inv.id;
                          return (
                            <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-3 pr-4">
                                <span className="text-xs font-mono font-semibold text-foreground whitespace-nowrap">{inv.invoice_number}</span>
                              </td>
                              <td className="py-3 pr-4 whitespace-nowrap">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tierColor[inv.plan_tier] ?? 'bg-muted text-foreground border-border'}`}>
                                  {inv.plan_label}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-right">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">₹{formatINR(inv.base_amount)}</span>
                              </td>
                              <td className="py-3 pr-4 text-right">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">₹{formatINR(gstTotal)}</span>
                              </td>
                              <td className="py-3 pr-4 text-right">
                                <span className="text-xs font-semibold text-foreground whitespace-nowrap">₹{formatINR(inv.total_amount)}</span>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                  inv.status === 'issued' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                  {inv.status === 'issued' ? '✓ Paid' : 'Cancelled'}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] gap-1 whitespace-nowrap"
                                  disabled={isDownloading}
                                  onClick={() => handleDownload(inv)}
                                >
                                  {isDownloading
                                    ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
                                    : inv.pdf_url
                                    ? <><ExternalLink className="w-3 h-3" />Open Invoice</>
                                    : <><Download className="w-3 h-3" />Generate</>
                                  }
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </DashboardLayout>
  );
}
