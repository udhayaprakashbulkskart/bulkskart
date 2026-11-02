import React, { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import PageMeta from '@/components/common/PageMeta';
import {
  CheckCircle, ArrowRight, Shield, Zap, Globe, BarChart3, Users,
  Loader2, Calculator, Info, Check, ChevronDown, Sparkles, Receipt
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CurrencyContext';
import { useRazorpay } from '@/hooks/useRazorpay';
import { toast } from 'sonner';

const plans = [
  {
    tier: 'Starter',
    tierKey: 'starter',
    price: '₹2,500',
    price_inr: 2500,
    period: '/month',
    billed: 'Billed monthly • Cancel anytime',
    tagline: 'Perfect for small manufacturers — allows only 5 post responses',
    color: 'border-border',
    popular: false,
    features: [
      { text: 'Business profile listing', included: true },
      { text: 'Up to 5 product listings', included: true },
      { text: '5 Post / RFQ responses per month (Strict Limit)', included: true },
      { text: 'Direct buyer inquiry messaging (within 5 quotes)', included: true },
      { text: 'Standard visibility in search', included: true },
      { text: 'Email customer support', included: true },
      { text: 'AI Accessibility Suite', included: false },
      { text: 'Verified supplier badge', included: false },
      { text: 'Analytics dashboard', included: false },
      { text: 'Priority visibility', included: false },
    ],
    cta: 'Start Starter Plan',
    icon: Shield,
  },
  {
    tier: 'Business',
    tierKey: 'business',
    price: '₹7,500',
    price_inr: 7500,
    period: '/month',
    billed: 'Billed monthly • Cancel anytime',
    tagline: 'Ideal for growing manufacturers — 50 post responses + AI accessibility',
    color: 'border-primary',
    popular: true,
    features: [
      { text: 'All Starter features included', included: true },
      { text: '50 Post / RFQ responses per month', included: true },
      { text: 'AI Accessibility Suite included (94%+ Spec Match)', included: true },
      { text: '1-Click AI Quotation Generator & Auto-Drafting', included: true },
      { text: 'Send Quotations to Live Buying Requirements', included: true },
      { text: 'Up to 50 product listings', included: true },
      { text: 'Priority visibility in search', included: true },
      { text: 'Verified supplier badge', included: true },
      { text: 'Basic analytics dashboard', included: true },
      { text: 'Priority chat support', included: true },
      { text: 'Featured in categories', included: false },
      { text: 'Team member accounts', included: false },
    ],
    cta: 'Start Business Plan',
    icon: Zap,
  },
  {
    tier: 'Growth',
    tierKey: 'growth',
    price: '₹15,000',
    price_inr: 15000,
    period: '/month',
    billed: 'Billed monthly • Cancel anytime',
    tagline: 'For established manufacturers & exporters — UNLIMITED post responses',
    color: 'border-border',
    popular: false,
    features: [
      { text: 'All Business features included', included: true },
      { text: 'UNLIMITED Post / RFQ responses (No caps)', included: true },
      { text: 'Full AI Accessibility Suite included', included: true },
      { text: 'Unlimited product listings', included: true },
      { text: 'Top priority search placement', included: true },
      { text: 'Verified supplier badge', included: true },
      { text: 'Featured in category pages', included: true },
      { text: 'Advanced analytics & export market trends', included: true },
      { text: '3 team member accounts', included: true },
      { text: 'VIP Phone, Chat & WhatsApp support', included: true },
      { text: 'Dedicated account manager', included: false },
    ],
    cta: 'Start Growth Plan',
    icon: Globe,
  },
  {
    tier: 'Enterprise',
    tierKey: 'enterprise',
    price: 'Custom',
    price_inr: 0,
    period: ' pricing',
    billed: 'Tailored to your business needs',
    tagline: 'For large manufacturers and enterprise OEM brands worldwide',
    color: 'border-border',
    popular: false,
    features: [
      { text: 'All Growth features included', included: true },
      { text: 'Unlimited product listings', included: true },
      { text: 'Unlimited RFQ responses', included: true },
      { text: 'Top priority visibility across all categories', included: true },
      { text: 'Custom storefront page & OEM catalogue', included: true },
      { text: 'Unlimited analytics & custom reports', included: true },
      { text: '10+ team member accounts', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'API & ERP integration access', included: true },
      { text: 'Priority 24/7 VIP support', included: true },
    ],
    cta: 'Contact Sales',
    icon: BarChart3,
  },
];

const comparisonFeatures = [
  { label: 'Post / RFQ Responses', values: ['5 Responses / mo', '50 Responses / mo', 'Unlimited Responses', 'Unlimited Responses'] },
  { label: 'AI Accessibility Suite', values: [false, true, true, true] },
  { label: 'Product Listings', values: ['5', '50', 'Unlimited', 'Unlimited'] },
  { label: 'Verified Badge', values: [false, true, true, true] },
  { label: 'Analytics', values: [false, 'Basic', 'Advanced', 'Full Enterprise'] },
  { label: 'Search Visibility', values: ['Standard', 'Priority', 'Top Priority', 'Top Priority'] },
  { label: 'Team Members', values: ['1', '1', '3', '10+'] },
  { label: 'Support', values: ['Email', 'Priority Chat', 'Phone & WhatsApp', 'Dedicated 24/7'] },
  { label: 'Featured in Categories', values: [false, false, true, true] },
];

export default function PricingPage() {
  const { user, profile, company } = useAuth();
  const navigate = useNavigate();
  const {
    countryConfig,
    setCountry,
    availableCountries,
    autoDetectedSource,
    formatLocalPrice,
    calculatePricing,
  } = useCountry();
  const { startCheckout, loading: checkoutLoading } = useRazorpay();

  const [selectedPlanForBreakdown, setSelectedPlanForBreakdown] = useState<any | null>(null);

  const dynamicPlans = [
    {
      tier: 'Starter',
      tierKey: 'starter',
      basePrice: countryConfig.plans.starter,
      price: formatLocalPrice(countryConfig.plans.starter),
      price_inr: Math.round(countryConfig.plans.starter * (countryConfig.currency === 'INR' ? 1 : 83.5)),
      period: '/month',
      billed: 'Billed monthly • Cancel anytime',
      tagline: 'Perfect for small manufacturers — allows only 5 post responses',
      color: 'border-border',
      popular: false,
      features: [
        { text: 'Business profile listing', included: true },
        { text: 'Up to 5 product listings', included: true },
        { text: '5 Post / RFQ responses per month (Strict Limit)', included: true },
        { text: 'Direct buyer messaging (within 5 quotes)', included: true },
        { text: 'Standard visibility in search', included: true },
        { text: 'Email customer support', included: true },
        { text: 'AI Accessibility Suite', included: false },
        { text: 'Verified supplier badge', included: false },
        { text: 'Analytics dashboard', included: false },
        { text: 'Priority visibility', included: false },
      ],
      cta: 'Subscribe to Starter',
      icon: Shield,
    },
    {
      tier: 'Business',
      tierKey: 'business',
      basePrice: countryConfig.plans.business,
      price: formatLocalPrice(countryConfig.plans.business),
      price_inr: Math.round(countryConfig.plans.business * (countryConfig.currency === 'INR' ? 1 : 83.5)),
      period: '/month',
      billed: 'Billed monthly • Cancel anytime',
      tagline: 'Ideal for growing manufacturers — 50 post responses + AI accessibility',
      color: 'border-primary',
      popular: true,
      features: [
        { text: 'All Starter features included', included: true },
        { text: '50 Post / RFQ responses per month', included: true },
        { text: 'Full AI Accessibility Suite (94%+ Spec Match)', included: true },
        { text: '1-Click AI Quotation Generator & Drafting', included: true },
        { text: 'Send Quotations to Live Buying Requirements', included: true },
        { text: 'Up to 50 product listings', included: true },
        { text: 'Priority visibility in search', included: true },
        { text: 'Verified supplier badge', included: true },
        { text: 'Basic analytics dashboard', included: true },
        { text: 'Priority chat support', included: true },
        { text: 'Featured in categories', included: false },
      ],
      cta: 'Subscribe to Business',
      icon: Zap,
    },
    {
      tier: 'Growth',
      tierKey: 'growth',
      basePrice: countryConfig.plans.growth,
      price: formatLocalPrice(countryConfig.plans.growth),
      price_inr: Math.round(countryConfig.plans.growth * (countryConfig.currency === 'INR' ? 1 : 83.5)),
      period: '/month',
      billed: 'Billed monthly • Cancel anytime',
      tagline: 'For established manufacturers & exporters — UNLIMITED post responses',
      color: 'border-border',
      popular: false,
      features: [
        { text: 'All Business features included', included: true },
        { text: 'UNLIMITED Post / RFQ responses (No caps)', included: true },
        { text: 'Full AI Accessibility Suite included', included: true },
        { text: 'Unlimited product listings', included: true },
        { text: 'Top priority search placement', included: true },
        { text: 'Verified supplier badge', included: true },
        { text: 'Advanced analytics & export trends', included: true },
        { text: 'Priority phone, chat & WhatsApp support', included: true },
        { text: 'Featured in categories', included: true },
        { text: '3 team member accounts', included: true },
      ],
      cta: 'Subscribe to Growth',
      icon: BarChart3,
    },
    {
      tier: 'Enterprise',
      tierKey: 'enterprise',
      basePrice: null,
      price: 'Custom',
      price_inr: null,
      period: '',
      billed: 'Tailored enterprise volume & international SLAs',
      tagline: 'For large manufacturers and enterprise OEM brands worldwide',
      color: 'border-border',
      popular: false,
      features: [
        { text: 'Unlimited product listings', included: true },
        { text: 'Unlimited RFQ leads', included: true },
        { text: 'Top priority search placement', included: true },
        { text: 'Verified supplier badge', included: true },
        { text: 'Full enterprise analytics', included: true },
        { text: '24/7 dedicated support', included: true },
        { text: 'Featured banner placement', included: true },
        { text: '10+ team member accounts', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Custom ERP & API integration', included: true },
      ],
      cta: 'Contact Sales',
      icon: Users,
    },
  ];

  const handlePlanCTA = (plan: typeof dynamicPlans[0]) => {
    if (plan.tierKey === 'enterprise') { navigate('/how-it-works'); return; }
    if (!user || !profile) { navigate('/auth?tab=supplier'); return; }
    if (profile.role === 'buyer') { navigate('/auth?tab=supplier'); return; }
    if (!company) { navigate('/auth?tab=supplier'); return; }

    const breakdown = plan.basePrice ? calculatePricing(plan.basePrice) : null;
    const totalAmount = breakdown ? breakdown.totalPayable : (plan.price_inr ?? 0);

    startCheckout({
      plan_tier: plan.tierKey,
      plan_label: `${plan.tier} Plan`,
      price_inr: totalAmount,
      billing_cycle: 'monthly',
      company_id: company.id,
      user_name: profile.full_name ?? '',
      user_email: user.email ?? '',
      onSuccess: () => { /* hook navigates to /payment-success */ },
    });
  };

  const handleAddonCheckout = (addonKey: 'ai_accessibility' | 'flash_sell_24h') => {
    if (!user || !profile) { navigate('/auth?tab=supplier'); return; }
    if (profile.role === 'buyer') { navigate('/auth?tab=supplier'); return; }
    if (!company) {
      toast.error('Please complete your company profile first');
      navigate('/dashboard/supplier/profile');
      return;
    }

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
        navigate('/dashboard/supplier/subscription');
      },
    });
  };

  return (
    <MainLayout>
      <PageMeta
        title={`Supplier Pricing Plans — ${countryConfig.name} (${countryConfig.currency}) | BulkSkart`}
        description={`Choose a BulkSkart supplier plan in ${countryConfig.currency} with localized tax and transaction fees. Get verified, list products, access genuine buyer RFQs, and grow export revenue.`}
        keywords="supplier subscription plans, B2B pricing, manufacturer listing, bulk RFQ access, export growth"
        canonical="/pricing"
        ogType="website"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Pricing & Plans', item: '/pricing' },
        ]}
        faq={[
          {
            question: "Are there any fees for bulk buyers?",
            answer: "No, buyers never pay any registration fees, commission fees, or subscription charges on BulkSkart. Sourcing and posting RFQs is completely free.",
          },
          {
            question: "What is included with a Verified Supplier subscription?",
            answer: "Verified Suppliers receive a certified trust badge on their profile and catalog, priority ranking in search results, instant access to buyer contact details, unlimited RFQ quoting, and dedicated account support.",
          },
          {
            question: "Can I cancel my supplier subscription anytime?",
            answer: "Yes, you can cancel or switch your subscription plan anytime directly from your Supplier Dashboard with no lock-in contracts.",
          },
          {
            question: "What payment methods are supported for supplier memberships?",
            answer: "We support Credit/Debit cards, Net Banking, UPI (in India), Razorpay secure gateway, and international cards with transparent local currency invoicing.",
          },
        ]}
      />
      <section className="py-5 md:py-8 text-center">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <Badge className="mb-2 text-xs bg-primary/10 text-primary border border-primary/20">Transparent Pricing</Badge>
          <h1 className="text-2xl md:text-4xl font-black text-foreground mb-2">
            Free for Buyers.<br /><span className="gradient-text">Growth Plans for Suppliers.</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground text-pretty mb-4">
            Buyers never pay any platform fees or commissions. Suppliers choose from affordable growth subscriptions to unlock verified badges and global bulk leads.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            {['100% Free for Buyers', 'No credit card for registration', '7-day supplier free trial', 'Cancel anytime'].map(f => (
              <span key={f} className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-primary" />{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Country Auto-Localization & Tax Notice Bar ── */}
      <section className="pb-4">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{countryConfig.flag}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    Localized Pricing: {countryConfig.name}
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono bg-muted">
                    {countryConfig.currency} ({countryConfig.symbol})
                  </Badge>
                  {autoDetectedSource === 'login' ? (
                    <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      Synced from Login Profile
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Auto-detected
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                  <span>Applicable Tax: <strong className="text-foreground">{countryConfig.taxLabel}</strong></span>
                  <span>•</span>
                  <span>Gateway Fee: <strong className="text-foreground">{countryConfig.feeDescription}</strong></span>
                </div>
              </div>
            </div>

            {/* Change country button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold shrink-0">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Change Country / Currency
                  <ChevronDown className="w-3 h-3 opacity-60 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-72 overflow-y-auto bg-popover border-border">
                <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground border-b border-border">
                  Select Country & Tax Jurisdiction
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
        </div>
      </section>

      {/* ── Highlight: Buyers are 100% Free Forever ── */}
      <section className="pb-8">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="bg-gradient-to-r from-green-500/10 via-primary/5 to-green-500/10 border-2 border-green-500/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 font-bold text-xs">
                <CheckCircle className="w-4 h-4" /> 100% Free Forever for Buyers
              </div>
              <h2 className="text-xl md:text-2xl font-black text-foreground">
                Looking to Source Bulk Goods? Zero Charges for Buyers.
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
                Post unlimited bulk requirements (RFQs), browse verified factory catalogs, directly negotiate factory prices, and track orders from verified manufacturers globally without paying any subscription fees or hidden trade margins.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-semibold text-foreground">
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Unlimited RFQs</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Zero Commission</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Direct Factory Chat</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> KYC Verification</div>
              </div>
            </div>
            <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Link to="/post-requirement" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-11 px-6 shadow-[0_2px_0_#922f00]">
                  Post Free Requirement
                </Button>
              </Link>
              <Link to="/auth?tab=buyer" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-11 px-6 shadow-[0_2px_0_#922f00]">
                  Join as Buyer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Supplier Section Header */}
      <section className="pt-2 pb-3 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <Badge className="mb-1.5 text-xs bg-primary/10 text-primary border border-primary/20">Suppliers & Manufacturers</Badge>
          <h2 className="text-xl md:text-3xl font-black text-foreground">
            Supplier Subscriptions & Growth Plans
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Accelerate your bulk export sales with verified supplier trust badges, priority lead notifications, and catalogue placement in {countryConfig.currency}.
          </p>
        </div>
      </section>

      {/* Plans grid */}
      <section className="pb-6 md:pb-8">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {dynamicPlans.map(plan => {
              const Icon = plan.icon;
              const pricingBreakdown = plan.basePrice ? calculatePricing(plan.basePrice) : null;

              return (
                <div key={plan.tier} className={`bg-card border-2 rounded-xl p-5 flex flex-col relative ${plan.popular ? 'border-primary' : plan.color} card-hover`}>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1">⚡ Most Popular</Badge>
                    </div>
                  )}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-bold text-foreground">{plan.tier}</span>
                    </div>
                    <div className="flex items-baseline gap-0.5 mb-1">
                      <span className="text-3xl font-black text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{plan.billed}</p>
                    <p className="text-xs text-muted-foreground text-pretty">{plan.tagline}</p>
                  </div>

                  {/* Transparent Tax & Fee Mini Breakdown */}
                  {pricingBreakdown && (
                    <div className="mb-4 p-2.5 rounded-lg bg-muted/40 border border-border/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Base Plan</span>
                        <span>{formatLocalPrice(pricingBreakdown.basePrice)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{countryConfig.taxLabel}</span>
                        <span>+{formatLocalPrice(pricingBreakdown.taxAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Processing Fee</span>
                        <span>+{formatLocalPrice(pricingBreakdown.feeAmount)}</span>
                      </div>
                      <div className="border-t border-border pt-1 flex items-center justify-between font-bold text-foreground">
                        <span>Est. Monthly Total</span>
                        <span className="text-primary">{formatLocalPrice(pricingBreakdown.totalPayable)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPlanForBreakdown(plan)}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1 pt-0.5"
                      >
                        <Calculator className="w-3 h-3" /> View detailed invoice breakdown
                      </button>
                    </div>
                  )}

                  <ul className="space-y-2 flex-1 mb-6">
                    {plan.features.map(f => (
                      <li key={f.text} className={`flex items-center gap-2 text-xs ${f.included ? 'text-muted-foreground' : 'text-muted/40 line-through'}`}>
                        {f.included
                          ? <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                          : <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/20 shrink-0 inline-block" />
                        }
                        {f.text}
                      </li>
                    ))}
                  </ul>

                  <Button
                    disabled={checkoutLoading}
                    onClick={() => handlePlanCTA(plan)}
                    className="w-full text-sm font-bold gap-1.5 bg-[#FF5A00] hover:bg-[#e04e00] text-white shadow-[0_2px_0_#922f00] h-11 rounded-xl"
                  >
                    {checkoutLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                    ) : plan.tierKey === 'enterprise' ? (
                      <>{plan.cta} <ArrowRight className="w-3.5 h-3.5" /></>
                    ) : (
                      <>{plan.cta} {pricingBreakdown ? `· ${formatLocalPrice(pricingBreakdown.totalPayable)}` : ''} <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Supplier Add-on Services Section ── */}
      <section className="py-6 md:py-10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="text-center mb-6">
            <Badge className="mb-2 text-xs bg-[#FF5A00]/10 text-[#FF5A00] border border-[#FF5A00]/20 font-bold">
              ⚡ High-Impact Add-ons
            </Badge>
            <h2 className="text-xl md:text-3xl font-black text-foreground">
              Supplier Growth Add-on Services
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-xl mx-auto">
              Supercharge your wholesale sales with on-demand AI automation or 24-hour flash liquidation spotlights. Compatible with any active plan or standalone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {/* AI Accessibility Add-on */}
            <div className="bg-card border-2 border-[#FF5A00]/50 rounded-2xl p-5 flex flex-col relative shadow-lg shadow-[#FF5A00]/5">
              <div className="absolute -top-3.5 left-6">
                <Badge className="bg-[#FF5A00] text-white text-xs px-3 py-1 font-bold">
                  ⚡ AI Intelligence Suite
                </Badge>
              </div>

              <div className="mb-4 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5A00]/15 border border-[#FF5A00]/30 flex items-center justify-center text-[#FF5A00]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">AI Accessibility Add-on</h3>
                    <p className="text-[11px] text-[#FF5A00] font-bold">AI Trade Assistant & Auto Quoting</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-black text-foreground">₹7,500</span>
                  <span className="text-xs text-muted-foreground">/month (Base)</span>
                </div>
                <div className="text-[11px] font-semibold text-primary mb-2">
                  Total Payable: ₹9,027/mo (incl. 18% GST & Gateway fee)
                </div>
                <p className="text-xs text-muted-foreground">
                  Unlocks advanced AI catalog matching, 1-click quotation drafting, and intelligent buyer negotiation tools.
                </p>
              </div>

              <ul className="space-y-2 flex-1 mb-5 border-t border-border/80 pt-4">
                {[
                  'AI Product Matching (94%+ Spec Match with Buyer RFQs)',
                  '1-Click Automated Quotation Draft Generator',
                  'AI Sourcing & Buyer Requirement Matcher',
                  'Smart Chat Suggestions & Auto-Drafting',
                  'Priority AI Lead Routing & Notifications',
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                    <CheckCircle className="w-3.5 h-3.5 text-[#FF5A00] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Button
                disabled={checkoutLoading}
                onClick={() => handleAddonCheckout('ai_accessibility')}
                className="w-full text-sm font-bold gap-2 bg-[#FF5A00] hover:bg-[#e04e00] text-white shadow-md h-11 rounded-xl"
              >
                {checkoutLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Subscribe AI Accessibility · ₹9,027 total</>
                )}
              </Button>
            </div>

            {/* 24 Hours Sell Products */}
            <div className="bg-card border-2 border-amber-500/50 rounded-2xl p-5 flex flex-col relative shadow-lg shadow-amber-500/5">
              <div className="absolute -top-3.5 left-6">
                <Badge className="bg-amber-500 text-white text-xs px-3 py-1 font-bold">
                  🔥 Flash Liquidation
                </Badge>
              </div>

              <div className="mb-4 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">24 Hours Sell Products</h3>
                    <p className="text-[11px] text-amber-500 font-bold">High-Priority Marketplace Spotlight</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-black text-foreground">₹5,000</span>
                  <span className="text-xs text-muted-foreground">/24 Hours (Base)</span>
                </div>
                <div className="text-[11px] font-semibold text-amber-500 mb-2">
                  Total Payable: ₹6,018 (incl. 18% GST & Gateway fee)
                </div>
                <p className="text-xs text-muted-foreground">
                  Liquidate bulk surplus or hot production runs with 24-hour top banner placement and instant buyer alerts.
                </p>
              </div>

              <ul className="space-y-2 flex-1 mb-5 border-t border-border/80 pt-4">
                {[
                  'Top Homepage & Marketplace 24H Spotlight Placement',
                  'Instant broadcast of your offer to buyers on BulkSkart',
                  'Direct Factory WhatsApp & Call Lead Priority',
                  'High Urgency 24-Hour Deal Banner & Countdown Badge',
                  'Zero Platform Commission on All Bulk Transactions',
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Button
                disabled={checkoutLoading}
                onClick={() => handleAddonCheckout('flash_sell_24h')}
                className="w-full text-sm font-bold gap-2 bg-gradient-to-r from-amber-500 to-[#FF5A00] hover:opacity-90 text-white shadow-md h-11 rounded-xl"
              >
                {checkoutLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                ) : (
                  <><Zap className="w-4 h-4" /> Activate 24H Sell Products · ₹6,018 total</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Transparent Breakdown Modal ── */}
      {selectedPlanForBreakdown && selectedPlanForBreakdown.basePrice && (() => {
        const brk = calculatePricing(selectedPlanForBreakdown.basePrice);
        return (
          <Dialog open={!!selectedPlanForBreakdown} onOpenChange={() => setSelectedPlanForBreakdown(null)}>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <DialogHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Receipt className="w-5 h-5 text-primary" />
                  <DialogTitle className="text-lg font-bold">
                    Transparent Tax & Gateway Fee Invoice Preview
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Country-wise breakdown for {countryConfig.name} ({countryConfig.currency})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-sm font-semibold text-foreground">
                    <span>Plan: {selectedPlanForBreakdown.tier} Subscription</span>
                    <span>{countryConfig.symbol} {countryConfig.currency}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Billing Cycle</span>
                    <span>Monthly Recurring (7-day free trial)</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax Jurisdiction</span>
                    <span>{countryConfig.flag} {countryConfig.name}</span>
                  </div>
                </div>

                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Base Subscription Price</span>
                    <span className="font-semibold text-foreground">{formatLocalPrice(brk.basePrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>
                      {countryConfig.taxName} ({countryConfig.taxLabel})
                    </span>
                    <span className="text-foreground font-medium">+{formatLocalPrice(brk.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <div>
                      <span>Transaction Processing Fee</span>
                      <p className="text-[10px] text-muted-foreground/80">{countryConfig.feeDescription}</p>
                    </div>
                    <span className="text-foreground font-medium">+{formatLocalPrice(brk.feeAmount)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between items-center text-sm font-bold">
                    <span className="text-foreground">Total Payable / Month</span>
                    <span className="text-primary text-base">{formatLocalPrice(brk.totalPayable)}</span>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-primary" /> Tax Compliance & Invoicing
                  </p>
                  <p>
                    Official tax invoices (with {countryConfig.taxName} registration number) are generated automatically upon billing and can be downloaded from your Supplier Dashboard.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPlanForBreakdown(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-white font-bold"
                  onClick={() => {
                    const p = selectedPlanForBreakdown;
                    setSelectedPlanForBreakdown(null);
                    handlePlanCTA(p);
                  }}
                >
                  Proceed to Subscribe
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Comparison table */}
      <section className="py-8 md:py-16 bg-muted">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-6 md:mb-8">Compare All Plans</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 w-48">Feature</th>
                    {['Starter', 'Business', 'Growth', 'Enterprise'].map(t => (
                      <th key={t} className={`text-center text-xs font-semibold px-4 py-3 ${t === 'Business' ? 'text-primary' : 'text-muted-foreground'}`}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map(row => (
                    <tr key={row.label} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 text-xs font-medium text-foreground">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="text-center px-4 py-3 text-xs">
                          {v === true ? <CheckCircle className="w-4 h-4 text-primary mx-auto" />
                            : v === false ? <span className="text-muted-foreground/40">—</span>
                            : <span className="text-muted-foreground font-medium">{v}</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Buyer section */}
      <section className="py-8 md:py-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <div className="bg-card border border-border rounded-2xl p-5 md:p-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Buyer Registration is Free</h2>
            <p className="text-sm text-muted-foreground mb-6 text-pretty">
              Post unlimited bulk requirements, receive quotes from verified manufacturers, compare suppliers, and place orders — all for free.
            </p>
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                Register as Buyer — Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
