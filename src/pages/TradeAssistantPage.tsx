import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import PageMeta from '@/components/common/PageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles, Calculator, FileCheck2, Truck, ArrowRight,
  ShieldCheck, Globe2, ChevronRight, CheckCircle2, AlertTriangle,
  Building2, Box, Ship, Plane, HelpCircle, Layers, Download,
  Send, FileText, Check, ExternalLink, RefreshCw, Info, BookmarkCheck,
  TrendingUp, ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { Category, Requirement } from '@/types/types';
import { getCategories, getProducts } from '@/lib/api';
import { SUPPORT_EMAIL, WHATSAPP_CHAT_URL } from '@/lib/supportContact';
import {
  SUPPORTED_TRADE_CURRENCIES,
  DEFAULT_FALLBACK_RATES,
  getLiveExchangeRates,
  convertCrossCurrency,
  formatCurrencyValue,
} from '@/services/realtimeExchangeRate';

/** A supplier whose listed products match the words typed into the sourcing search. */
interface SourcingMatch {
  companyId: string;
  slug: string | null;
  name: string;
  location: string;
  verified: boolean;
  products: Array<{ name: string; slug: string; moq: number; moqUnit: string }>;
}

const SOURCING_STOP_WORDS = new Set(['with', 'and', 'for', 'the', 'from', 'that', 'this', 'into', 'type', 'grade', 'high', 'quality']);

// Predefined HS Code and Tariff rates database
interface CommodityRate {
  code: string;
  name: string;
  category: string;
  dutyRate: number; // e.g. 0.075 for 7.5%
  igstRate: number; // e.g. 0.18 for 18%
  swsRate: number;  // Social Welfare Surcharge (10% of BCD)
  docs: string[];
}

const COMMODITY_RATES: Record<string, CommodityRate> = {
  'machinery': {
    code: '8428.90.90',
    name: 'Industrial Machinery & Material Handling Equipment',
    category: 'Machinery',
    dutyRate: 0.075,
    igstRate: 0.18,
    swsRate: 0.10,
    docs: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin', 'CE / ISO Declaration', 'Pre-Shipment Inspection (PSI)'],
  },
  'steel': {
    code: '7210.49.00',
    name: 'Flat-Rolled Structural Steel & Galvanized Coils',
    category: 'Steel & Metals',
    dutyRate: 0.125,
    igstRate: 0.18,
    swsRate: 0.10,
    docs: ['Commercial Invoice', 'Packing List', 'Mill Test Certificate (MTC - EN 10204 3.1)', 'Bill of Lading', 'Certificate of Origin', 'BIS Registration (India)'],
  },
  'polymers': {
    code: '3901.10.10',
    name: 'Polymers, Resins & Plastic Granules (LLDPE/HDPE)',
    category: 'Chemicals & Polymers',
    dutyRate: 0.075,
    igstRate: 0.18,
    swsRate: 0.10,
    docs: ['Commercial Invoice', 'Packing List', 'Technical Data Sheet (TDS)', 'MSDS / Safety Data Sheet', 'Certificate of Analysis (COA)', 'Bill of Lading'],
  },
  'textiles': {
    code: '6109.10.00',
    name: 'Cotton Textiles, Knitted Fabrics & Garments',
    category: 'Textiles',
    dutyRate: 0.10,
    igstRate: 0.12,
    swsRate: 0.10,
    docs: ['Commercial Invoice', 'Packing List', 'Certificate of Origin (Form A / COO)', 'Textile Fiber Declaration', 'Fumigation Certificate (if required)', 'Bill of Lading'],
  },
  'solar': {
    code: '8541.40.11',
    name: 'Solar Photovoltaic Cells & Assembled Solar Modules',
    category: 'Solar & Renewable',
    dutyRate: 0.25, // Basic customs duty on solar modules
    igstRate: 0.12,
    swsRate: 0.10,
    docs: ['Commercial Invoice', 'Packing List', 'IEC / BIS Certification', 'Flash Test Report', 'Warranty & Technical Datasheet', 'Bill of Lading'],
  },
  'electrical': {
    code: '8504.40.90',
    name: 'Industrial Transformers & Electrical Inverters',
    category: 'Electrical',
    dutyRate: 0.075,
    igstRate: 0.18,
    swsRate: 0.10,
    docs: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'CE Compliance Certificate', 'Factory Test Certificate', 'Certificate of Origin'],
  },
};

const CORRIDOR_DOCUMENTS = [
  {
    name: 'Commercial Invoice (CI)',
    mandatory: true,
    authority: 'Customs & Port Authorities',
    purpose: 'Itemized valuation of cargo, unit pricing, HS Codes, Buyer & Seller Tax IDs, and declared Incoterms (FOB/CIF).',
    format: 'Standardized UN/CEFACT format with digital signature',
  },
  {
    name: 'Detailed Packing List (PL)',
    mandatory: true,
    authority: 'Freight Forwarder & Terminal Operator',
    purpose: 'Itemizes carton count, pallet dimensions, net weight, gross weight, and container stuffing marks.',
    format: 'Cross-referenced against Commercial Invoice numbers',
  },
  {
    name: 'Bill of Lading (Ocean) / Air Waybill (Air)',
    mandatory: true,
    authority: 'Shipping Line (Maersk, MSC, CMA CGM) or Carrier',
    purpose: 'Title document of goods and contract of carriage issued by the carrier upon vessel loading.',
    format: 'Original 3/3 Negotiable or Seaway Express Release',
  },
  {
    name: 'Certificate of Origin (COO)',
    mandatory: true,
    authority: 'Chamber of Commerce / Export Promotion Council',
    purpose: 'Validates manufacturing country for preferential tariff eligibility under FTAs (CEPA, Indo-UAE, ASEAN).',
    format: 'Government-attested digital COO with QR verification',
  },
  {
    name: 'Mandatory Standards Compliance (BIS / CE / FDA)',
    mandatory: true,
    authority: 'National Standards Body (BIS for India, CE for EU, FDA for USA)',
    purpose: 'Certifies that electrical, medical, steel, or machinery products meet regulatory safety and quality mandates.',
    format: 'Test reports from ISO/IEC 17025 accredited laboratories',
  },
  {
    name: 'Marine Cargo Insurance Policy',
    mandatory: false,
    authority: 'Underwriter / Insurance Broker',
    purpose: 'Protects against total loss, damage during transit, General Average, and port pilferage under Institute Cargo Clauses (A).',
    format: '110% of CIF value cargo coverage certificate',
  },
];

