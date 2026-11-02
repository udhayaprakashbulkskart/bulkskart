import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageMeta from '@/components/common/PageMeta';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BrandLogo from '@/components/common/BrandLogo';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Globe, Shield, Eye, EyeOff, Upload, AlertCircle, CheckCircle, ArrowRight, BadgeCheck, Package, TrendingUp, Zap, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { trackSignUp } from '@/lib/analytics';

// ── Industry mockup images (Optimized Unsplash CDN with auto-format) ────────────
const INDUSTRY_SLIDES = [
  {
    img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=75',
    label: 'Global Shipping & Logistics',
  },
  {
    img: 'https://cdn.pixabay.com/photo/2016/09/12/07/48/mechanical-1663275_1280.jpg',
    label: 'Machinery & Industrial',
  },
  {
    img: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=75',
    label: 'Textiles & Apparel',
  },
  {
    img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=75',
    label: 'Food & Beverages',
  },
  {
    img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=75',
    label: 'Electronics & Components',
  },
  {
    img: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=75',
    label: 'Bulk Cargo & Freight',
  },
];

// Per-tab context shown on the left panel
const TAB_CONTEXT: Record<string, { heading: string; sub: string; stats: { label: string; value: string }[]; pills: string[] }> = {
  login: {
    heading: 'Welcome Back to\nBulkSkart',
    sub: 'Sign in to manage your requirements, track quotes, and connect with verified global suppliers.',
    stats: [
      { label: 'Requirements', value: 'Post & track' },
      { label: 'Quotations', value: 'Compare offers' },
      { label: 'Suppliers', value: 'Verified profiles' },
      { label: 'Messages', value: 'Direct chat' },
    ],
    pills: ['Textiles', 'Machinery', 'Agriculture', 'Electronics', 'Pharma'],
  },
  buyer: {
    heading: 'Source Bulk Products\nFrom Verified Factories',
    sub: 'Post your requirements once and receive quotes from verified manufacturers.',
    stats: [
      { label: 'RFQs', value: 'Free to post' },
      { label: 'Quotes', value: 'Compare side by side' },
      { label: 'Suppliers', value: 'Verified profiles' },
      { label: 'Messages', value: 'Direct chat' },
    ],
    pills: ['Free Registration', 'Post RFQ Free', 'Compare Quotes', 'Direct Chat'],
  },
  supplier: {
    heading: 'Reach Buyers\nGlobally',
    sub: 'Get your business verified, list products, and receive qualified bulk-order RFQs from international buyers every day.',
    stats: [
      { label: 'Buyer RFQs', value: 'Browse open RFQs' },
      { label: 'Verification', value: 'KYC badge' },
      { label: 'Storefront', value: 'List products' },
      { label: 'Quotes', value: 'Send & track' },
    ],
    pills: ['KYC Verified Badge', 'Priority Visibility', 'RFQ Matching', 'Analytics'],
  },
};