export default function TradeAssistantPage() {
  const { user, profile, company } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // URL query parameter for active tab
  const searchParams = new URLSearchParams(location.search);
  const getTabFromLocation = () => {
    if (location.pathname === '/ai-sourcing') return 'sourcing';
    const tabParam = new URLSearchParams(location.search).get('tab');
    if (tabParam === 'sourcing' || tabParam === 'documents' || tabParam === 'coordination') {
      return tabParam;
    }
    return 'calculator';
  };

  const [activeTab, setActiveTab] = useState(getTabFromLocation);

  // Synchronize tab when URL search or path changes
  useEffect(() => {
    setActiveTab(getTabFromLocation());
  }, [location.pathname, location.search]);

  // User active RFQs state for pre-filling
  const [userRFQs, setUserRFQs] = useState<Requirement[]>([]);
  const [selectedRFQId, setSelectedRFQId] = useState<string>('');

  // ── Real-Time Currency Exchange State ──
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('INR');
  const [liveRates, setLiveRates] = useState<Record<string, number>>(DEFAULT_FALLBACK_RATES);
  const [fxLastUpdated, setFxLastUpdated] = useState<string>('Live Rates');
  const [isFxLoading, setIsFxLoading] = useState<boolean>(false);
  const [fxSource, setFxSource] = useState<string>('live_gateway');
  const [showSpreadInfo, setShowSpreadInfo] = useState<boolean>(false);

  // Fetch live exchange rates on mount and manual refresh
  const loadRates = useCallback(async (force = false) => {
    setIsFxLoading(true);
    try {
      const res = await getLiveExchangeRates('USD', force);
      if (res.rates) {
        setLiveRates(res.rates);
        const timeStr = new Date(res.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setFxLastUpdated(`${timeStr} (${res.isLive ? 'Real-Time' : 'Synced'})`);
        setFxSource(res.source);
        if (force) toast.success('Real-time currency exchange rates updated!');
      }
    } catch {
      // Retain fallback rates
    } finally {
      setIsFxLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  // ── Tab 1: Landed Cost Estimator State ──
  const [originCountry, setOriginCountry] = useState('India');
  const [originPort, setOriginPort] = useState('Nhava Sheva (JNPT)');
  const [destCountry, setDestCountry] = useState('USA');
  const [destPort, setDestPort] = useState('New York / New Jersey');
  const [selectedCommodityKey, setSelectedCommodityKey] = useState('machinery');
  const [fobValue, setFobValue] = useState('45000');
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState('Units');
  const [weightKg, setWeightKg] = useState('3500');
  const [volumeCbm, setVolumeCbm] = useState('12');
  const [shippingMode, setShippingMode] = useState<'sea_fcl' | 'sea_lcl' | 'air'>('sea_fcl');
  const [incoterm, setIncoterm] = useState('FOB');

  // ── Tab 2: Sourcing Match State (real products and suppliers from the BulkSkart directory) ──
  const [sourcingQuery, setSourcingQuery] = useState('');
  const [sourcingCategoryId, setSourcingCategoryId] = useState('');
  const [sourcingCategories, setSourcingCategories] = useState<Category[]>([]);
  const [sourcingResults, setSourcingResults] = useState<SourcingMatch[]>([]);
  const [sourcingLoading, setSourcingLoading] = useState(false);
  const [sourcingSearched, setSourcingSearched] = useState(false);

  useEffect(() => {
    let alive = true;
    getCategories()
      .then((rows) => { if (alive) setSourcingCategories(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleFindSuppliers = async () => {
    const terms = [...new Set(sourcingQuery.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !SOURCING_STOP_WORDS.has(w)))].slice(0, 4);
    if (terms.length === 0 && !sourcingCategoryId) {
      toast.error('Describe the product you want to source, or pick a category.');
      return;
    }
    setSourcingLoading(true);
    try {
      const lists = terms.length > 0
        ? await Promise.all(terms.map((term) => getProducts({ search: term, categoryId: sourcingCategoryId || undefined, limit: 60 })))
        : [await getProducts({ categoryId: sourcingCategoryId, limit: 60 })];
      // One card per supplier, ranked by how many of the typed words their listed products matched.
      const bySupplier = new Map<string, { match: SourcingMatch; hits: number }>();
      for (const products of lists) {
        for (const product of products) {
          const company = product.companies;
          if (!company) continue;
          const entry = bySupplier.get(company.id) ?? {
            match: {
              companyId: company.id,
              slug: company.slug ?? null,
              name: company.company_name,
              location: [company.city, company.country].filter(Boolean).join(', '),
              verified: company.verification_status === 'verified',
              products: [],
            },
            hits: 0,
          };
          entry.hits += 1;
          if (!entry.match.products.some((item) => item.slug === product.slug)) {
            entry.match.products.push({ name: product.name, slug: product.slug, moq: product.moq, moqUnit: product.moq_unit });
          }
          bySupplier.set(company.id, entry);
        }
      }
      setSourcingResults([...bySupplier.values()].sort((a, b) => b.hits - a.hits).slice(0, 9).map((entry) => entry.match));
      setSourcingSearched(true);
    } catch {
      toast.error('The supplier search failed. Please try again.');
    } finally {
      setSourcingLoading(false);
    }
  };

  // ── Tab 4: Shipment Coordination Form ──
  const [coordOrigin, setCoordOrigin] = useState('');
  const [coordDest, setCoordDest] = useState('');
  const [coordCargoDesc, setCoordCargoDesc] = useState('');
  const [coordReadyDate, setCoordReadyDate] = useState('');
  const [coordContainerType, setCoordContainerType] = useState('40ft High Cube Container');
  const [coordNotes, setCoordNotes] = useState('');
  const [coordSubmitted, setCoordSubmitted] = useState(false);

  // The shipment details as one message, ready to send to the BulkSkart team.
  const coordMessage = [
    'Shipment coordination request',
    `Pickup: ${coordOrigin}`,
    `Destination: ${coordDest}`,
    `Cargo: ${coordCargoDesc}`,
    `Shipment type: ${coordContainerType}`,
    `Cargo ready date: ${coordReadyDate}`,
    coordNotes.trim() ? `Notes: ${coordNotes.trim()}` : '',
  ].filter(Boolean).join('\n');

  // Fetch user RFQs on mount if authenticated
  useEffect(() => {
    async function fetchUserRFQs() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('requirements')
          .select('*')
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!error && data) {
          setUserRFQs(data);
        }
      } catch {}
    }
    fetchUserRFQs();
  }, [user]);

  // Handle RFQ auto-population
  const handlePreFillRFQ = (rfqId: string) => {
    setSelectedRFQId(rfqId);
    const rfq = userRFQs.find(r => r.id === rfqId);
    if (!rfq) return;

    setFobValue(rfq.budget_max ? String(rfq.budget_max) : '35000');
    setQuantity(String(rfq.quantity || 10));
    setUnit(rfq.quantity_unit || 'Units');
    setCoordCargoDesc(rfq.title);
    if (rfq.destination_city) {
      setDestPort(`${rfq.destination_city}, ${rfq.destination_country || 'India'}`);
    }
    toast.success(`Populated calculation fields from RFQ #${rfq.title.slice(0, 24)}...`);
  };

  // Landed Cost Calculations
  const rawCargoVal = parseFloat(fobValue) || 10000;
  const commodity = COMMODITY_RATES[selectedCommodityKey] || COMMODITY_RATES['machinery'];

  // Normalize cargo value into USD for standardized shipping and duty computation
  const { convertedAmount: cargoValInUsd } = convertCrossCurrency(rawCargoVal, baseCurrency, 'USD', liveRates);
  const cargoVal = cargoValInUsd;

  // Freight calculation based on mode and volume/weight (standardized in USD)
  const cbm = parseFloat(volumeCbm) || 10;
  const weight = parseFloat(weightKg) || 1000;
  let estimatedFreightInUsd = 0;
  if (shippingMode === 'sea_fcl') {
    estimatedFreightInUsd = 3400; // Flat 20ft/40ft standard maritime freight
  } else if (shippingMode === 'sea_lcl') {
    estimatedFreightInUsd = Math.max(cbm * 140, (weight / 1000) * 160);
  } else {
    estimatedFreightInUsd = weight * 4.8; // Air freight per kg
  }

  const marineInsuranceInUsd = Math.round(cargoVal * 0.0035); // 0.35% CIF insurance
  const cifValueInUsd = Math.round(cargoVal + estimatedFreightInUsd + marineInsuranceInUsd);

  // Customs calculations in USD
  const basicCustomsDutyInUsd = Math.round(cifValueInUsd * commodity.dutyRate);
  const socialWelfareSurchargeInUsd = Math.round(basicCustomsDutyInUsd * commodity.swsRate);
  const assessableValueForTaxInUsd = cifValueInUsd + basicCustomsDutyInUsd + socialWelfareSurchargeInUsd;
  const importGstVatInUsd = Math.round(assessableValueForTaxInUsd * commodity.igstRate);
  const portTerminalHandlingInUsd = shippingMode === 'sea_fcl' ? 450 : shippingMode === 'sea_lcl' ? 220 : 180;

  const totalLandedCostInUsd = Math.round(cifValueInUsd + basicCustomsDutyInUsd + socialWelfareSurchargeInUsd + importGstVatInUsd + portTerminalHandlingInUsd);
  const unitsCount = parseFloat(quantity) || 1;
  const landedCostPerUnitInUsd = Math.round(totalLandedCostInUsd / unitsCount);

  // Live currency conversion factors from USD to Base & Target currencies
  const { convertedAmount: totalLandedInBase } = convertCrossCurrency(totalLandedCostInUsd, 'USD', baseCurrency, liveRates);
  const { convertedAmount: totalLandedInTarget, rate: liveUsdToTargetRate } = convertCrossCurrency(totalLandedCostInUsd, 'USD', targetCurrency, liveRates);
  const { convertedAmount: unitLandedInTarget } = convertCrossCurrency(landedCostPerUnitInUsd, 'USD', targetCurrency, liveRates);

  // Live conversion for all line items to Target Currency
  const { convertedAmount: cargoValInTarget } = convertCrossCurrency(cargoVal, 'USD', targetCurrency, liveRates);
  const { convertedAmount: freightInTarget } = convertCrossCurrency(estimatedFreightInUsd, 'USD', targetCurrency, liveRates);
  const { convertedAmount: insuranceInTarget } = convertCrossCurrency(marineInsuranceInUsd, 'USD', targetCurrency, liveRates);
  const { convertedAmount: bcdInTarget } = convertCrossCurrency(basicCustomsDutyInUsd, 'USD', targetCurrency, liveRates);
  const { convertedAmount: swsInTarget } = convertCrossCurrency(socialWelfareSurchargeInUsd, 'USD', targetCurrency, liveRates);
  const { convertedAmount: vatInTarget } = convertCrossCurrency(importGstVatInUsd, 'USD', targetCurrency, liveRates);
  const { convertedAmount: portInTarget } = convertCrossCurrency(portTerminalHandlingInUsd, 'USD', targetCurrency, liveRates);

  // Direct exchange rate between Base and Target Currency
  const { rate: directExchangeRate, reverseRate: directReverseRate } = convertCrossCurrency(1, baseCurrency, targetCurrency, liveRates);

  // Commercial Settlement Buffer (1.0% bank forex spread)
  const commercialSpreadAmount = Math.round(totalLandedInTarget * 0.01);
  const totalWithCommercialSpread = Math.round(totalLandedInTarget + commercialSpreadAmount);

  // The form is not stored anywhere: it is turned into a message the person sends to the BulkSkart team themselves.
  const handleSubmitCoordination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordCargoDesc.trim()) {
      toast.error('Please enter a description of your cargo.');
      return;
    }
    setCoordSubmitted(true);
  };

  return (
    <MainLayout>
      <PageMeta
        title="AI Import & Export Assistant — Landed Cost, Duty & Logistics | BulkSkart"
        description="Calculate landed costs, customs tariffs, trade documentation checklists, and request shipment coordination through Bulkskart's verified logistics network."
        canonical="/trade-assistant"
      />

      <div className="min-h-screen bg-[#030712] text-white py-6 sm:py-10 px-3 sm:px-6 lg:px-8 pb-36 sm:pb-48">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

          {/* ── Page Header ────────────────────────────────────────── */}
          <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-r from-[#FF5A00] via-orange-500/40 to-[#FF5A00]/50 shadow-[0_0_40px_rgba(255,90,0,0.15)]">
            <div className="relative rounded-[22.5px] bg-[#070B13] p-6 sm:p-8 md:p-10 text-white overflow-hidden border border-white/5">
              <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#FF5A00]/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[#FF5A00]/10 blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5A00]/15 border border-[#FF5A00]/30 text-[#FF8A3D] text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 fill-[#FF5A00]" />
                    <span>Global Trade Intelligence</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                    AI Import & Export <span className="text-[#FF5A00]">Assistant</span>
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Automated landed cost calculations, HS Code tariff estimators, customs compliance documentation checklists, and end-to-end freight coordination for global wholesale procurement.
                  </p>
                </div>

                {/* Pre-fill from existing user RFQ dropdown */}
                {user && userRFQs.length > 0 && (
                  <div className="shrink-0 bg-slate-900/90 border border-slate-700/80 p-3.5 rounded-2xl max-w-sm w-full">
                    <label className="text-[11px] font-bold text-[#FF8A3D] flex items-center gap-1.5 mb-1.5 uppercase tracking-wider">
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>Pre-fill from Your Active RFQ</span>
                    </label>
                    <select
                      value={selectedRFQId}
                      onChange={(e) => handlePreFillRFQ(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-[#FF5A00]"
                    >
                      <option value="">Select an active RFQ...</option>
                      {userRFQs.map(rfq => (
                        <option key={rfq.id} value={rfq.id}>
                          {rfq.title.slice(0, 32)}... ({rfq.quantity} {rfq.quantity_unit})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Main Tabbed Interface ──────────────────────────────── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <TabsList className="bg-slate-900/90 border border-slate-800 p-1 rounded-2xl grid grid-cols-2 lg:grid-cols-4 h-auto gap-1">
              <TabsTrigger
                value="calculator"
                className="data-[state=active]:bg-[#FF5A00] data-[state=active]:text-white text-slate-300 font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                <span>Landed Cost & Duty</span>
              </TabsTrigger>
              <TabsTrigger
                value="sourcing"
                className="data-[state=active]:bg-[#FF5A00] data-[state=active]:text-white text-slate-300 font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Box className="w-4 h-4" />
                <span>Find Suppliers</span>
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="data-[state=active]:bg-[#FF5A00] data-[state=active]:text-white text-slate-300 font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Compliance & Docs</span>
              </TabsTrigger>
              <TabsTrigger
                value="coordination"
                className="data-[state=active]:bg-[#FF5A00] data-[state=active]:text-white text-slate-300 font-bold text-xs sm:text-sm py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>Shipment Coordination</span>
              </TabsTrigger>
            </TabsList>

            {/* ═════════════════════════════════════════════════════════
                TAB 1: LANDED COST & CUSTOMS DUTY ESTIMATOR
            ═════════════════════════════════════════════════════════ */}
            <TabsContent value="calculator" className="space-y-6">

              {/* ── Real-Time Live Forex Ticker Bar ───────────────────── */}
              <div className="rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0B132B]/80 to-slate-900/90 border border-slate-800 p-4 shadow-lg backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Real-Time Live FX Rates</span>
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold py-0.5">
                      {fxSource === 'live_gateway' ? 'Live Interbank Gateway' : 'Daily Market Synced'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      Updated: <strong className="text-slate-300 font-medium">{fxLastUpdated}</strong>
                    </span>
                    <Button
                      onClick={() => loadRates(true)}
                      disabled={isFxLoading}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-xs text-[#FF8A3D] hover:text-white hover:bg-[#FF5A00]/20 rounded-lg font-semibold gap-1.5 border border-[#FF5A00]/30"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFxLoading ? 'animate-spin' : ''}`} />
                      <span>{isFxLoading ? 'Fetching...' : 'Refresh Rates'}</span>
                    </Button>
                  </div>
                </div>

                {/* Live Currency Rate Badges Carousel */}
                <div className="flex items-center gap-2.5 pt-3 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { pair: 'USD / INR', from: 'USD', to: 'INR' },
                    { pair: 'EUR / USD', from: 'EUR', to: 'USD' },
                    { pair: 'USD / AED', from: 'USD', to: 'AED' },
                    { pair: 'GBP / USD', from: 'GBP', to: 'USD' },
                    { pair: 'USD / CNY', from: 'USD', to: 'CNY' },
                    { pair: 'USD / JPY', from: 'USD', to: 'JPY' },
                    { pair: 'USD / SGD', from: 'USD', to: 'SGD' },
                    { pair: 'AUD / USD', from: 'AUD', to: 'USD' },
                    { pair: 'USD / CAD', from: 'USD', to: 'CAD' },
                  ].map((p, idx) => {
                    const conv = convertCrossCurrency(1, p.from, p.to, liveRates);
                    const isSelectedTarget = targetCurrency === p.to;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTargetCurrency(p.to);
                          toast.success(`Target calculation currency set to ${p.to}`);
                        }}
                        className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                          isSelectedTarget
                            ? 'bg-[#FF5A00]/15 border-[#FF5A00] text-white shadow-sm ring-1 ring-[#FF5A00]/40'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <span className="font-semibold text-[11px] text-slate-400">{p.pair}:</span>
                        <span className="font-mono font-bold text-emerald-400">{conv.rate.toFixed(conv.rate > 20 ? 2 : 4)}</span>
                        {isSelectedTarget && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Column: Input Form (7 cols) */}
                <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-5 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-[#FF5A00]" />
                      <span>Shipment & Tariff Parameters</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Target Currency:</span>
                      <select
                        value={targetCurrency}
                        onChange={(e) => setTargetCurrency(e.target.value)}
                        className="bg-slate-950 border border-[#FF5A00]/60 rounded-lg px-2 py-1 text-white text-xs font-bold focus:outline-none focus:border-[#FF5A00]"
                      >
                        {Object.values(SUPPORTED_TRADE_CURRENCIES).map(curr => (
                          <option key={curr.code} value={curr.code}>
                            {curr.code} ({curr.symbol}) — {curr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Trade Lane (Origin & Destination) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <Label className="text-xs text-slate-300 font-medium">Origin Country & Port</Label>
                      <select
                        value={originCountry}
                        onChange={(e) => {
                          setOriginCountry(e.target.value);
                          if (e.target.value === 'India') setOriginPort('Nhava Sheva (JNPT)');
                          else if (e.target.value === 'China') setOriginPort('Shanghai Port');
                          else if (e.target.value === 'Germany') setOriginPort('Hamburg Port');
                          else if (e.target.value === 'United States') setOriginPort('Los Angeles / Long Beach');
                          else if (e.target.value === 'United Arab Emirates') setOriginPort('Jebel Ali Port');
                          else setOriginPort('Main International Port');
                        }}
                        className="w-full mt-1.5 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-white text-xs font-semibold focus:border-[#FF5A00] focus:outline-none transition-colors"
                      >
                        <option value="India">India (Nhava Sheva JNPT)</option>
                        <option value="China">China (Shanghai / Ningbo)</option>
                        <option value="Germany">Germany (Hamburg)</option>
                        <option value="United States">United States (Los Angeles)</option>
                        <option value="United Arab Emirates">United Arab Emirates (Jebel Ali)</option>
                        <option value="Vietnam">Vietnam (Hai Phong)</option>
                        <option value="Italy">Italy (Genoa)</option>
                      </select>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                        <span className="text-[#FF5A00] font-semibold">Origin Gateway:</span>
                        <span>{originPort}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-slate-300 font-medium">Destination Country & Port</Label>
                      <select
                        value={destCountry}
                        onChange={(e) => {
                          setDestCountry(e.target.value);
                          if (e.target.value === 'United States') setDestPort('New York / New Jersey');
                          else if (e.target.value === 'India') setDestPort('Chennai Port / Mumbai');
                          else if (e.target.value === 'United Arab Emirates') setDestPort('Jebel Ali Port');
                          else if (e.target.value === 'Germany') setDestPort('Rotterdam / Hamburg');
                          else if (e.target.value === 'United Kingdom') setDestPort('Port of Felixstowe');
                          else setDestPort('Major Destination Port');
                        }}
                        className="w-full mt-1.5 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-white text-xs font-semibold focus:border-[#FF5A00] focus:outline-none transition-colors"
                      >
                        <option value="United States">United States (New York / NJ)</option>
                        <option value="India">India (Chennai / Mumbai)</option>
                        <option value="United Arab Emirates">United Arab Emirates (Dubai)</option>
                        <option value="Germany">Germany (Rotterdam / Hamburg)</option>
                        <option value="United Kingdom">United Kingdom (Felixstowe)</option>
                        <option value="Canada">Canada (Vancouver / Montreal)</option>
                        <option value="Australia">Australia (Sydney / Melbourne)</option>
                      </select>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                        <span className="text-sky-400 font-semibold">Destination Port:</span>
                        <span>{destPort}</span>
                      </div>
                    </div>
                  </div>

                  {/* Commodity & HS Code */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-300 font-medium">Commodity Category</Label>
                      <span className="text-[11px] text-amber-400 font-mono font-medium">Auto-Tariff Mapped</span>
                    </div>
                    <select
                      value={selectedCommodityKey}
                      onChange={(e) => setSelectedCommodityKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-white text-xs font-semibold focus:border-[#FF5A00] focus:outline-none transition-colors"
                    >
                      <option value="machinery">Machinery & Material Handling Equipment</option>
                      <option value="steel">Structural Steel Coils & Galvanized Plates</option>
                      <option value="polymers">Polymers & Resin Granules (LLDPE / HDPE)</option>
                      <option value="textiles">Cotton Textiles, Yarns & Garments</option>
                      <option value="solar">Solar PV Cells & Assembled Modules</option>
                      <option value="electrical">Industrial Transformers & Electrical Inverters</option>
                    </select>

                    {/* Telemetry Chips Row: HS Code, Duty %, Tax %, Cess */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">HS Code</span>
                        <span className="font-mono text-amber-400 font-bold text-xs mt-0.5 truncate">{commodity.code}</span>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Basic Duty (BCD)</span>
                        <span className="text-emerald-400 font-bold text-xs mt-0.5">{(commodity.dutyRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Import Tax (IGST)</span>
                        <span className="text-sky-400 font-bold text-xs mt-0.5">{(commodity.igstRate * 100).toFixed(0)}%</span>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">SWS Surcharge</span>
                        <span className="text-purple-400 font-bold text-xs mt-0.5">10% of BCD</span>
                      </div>
                    </div>
                  </div>

                  {/* Commercial Value & Volume */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300 font-medium">Cargo Value</Label>
                        <select
                          value={baseCurrency}
                          onChange={(e) => setBaseCurrency(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-[#FF8A3D] font-bold focus:outline-none"
                        >
                          {Object.keys(SUPPORTED_TRADE_CURRENCIES).map(curr => (
                            <option key={curr} value={curr}>{curr}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={fobValue}
                          onChange={(e) => setFobValue(e.target.value)}
                          className="bg-slate-950 border-slate-700/80 text-white text-xs font-semibold h-9.5 pr-12"
                          placeholder="e.g. 45000"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          {baseCurrency}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        ≈ {formatCurrencyValue(cargoValInTarget, targetCurrency)} ({targetCurrency})
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300 font-medium">Quantity ({unit})</Label>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="bg-slate-950 border-slate-700/80 text-white text-xs font-semibold h-9.5"
                        placeholder="e.g. 10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300 font-medium">Weight (kg)</Label>
                      <Input
                        type="number"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="bg-slate-950 border-slate-700/80 text-white text-xs font-semibold h-9.5"
                        placeholder="e.g. 3500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300 font-medium">Volume (CBM)</Label>
                      <Input
                        type="number"
                        value={volumeCbm}
                        onChange={(e) => setVolumeCbm(e.target.value)}
                        className="bg-slate-950 border-slate-700/80 text-white text-xs font-semibold h-9.5"
                        placeholder="e.g. 12"
                      />
                    </div>
                  </div>

                  {/* Live Conversion Banner */}
                  <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-[#FF5A00]" />
                      <span className="text-slate-400">Live Rate Conversion:</span>
                      <span className="font-mono font-bold text-white">
                        1 {baseCurrency} = {directExchangeRate.toFixed(directExchangeRate > 20 ? 2 : 4)} {targetCurrency}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-400">Reverse:</span>
                      <span className="font-mono text-slate-300">
                        1 {targetCurrency} = {directReverseRate.toFixed(directReverseRate > 20 ? 2 : 4)} {baseCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Shipping Mode & Incoterm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    <div>
                      <Label className="text-xs text-slate-300 mb-1.5 block font-medium">Freight Mode</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShippingMode('sea_fcl')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            shippingMode === 'sea_fcl'
                              ? 'bg-[#FF5A00] border-[#FF5A00] text-white font-bold shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <Ship className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-[11px] block">Ocean FCL</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShippingMode('sea_lcl')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            shippingMode === 'sea_lcl'
                              ? 'bg-[#FF5A00] border-[#FF5A00] text-white font-bold shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <Layers className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-[11px] block">Ocean LCL</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShippingMode('air')}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            shippingMode === 'air'
                              ? 'bg-[#FF5A00] border-[#FF5A00] text-white font-bold shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <Plane className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-[11px] block">Air Freight</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-slate-300 mb-1.5 block font-medium">Declared Incoterm</Label>
                      <select
                        value={incoterm}
                        onChange={(e) => setIncoterm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-white text-xs font-semibold focus:border-[#FF5A00] focus:outline-none transition-colors"
                      >
                        <option value="FOB">FOB — Free On Board (Buyer arranges freight & duties)</option>
                        <option value="CIF">CIF — Cost, Insurance & Freight (Seller covers ocean freight)</option>
                        <option value="EXW">EXW — Ex-Works (Pickup directly at factory gate)</option>
                        <option value="DDP">DDP — Delivered Duty Paid (Seller pays all import duties)</option>
                        <option value="DAP">DAP — Delivered At Place (Buyer clears destination duties)</option>
                      </select>
                      <span className="text-[10px] text-slate-400 mt-1 block">Incoterm defines logistics cost and risk allocation.</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Itemized Landed Cost Breakdown Card (5 cols) */}
                <div className="lg:col-span-5 rounded-2xl bg-[#090E1A] border border-slate-800 p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Itemized Cost Breakdown</span>
                    </h3>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                        In {targetCurrency}
                      </Badge>
                    </div>
                  </div>

                  {/* Quick Target Currency Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium mr-1">Switch Currency:</span>
                    {['INR', 'USD', 'AED', 'EUR', 'GBP', 'CNY', 'SGD'].map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setTargetCurrency(curr)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                          targetCurrency === curr
                            ? 'bg-[#FF5A00] border-[#FF5A00] text-white shadow'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>

                  {/* Dual-Currency Itemized Table */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">1. Commercial Cargo Value:</span>
                      <div className="text-right">
                        <span className="font-semibold text-white">{formatCurrencyValue(cargoValInTarget, targetCurrency)}</span>
                        {baseCurrency !== targetCurrency && (
                          <span className="text-[10px] text-slate-400 block">({formatCurrencyValue(rawCargoVal, baseCurrency)})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">2. Est. Freight ({shippingMode.toUpperCase()}):</span>
                      <div className="text-right">
                        <span className="font-semibold text-sky-400">+{formatCurrencyValue(freightInTarget, targetCurrency)}</span>
                        {targetCurrency !== 'USD' && (
                          <span className="text-[10px] text-slate-400 block">(+${estimatedFreightInUsd.toLocaleString()} USD)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">3. Marine Cargo Insurance (0.35%):</span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-300">+{formatCurrencyValue(insuranceInTarget, targetCurrency)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between py-1.5 bg-slate-900/80 px-2 rounded-lg border border-slate-800">
                      <span className="text-slate-300 font-medium">CIF Assessable Value:</span>
                      <div className="text-right">
                        <span className="font-bold text-white">{formatCurrencyValue(cargoValInTarget + freightInTarget + insuranceInTarget, targetCurrency)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">4. Basic Customs Duty ({(commodity.dutyRate * 100).toFixed(1)}%):</span>
                      <div className="text-right">
                        <span className="font-semibold text-amber-400">+{formatCurrencyValue(bcdInTarget, targetCurrency)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">5. Social Welfare Surcharge (10% BCD):</span>
                      <div className="text-right">
                        <span className="font-semibold text-amber-400">+{formatCurrencyValue(swsInTarget, targetCurrency)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">6. Import Tax / IGST ({(commodity.igstRate * 100).toFixed(0)}%):</span>
                      <div className="text-right">
                        <span className="font-semibold text-amber-400">+{formatCurrencyValue(vatInTarget, targetCurrency)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">7. Terminal Handling & Port Dues:</span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-300">+{formatCurrencyValue(portInTarget, targetCurrency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Landed Cost Highlight */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                        Total Estimated Landed Cost
                      </div>
                      <Badge variant="outline" className="border-[#FF5A00]/40 text-[#FF8A3D] text-[10px] font-bold">
                        Live Rate Applied
                      </Badge>
                    </div>

                    <div className="text-2xl sm:text-3xl font-extrabold text-[#FF5A00]">
                      {formatCurrencyValue(totalLandedInTarget, targetCurrency)}
                    </div>

                    {baseCurrency !== targetCurrency && (
                      <div className="text-xs text-slate-400 font-medium">
                        Equivalent: <span className="text-slate-200 font-bold">{formatCurrencyValue(totalLandedInBase, baseCurrency)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-1.5 border-t border-slate-800/80">
                      <span>Per Unit Landed ({unitsCount} {unit}):</span>
                      <span className="font-bold text-white">
                        {formatCurrencyValue(unitLandedInTarget, targetCurrency)} / {unit}
                      </span>
                    </div>
                  </div>

                  {/* Commercial Forex Spread Buffer Indicator */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowSpreadInfo(!showSpreadInfo)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
                      >
                        <Info className="w-3.5 h-3.5 text-[#FF5A00]" />
                        <span>Commercial Bank Spread (+1.0%):</span>
                      </button>
                      <span className="font-mono text-xs font-bold text-slate-300">
                        +{formatCurrencyValue(commercialSpreadAmount, targetCurrency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/50">
                      <span className="text-slate-400">Total with Bank Remittance Buffer:</span>
                      <span className="font-bold text-emerald-400">
                        {formatCurrencyValue(totalWithCommercialSpread, targetCurrency)}
                      </span>
                    </div>
                    {showSpreadInfo && (
                      <p className="text-[10px] text-slate-400 leading-normal pt-1 border-t border-slate-800/60">
                        Commercial international wire transfers typically incur a 0.5%–1.5% forex spread above the interbank mid-market spot rate. We include this advisory buffer to ensure your treasury budgeting reflects actual bank clearance rates.
                      </p>
                    )}
                  </div>

                  {/* Certified Partner Disclaimer */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Estimate only: </span>
                      These figures come from fixed assumptions (a flat freight rate and standard duty and tax rates). Final tariff determination, customs clearance and the Bill of Entry are done by a licensed customs broker, so confirm the real figures with one before you commit.
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setActiveTab('coordination');
                        setCoordCargoDesc(`${quantity} ${unit} ${commodity.name}`);
                      }}
                      className="bg-gradient-to-r from-[#FF5A00] to-[#FF7700] hover:brightness-110 text-white font-bold text-xs h-10 rounded-xl"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1" />
                      <span>Book Shipping</span>
                    </Button>
                    <Button
                      onClick={() => {
                        navigator.clipboard
                          .writeText(`Bulkskart Landed Cost Estimate for ${commodity.name}: Total Landed ${formatCurrencyValue(totalLandedInTarget, targetCurrency)} (${formatCurrencyValue(unitLandedInTarget, targetCurrency)}/unit) [Rate: 1 ${baseCurrency} = ${directExchangeRate} ${targetCurrency}]`)
                          .then(() => toast.success('Landed cost estimate copied to your clipboard.'))
                          .catch(() => toast.error('Your browser did not allow copying. Please copy the figures manually.'));
                      }}
                      variant="secondary"
                      className="border border-slate-700 bg-slate-800 hover:bg-slate-700 font-bold text-xs h-10 rounded-xl"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>Copy Report</span>
                    </Button>
                  </div>
                </div>

              </div>
            </TabsContent>

            {/* ═════════════════════════════════════════════════════════
                TAB 2: AI SOURCING & SUPPLIER MATCHING
            ═════════════════════════════════════════════════════════ */}
            <TabsContent value="sourcing" className="space-y-6">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Box className="w-5 h-5 text-[#FF5A00]" />
                      <span>Find Suppliers in the BulkSkart Directory</span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Search the products suppliers have listed on BulkSkart. You get the suppliers whose listings match the words you type.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/post-requirement')}
                    className="bg-[#FF5A00] hover:bg-[#e04e00] text-white text-xs font-bold shrink-0"
                  >
                    <span>Post Public RFQ</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>

                {/* Sourcing Input Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <Label className="text-xs text-slate-300">Product / Technical Specification Description</Label>
                    <Input
                      value={sourcingQuery}
                      onChange={(e) => setSourcingQuery(e.target.value)}
                      placeholder="e.g. electric forklift, CNC milling machine, galvanized steel coil"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleFindSuppliers(); }}
                      className="mt-1 bg-slate-950 border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="text-xs text-slate-300">Category</Label>
                    <select
                      value={sourcingCategoryId}
                      onChange={(e) => setSourcingCategoryId(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-[#FF5A00]"
                    >
                      <option value="">All categories</option>
                      {sourcingCategories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3 flex items-end">
                    <Button
                      onClick={handleFindSuppliers}
                      disabled={sourcingLoading}
                      className="w-full bg-gradient-to-r from-[#FF5A00] to-[#FF7700] hover:brightness-110 text-white font-bold text-xs h-9.5 rounded-xl"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      <span>{sourcingLoading ? 'Searching…' : 'Find Suppliers'}</span>
                    </Button>
                  </div>
                </div>

                {/* Matching suppliers (real listings only) */}
                {sourcingSearched && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {sourcingResults.length > 0
                        ? `Suppliers with matching listings (${sourcingResults.length})`
                        : 'No matching listings yet'}
                    </h3>

                    {sourcingResults.length === 0 ? (
                      <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 text-xs text-slate-300 space-y-3">
                        <p>No supplier has listed a product that matches this search. Post an RFQ and suppliers can respond to you directly.</p>
                        <Button
                          onClick={() => navigate('/post-requirement')}
                          size="sm"
                          className="bg-[#FF5A00] hover:bg-[#e04e00] text-white text-xs font-bold h-8"
                        >
                          <span>Post Public RFQ</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {sourcingResults.map((sup) => (
                          <div
                            key={sup.companyId}
                            className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3 hover:border-[#FF5A00]/60 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#FF5A00]/20 text-[#FF5A00] flex items-center justify-center font-bold text-xs shrink-0">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                {sup.verified && (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                                    Verified on BulkSkart
                                  </Badge>
                                )}
                              </div>

                              <h4 className="text-sm font-bold text-white mt-2 leading-snug">
                                {sup.name}
                              </h4>
                              {sup.location && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                  📍 {sup.location}
                                </p>
                              )}

                              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                {sup.products.slice(0, 2).map((product) => (
                                  <li key={product.slug} className="truncate">
                                    {product.name} <span className="text-slate-500">• MOQ {product.moq.toLocaleString()} {product.moqUnit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="pt-2 border-t border-slate-800 flex gap-2">
                              <Button
                                onClick={() => navigate(sup.slug ? `/manufacturers/${sup.slug}` : '/manufacturers')}
                                size="sm"
                                className="flex-1 bg-[#FF5A00] hover:bg-[#e04e00] text-white text-xs font-bold h-8"
                              >
                                <span>View Supplier</span>
                              </Button>
                              <Button
                                onClick={() => navigate('/post-requirement')}
                                size="sm"
                                variant="secondary"
                                className="border border-slate-700 text-xs h-8"
                              >
                                <span>Post RFQ</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═════════════════════════════════════════════════════════
                TAB 3: TRADE DOCUMENTATION & COMPLIANCE GUIDE
            ═════════════════════════════════════════════════════════ */}
            <TabsContent value="documents" className="space-y-6">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-5">
                <div className="pb-3 border-b border-slate-800">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-[#FF5A00]" />
                    <span>International Trade Documentation Checklist</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Customs clearance compliance requirements for trade between <span className="text-[#FF5A00] font-bold">{originCountry}</span> and <span className="text-sky-400 font-bold">{destCountry}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {CORRIDOR_DOCUMENTS.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <h4 className="text-xs sm:text-sm font-bold text-white">{doc.name}</h4>
                        </div>
                        <Badge
                          variant="outline"
                          className={doc.mandatory ? 'border-amber-500/40 text-amber-400 text-[10px]' : 'border-slate-700 text-slate-400 text-[10px]'}
                        >
                          {doc.mandatory ? 'Mandatory' : 'Conditional'}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {doc.purpose}
                      </p>

                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between">
                        <span>Authority: <strong className="text-slate-300">{doc.authority}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Country-Specific Notice */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">Destination Regulatory Requirement: </span>
                    Shipments entering {destCountry} must comply with local product safety certifications (e.g. BIS CRS for India, CE mark for EU, FDA prior notice for USA). Check the current rules with the destination customs authority or a licensed customs broker.
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ═════════════════════════════════════════════════════════
                TAB 4: SHIPMENT COORDINATION REQUEST FORM
            ═════════════════════════════════════════════════════════ */}
            <TabsContent value="coordination" className="space-y-6">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-5">
                <div className="pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-[#FF5A00]" />
                      <span>Formal Shipment Coordination Request</span>
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Describe your shipment and send it to the BulkSkart team. Container bookings, freight and port clearance are carried out by shipping lines and licensed customs brokers.
                  </p>
                </div>

                {coordSubmitted ? (
                  <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Your request is ready to send</h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      This form is not saved on BulkSkart. Send it to the BulkSkart team on WhatsApp or by email and they will take it from there.
                    </p>
                    <pre className="text-left text-[11px] text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3 whitespace-pre-wrap break-words max-w-md mx-auto">{coordMessage}</pre>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                      <a
                        href={`${WHATSAPP_CHAT_URL}?text=${encodeURIComponent(coordMessage)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold text-xs h-9 px-4"
                      >
                        Send on WhatsApp
                      </a>
                      <a
                        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Shipment coordination request')}&body=${encodeURIComponent(coordMessage)}`}
                        className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-9 px-4"
                      >
                        Send by email
                      </a>
                      <Button
                        onClick={() => setCoordSubmitted(false)}
                        variant="secondary"
                        className="border border-slate-700 text-xs"
                      >
                        Edit request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitCoordination} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <Label className="text-xs text-slate-300">Pickup Origin Address / Factory Location</Label>
                        <Input
                          value={coordOrigin}
                          onChange={(e) => setCoordOrigin(e.target.value)}
                          placeholder="e.g. Pune Industrial Area, Maharashtra, India"
                          className="mt-1 bg-slate-950 border-slate-700 text-white text-xs"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-300">Destination Delivery Address / Port</Label>
                        <Input
                          value={coordDest}
                          onChange={(e) => setCoordDest(e.target.value)}
                          placeholder="e.g. Port of Los Angeles, California, USA"
                          className="mt-1 bg-slate-950 border-slate-700 text-white text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <Label className="text-xs text-slate-300">Cargo Description</Label>
                        <Input
                          value={coordCargoDesc}
                          onChange={(e) => setCoordCargoDesc(e.target.value)}
                          placeholder="e.g. 10 Units Heavy Forklifts"
                          className="mt-1 bg-slate-950 border-slate-700 text-white text-xs"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-300">Container / Shipment Type</Label>
                        <select
                          value={coordContainerType}
                          onChange={(e) => setCoordContainerType(e.target.value)}
                          className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-[#FF5A00]"
                        >
                          <option value="20ft Standard Container">20ft Standard Ocean Container (FCL)</option>
                          <option value="40ft High Cube Container">40ft High Cube Ocean Container (FCL)</option>
                          <option value="Less than Container Load (LCL)">Less than Container Load (LCL Groupage)</option>
                          <option value="Express Air Freight">Express Air Freight Cargo</option>
                          <option value="Break Bulk / Oversized">Break Bulk / Heavy Lift Project Cargo</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-300">Cargo Ready Date</Label>
                        <Input
                          type="date"
                          value={coordReadyDate}
                          onChange={(e) => setCoordReadyDate(e.target.value)}
                          className="mt-1 bg-slate-950 border-slate-700 text-white text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-slate-300">Specific Logistics Requirements & Notes</Label>
                      <textarea
                        value={coordNotes}
                        onChange={(e) => setCoordNotes(e.target.value)}
                        rows={3}
                        placeholder="Detail any special handling, fumigation, insurance requirements, or port pickup requests..."
                        className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs focus:border-[#FF5A00] focus:outline-none"
                      />
                    </div>

                    {/* Certified External Partner Box */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white">Who carries the cargo: </span>
                        Shipping lines and licensed customs brokers handle the physical freight carriage, customs clearance and terminal delivery under their own contracts. BulkSkart does not carry cargo itself.
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-[#FF5A00] to-[#FF7700] hover:brightness-110 text-white font-bold text-xs px-6 py-5 rounded-xl shadow-lg shadow-orange-950/40"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        <span>Prepare my request</span>
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </TabsContent>

          </Tabs>

        </div>
      </div>
    </MainLayout>
  );
}