// ── Left panel component ───────────────────────────────────────────────────────
function AuthLeftPanel({ tab }: { tab: string }) {
  const ctx = TAB_CONTEXT[tab] ?? TAB_CONTEXT.login;
  const [slideIdx, setSlideIdx] = useState(0);
  const [fadeSlide, setFadeSlide] = useState(true);

  // Cycle background image every 4s
  useEffect(() => {
    const t = setInterval(() => {
      setFadeSlide(false);
      setTimeout(() => {
        setSlideIdx(i => (i + 1) % INDUSTRY_SLIDES.length);
        setFadeSlide(true);
      }, 400);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const slide = INDUSTRY_SLIDES[slideIdx];

  return (
    <div className="hidden md:flex md:w-[52%] relative flex-col justify-between overflow-hidden bg-[#0d1117]">
      {/* ── Cycling background image ── */}
      <div
        className="absolute inset-0 z-0 transition-opacity duration-500"
        style={{ opacity: fadeSlide ? 1 : 0 }}
      >
        <img src={slide.img} alt={slide.label} className="w-full h-full object-cover" />
        {/* deep dark overlay — darker at top/bottom for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/85 via-[#0d1117]/55 to-[#0d1117]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1117]/60 via-transparent to-transparent" />
      </div>

      {/* ── Slide label chip ── */}
      <div className="absolute bottom-[52%] left-6 z-20">
        <span
          className="text-[10px] font-bold text-white/60 uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm transition-opacity duration-500"
          style={{ opacity: fadeSlide ? 1 : 0 }}
        >
          {slide.label}
        </span>
      </div>

      {/* ── Slide dots ── */}
      <div className="absolute bottom-[49%] right-6 z-20 flex gap-1.5">
        {INDUSTRY_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideIdx(i)}
            className={`rounded-full transition-all duration-300 ${i === slideIdx ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
          />
        ))}
      </div>

      {/* ── Top: logo ── */}
      <div className="relative z-10 p-8">
        <BrandLogo size="lg" variant="dark" linkTo="/" />
      </div>

      {/* ── Middle: heading + pills ── */}
      <div className="relative z-10 px-8 pb-4">
        <h2 className="text-[26px] font-black text-white leading-tight mb-3 whitespace-pre-line">
          {ctx.heading.split('\n').map((line, i) => (
            <span key={i} className={i === 1 ? 'text-primary' : ''}>{line}{i === 0 ? '\n' : ''}</span>
          ))}
        </h2>
        <p className="text-[13px] text-white/60 mb-5 max-w-sm leading-relaxed">{ctx.sub}</p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ctx.pills.map(pill => (
            <span key={pill} className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80 bg-white/10 border border-white/15 rounded-full px-3 py-1 backdrop-blur-sm">
              <CheckCircle className="w-3 h-3 text-primary shrink-0" />{pill}
            </span>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {ctx.stats.map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 backdrop-blur-sm">
              <div className="text-[18px] font-black text-white leading-none mb-0.5">{s.value}</div>
              <div className="text-[10px] text-white/50">{s.label}</div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Bottom: trust badge ── */}
      <div className="relative z-10 px-8 pb-6 flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <span className="text-[11px] text-white/40">Verified businesses only · Secure & compliant</span>
      </div>
    </div>
  );
}

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
}

export default function AuthPage() {
  const { user, profile, signIn, signUp, refreshProfile, resolvedRole, loading: authLoading, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const getResolvedTab = (): 'login' | 'buyer' | 'supplier' => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'supplier') return 'supplier';
    if (tabParam === 'buyer' || tabParam === 'register') return 'buyer';
    if (location.pathname === '/register' || location.pathname === '/signup') {
      return searchParams.get('role') === 'supplier' ? 'supplier' : 'buyer';
    }
    if (location.pathname === '/login') return 'login';
    return 'login';
  };

  const [activeTab, setActiveTab] = useState<'login' | 'buyer' | 'supplier'>(getResolvedTab);

  // Sync activeTab whenever route or searchParams change
  useEffect(() => {
    setActiveTab(getResolvedTab());
  }, [location.pathname, searchParams]);

  // Already signed in → return to the requested page, otherwise the role dashboard
  useEffect(() => {
    if (!user || authLoading) return;
    // Never default to buyer while role is still unknown
    if (!resolvedRole) return;
    const customRedirect = searchParams.get('redirect') || searchParams.get('returnUrl');
    if (customRedirect && customRedirect.startsWith('/') && !customRedirect.startsWith('//')) {
      navigate(customRedirect, { replace: true });
      return;
    }
    navigate(dashboardPath, { replace: true });
  }, [user, authLoading, resolvedRole, dashboardPath, navigate, searchParams]);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth?tab=login`,
      });
      if (error) {
        toast.error(error.message || 'Failed to send password reset email');
      } else {
        setForgotSent(true);
        toast.success('Password reset link has been dispatched to your email address');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send password reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  // Buyer register state — GST removed (not needed for buyers)
  const [buyerData, setBuyerData] = useState({ fullName: '', email: '', phone: '', password: '', companyName: '', city: '', country: 'India' });
  const [buyerAgreed, setBuyerAgreed] = useState(false);

  // Supplier register state
  const [supplierData, setSupplierData] = useState({ fullName: '', email: '', phone: '', password: '', companyName: '', gst: '', iec: '', businessType: '', city: '', state: '', country: 'India' });
  const [supplierAgreed, setSupplierAgreed] = useState(false);
  const [gstDoc, setGstDoc] = useState<File | null>(null);
  const [iecDoc, setIecDoc] = useState<File | null>(null);
  const [regDoc, setRegDoc] = useState<File | null>(null);

  // Policy & Terms dialog state
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState<'terms' | 'privacy'>('terms');

  const getTargetRedirect = (role?: string | null) => {
    const customRedirect = searchParams.get('redirect') || searchParams.get('returnUrl');
    if (customRedirect && customRedirect.startsWith('/') && !customRedirect.startsWith('//')) {
      return customRedirect;
    }
    if (role === 'admin') return '/dashboard/admin';
    if (role === 'supplier') return '/dashboard/supplier';
    if (role === 'buyer') return '/dashboard/buyer';
    return dashboardPath !== '/auth' ? dashboardPath : '/dashboard/buyer';
  };

  const doLogin = async (email: string, pw: string) => {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await signIn(email.trim().toLowerCase(), pw);
      if (err) {
        setError(err);
        toast.error(err);
        return;
      }

      toast.success('Signed in successfully!');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate('/');
        return;
      }
      await refreshProfile(currentUser.id);
      const { data: roleRow } = await supabase.from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
      const metaRole = (currentUser.user_metadata?.role as string | undefined) || null;
      navigate(getTargetRedirect(roleRow?.role || metaRole));
    } catch (err: any) {
      const msg = err?.message || 'Login failed. Please check your credentials and try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) {
      const msg = 'Please enter your email address.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!loginPw) {
      const msg = 'Please enter your password.';
      setError(msg);
      toast.error(msg);
      return;
    }

    await doLogin(cleanEmail, loginPw);
  };

  const handleBuyerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = buyerData.fullName.trim();
    if (!cleanName) {
      const msg = 'Please enter your full name.';
      setError(msg);
      toast.error(msg);
      return;
    }

    const cleanEmail = buyerData.email.trim().toLowerCase();
    if (!cleanEmail) {
      const msg = 'Please enter your email address.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (buyerData.password.length < 8) {
      const msg = 'Password must be at least 8 characters long.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!buyerAgreed) {
      const msg = 'Please accept the User Agreement and Privacy Policy to create an account.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const { error: err, user: registeredUser } = await signUp(cleanEmail, buyerData.password, cleanName, 'buyer');

      if (err) {
        if (err.toLowerCase().includes('already exists') || err.toLowerCase().includes('already registered')) {
          setLoginEmail(cleanEmail);
          setActiveTab('login');
          setError('An account with this email already exists. Please enter your password to sign in.');
          toast.info('Account already exists! Switched to Login tab.');
          return;
        }
        setError(err);
        toast.error(err);
        return;
      }

      const activeUser = registeredUser || (await supabase.auth.getUser()).data.user;
      if (activeUser) {
        try {
          await supabase.from('buyer_profiles').upsert({
            user_id: activeUser.id,
            company_name: buyerData.companyName?.trim() || cleanName || 'Buyer',
            city: buyerData.city?.trim() || null,
            country: buyerData.country,
          });
        } catch {
          // silent
        }
        await refreshProfile(activeUser.id);
      }

      toast.success('Buyer account created! Welcome to BulkSkart.');
      trackSignUp('buyer');
      navigate(getTargetRedirect('buyer'));
    } catch (err: any) {
      const msg = err?.message || 'Failed to create buyer account. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const uploadDoc = async (file: File, userId: string, label: string): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${label}-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('business-docs').upload(path, file);
      if (error) return null;
      const { data: urlData } = supabase.storage.from('business-docs').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch {
      return null;
    }
  };

  const handleSupplierRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = supplierData.fullName.trim();
    if (!cleanName) {
      const msg = 'Please enter your full name.';
      setError(msg);
      toast.error(msg);
      return;
    }

    const cleanEmail = supplierData.email.trim().toLowerCase();
    if (!cleanEmail) {
      const msg = 'Please enter your business email address.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (supplierData.password.length < 8) {
      const msg = 'Password must be at least 8 characters long.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!supplierData.companyName.trim()) {
      const msg = 'Please enter your company or factory name.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!supplierAgreed) {
      const msg = 'Please accept the User Agreement and Privacy Policy to register as a supplier.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const { error: err, user: registeredUser } = await signUp(cleanEmail, supplierData.password, cleanName, 'supplier');

      if (err) {
        if (err.toLowerCase().includes('already exists') || err.toLowerCase().includes('already registered')) {
          setLoginEmail(cleanEmail);
          setActiveTab('login');
          setError('An account with this email already exists. Please enter your password to sign in.');
          toast.info('Account already exists! Switched to Login tab.');
          return;
        }
        setError(err);
        toast.error(err);
        return;
      }

      // Get newly authenticated user
      const activeUser = registeredUser || (await supabase.auth.getUser()).data.user;
      if (activeUser) {
        let gstUrl: string | null = null, iecUrl: string | null = null, regUrl: string | null = null;
        if (gstDoc) gstUrl = await uploadDoc(gstDoc, activeUser.id, 'gst');
        if (iecDoc) iecUrl = await uploadDoc(iecDoc, activeUser.id, 'iec');
        if (regDoc) regUrl = await uploadDoc(regDoc, activeUser.id, 'reg');

        const newCompanyPayload = {
          owner_id: activeUser.id,
          company_name: supplierData.companyName.trim(),
          slug: generateSlug(supplierData.companyName),
          gst_number: supplierData.gst?.trim() || null,
          iec_number: supplierData.iec?.trim() || null,
          business_type: supplierData.businessType || null,
          city: supplierData.city?.trim() || null,
          state: supplierData.state?.trim() || null,
          country: supplierData.country,
          verification_status: (gstDoc || iecDoc || regDoc) ? 'pending' : 'unverified',
          gst_doc_url: gstUrl,
          iec_doc_url: iecUrl,
          reg_doc_url: regUrl,
        };

        try {
          const { data: newCo } = await supabase
            .from('companies')
            .insert(newCompanyPayload)
            .select('id')
            .maybeSingle();

          if (newCo?.id) {
            import('@/lib/api').then(({ triggerMatchNewManufacturer }) =>
              triggerMatchNewManufacturer(newCo.id)
            );
          }
        } catch (compErr) {
          console.warn('Company insert notice:', compErr);
        }

        await refreshProfile(activeUser.id);
      }

      toast.success('Supplier account created! Please complete your business profile.');
      trackSignUp('supplier');
      navigate('/business-setup');
    } catch (err: any) {
      const msg = err?.message || 'Failed to complete supplier registration. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <PageMeta
        title="Login or Register — BulkSkart B2B Marketplace"
        description="Sign in to BulkSkart to source bulk products, post RFQs, or register as a verified supplier and connect with thousands of global buyers."
        keywords="B2B login, supplier registration, buyer signup, BulkSkart account"
        canonical="/auth"
        robots="noindex, nofollow"
      />
      <AuthLeftPanel tab={activeTab} />

      {/* Right — auth forms */}
      <div className="flex-1 min-w-0 h-screen overflow-y-auto flex items-start sm:items-center justify-center p-4 sm:p-6 md:p-8 bg-background">
        <div className="w-full max-w-md py-6 my-auto">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center mb-6 justify-center">
            <BrandLogo size="md" variant="auto" linkTo="/" />
          </div>

          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'login' | 'buyer' | 'supplier')}>
            <TabsList className="w-full bg-muted border border-border mb-6 grid grid-cols-3">
              <TabsTrigger value="login" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Login</TabsTrigger>
              <TabsTrigger value="buyer" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Buyer</TabsTrigger>
              <TabsTrigger value="supplier" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Supplier</TabsTrigger>
            </TabsList>

            {/* ===== LOGIN ===== */}
            <TabsContent value="login">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Sign in to your BulkSkart account</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>{error}</p>
                      {error.includes('already exists') && (
                        <p className="mt-1 text-muted-foreground">
                          Enter your account password below or reset it via "Forgot password?".
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email Address</Label>
                  <Input
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="you@company.com"
                    className="bg-card border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail.trim());
                        setForgotSent(false);
                        setForgotOpen(true);
                      }}
                      className="text-xs text-[#FF5A00] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      value={loginPw}
                      onChange={e => setLoginPw(e.target.value)}
                      type={showPw ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="bg-card border-border pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setActiveTab('buyer')} className="text-primary font-semibold hover:underline">
                    Register free as Buyer
                  </button>
                  {' · '}
                  <button type="button" onClick={() => setActiveTab('supplier')} className="text-primary font-semibold hover:underline">
                    Supplier
                  </button>
                </p>
              </form>
            </TabsContent>

            {/* ===== BUYER REGISTER ===== */}
            <TabsContent value="buyer">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Register as Buyer</h1>
                <p className="text-sm text-muted-foreground">Free registration — Post requirements &amp; get quotes</p>
              </div>
              <form onSubmit={handleBuyerRegister} className="space-y-3">
                {error && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Full Name *</Label>
                    <Input value={buyerData.fullName} onChange={e => setBuyerData(p => ({ ...p, fullName: e.target.value }))} required placeholder="John Doe" className="bg-card border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <Input value={buyerData.phone} onChange={e => setBuyerData(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765..." className="bg-card border-border" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company / Organisation Name</Label>
                  <Input value={buyerData.companyName} onChange={e => setBuyerData(p => ({ ...p, companyName: e.target.value }))} placeholder="Acme Corp Ltd (optional)" className="bg-card border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <Input value={buyerData.city} onChange={e => setBuyerData(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" className="bg-card border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <Input value={buyerData.country} onChange={e => setBuyerData(p => ({ ...p, country: e.target.value }))} placeholder="India" className="bg-card border-border" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email *</Label>
                  <Input value={buyerData.email} onChange={e => setBuyerData(p => ({ ...p, email: e.target.value }))} type="email" required placeholder="you@company.com" className="bg-card border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Password * (min 8 chars)</Label>
                  <div className="relative">
                    <Input value={buyerData.password} onChange={e => setBuyerData(p => ({ ...p, password: e.target.value }))} type={showPw ? 'text' : 'password'} required placeholder="••••••••" className="bg-card border-border pr-10" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* User Agreement & Privacy Policy Checkbox */}
                <div className="flex items-start gap-2.5 pt-1.5">
                  <Checkbox
                    id="buyer-terms"
                    checked={buyerAgreed}
                    onCheckedChange={(checked) => setBuyerAgreed(!!checked)}
                    className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="buyer-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                    I agree to the BulkSkart{' '}
                    <button
                      type="button"
                      onClick={() => { setPolicyTab('terms'); setPolicyOpen(true); }}
                      className="text-primary underline hover:text-primary/90 font-medium"
                    >
                      User Agreement
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={() => { setPolicyTab('privacy'); setPolicyOpen(true); }}
                      className="text-primary underline hover:text-primary/90 font-medium"
                    >
                      Privacy Policy
                    </button>
                    .
                  </label>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2 font-bold">
                  {loading ? 'Creating account...' : 'Create Buyer Account — Free'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setActiveTab('login')} className="text-primary font-semibold hover:underline">Sign in</button>
                </p>
              </form>
            </TabsContent>

            {/* ===== SUPPLIER REGISTER ===== */}
            <TabsContent value="supplier">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Register as Supplier</h1>
                <p className="text-sm text-muted-foreground">Get verified & start receiving bulk order enquiries</p>
              </div>
              <form onSubmit={handleSupplierRegister} className="space-y-3">
                {error && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Full Name *</Label>
                    <Input value={supplierData.fullName} onChange={e => setSupplierData(p => ({ ...p, fullName: e.target.value }))} required placeholder="John Doe" className="bg-card border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <Input value={supplierData.phone} onChange={e => setSupplierData(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765..." className="bg-card border-border" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company Name *</Label>
                  <Input value={supplierData.companyName} onChange={e => setSupplierData(p => ({ ...p, companyName: e.target.value }))} required placeholder="Your Manufacturing Co." className="bg-card border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">GST Number</Label>
                    <Input value={supplierData.gst} onChange={e => setSupplierData(p => ({ ...p, gst: e.target.value }))} placeholder="22AAAAA..." className="bg-card border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">IEC Number</Label>
                    <Input value={supplierData.iec} onChange={e => setSupplierData(p => ({ ...p, iec: e.target.value }))} placeholder="IEC No." className="bg-card border-border" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <Input value={supplierData.city} onChange={e => setSupplierData(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" className="bg-card border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <Input value={supplierData.country} onChange={e => setSupplierData(p => ({ ...p, country: e.target.value }))} placeholder="India" className="bg-card border-border" />
                  </div>
                </div>
                {/* Document uploads */}
                <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Business Documents (for verification)</p>
                  {[
                    { label: 'GST Certificate', key: 'gst', state: gstDoc, setter: setGstDoc },
                    { label: 'IEC Certificate', key: 'iec', state: iecDoc, setter: setIecDoc },
                    { label: 'Company Registration', key: 'reg', state: regDoc, setter: setRegDoc },
                  ].map(({ label, key, state, setter }) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="flex-1 flex items-center gap-2 cursor-pointer">
                        <div className={`flex-1 border border-dashed rounded-md px-3 py-2 text-xs transition-colors ${state ? 'border-primary/40 text-primary bg-primary/5' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                          {state ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{state.name}</span> : `Upload ${label}`}
                        </div>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setter(e.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Business Email *</Label>
                  <Input value={supplierData.email} onChange={e => setSupplierData(p => ({ ...p, email: e.target.value }))} type="email" required placeholder="you@company.com" className="bg-card border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Password * (min 8 chars)</Label>
                  <div className="relative">
                    <Input value={supplierData.password} onChange={e => setSupplierData(p => ({ ...p, password: e.target.value }))} type={showPw ? 'text' : 'password'} required placeholder="••••••••" className="bg-card border-border pr-10" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* User Agreement & Privacy Policy Checkbox */}
                <div className="flex items-start gap-2.5 pt-1.5">
                  <Checkbox
                    id="supplier-terms"
                    checked={supplierAgreed}
                    onCheckedChange={(checked) => setSupplierAgreed(!!checked)}
                    className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="supplier-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                    I agree to the BulkSkart{' '}
                    <button
                      type="button"
                      onClick={() => { setPolicyTab('terms'); setPolicyOpen(true); }}
                      className="text-primary underline hover:text-primary/90 font-medium"
                    >
                      User Agreement
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={() => { setPolicyTab('privacy'); setPolicyOpen(true); }}
                      className="text-primary underline hover:text-primary/90 font-medium"
                    >
                      Privacy Policy
                    </button>
                    .
                  </label>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2 font-bold">
                  {loading ? 'Creating account...' : 'Register as Supplier'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setActiveTab('login')} className="text-primary font-semibold hover:underline">Sign in</button>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* User Agreement & Privacy Policy Modal */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {policyTab === 'terms' ? 'BulkSkart User Agreement' : 'BulkSkart Privacy Policy'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setPolicyTab('terms')}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors ${
                policyTab === 'terms' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              User Agreement
            </button>
            <button
              type="button"
              onClick={() => setPolicyTab('privacy')}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors ${
                policyTab === 'privacy' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Privacy Policy
            </button>
          </div>
          <div className="text-xs text-muted-foreground space-y-3 py-2 leading-relaxed">
            {policyTab === 'terms' ? (
              <>
                <p className="font-semibold text-foreground">1. Acceptance of Terms</p>
                <p>
                  By accessing or registering with BulkSkart ("the Platform"), you agree to abide by all platform rules,
                  commercial dispute guidelines, and legitimate trade laws governing bulk transactions.
                </p>
                <p className="font-semibold text-foreground">2. Business Verification & Conduct</p>
                <p>
                  Suppliers and buyers represent that all provided GST, IEC, trade certificates, and product specifications
                  are truthful, accurate, and lawfully represented.
                </p>
                <p className="font-semibold text-foreground">3. RFQs and Quotations</p>
                <p>
                  All quotation submissions and procurement inquiries sent through BulkSkart constitute bona fide commercial communications.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">1. Data Collection & Usage</p>
                <p>
                  BulkSkart collects business contact details, company credentials, and trade communications exclusively to facilitate
                  trusted B2B matching and secure enterprise RFQ fulfillment.
                </p>
                <p className="font-semibold text-foreground">2. Confidentiality & Security</p>
                <p>
                  Your business documents, quotations, and financial transaction logs are encrypted and safeguarded with enterprise-grade access controls.
                </p>
                <p className="font-semibold text-foreground">3. Data Sharing</p>
                <p>
                  We never sell your contact information to third-party marketers. Data is only shared with verified transaction parties as authorized by you.
                </p>
              </>
            )}
          </div>
          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              type="button"
              onClick={() => {
                if (activeTab === 'buyer') setBuyerAgreed(true);
                if (activeTab === 'supplier') setSupplierAgreed(true);
                setPolicyOpen(false);
              }}
              className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4"
            >
              Accept &amp; Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-[#12141E] border-border text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Reset Password</DialogTitle>
          </DialogHeader>
          {forgotSent ? (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">Reset Link Dispatched</p>
              <p className="text-xs text-muted-foreground">
                We've sent a password recovery email to <span className="text-white font-medium">{forgotEmail}</span>. Please check your inbox and follow the instructions.
              </p>
              <Button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="w-full bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold h-10 rounded-xl mt-2"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Enter your registered BulkSkart account email and we'll send you a secure link to reset your password.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Registered Email</Label>
                <Input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="bg-[#0A0A0F] border-border text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForgotOpen(false)}
                  className="border border-border text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold"
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
