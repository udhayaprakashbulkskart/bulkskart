import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, Calculator, FileCheck2, Truck, ArrowRight,
  ShieldCheck, Globe2, ChevronRight, CheckCircle2, AlertTriangle,
  Building2, Box, Ship, Plane, HelpCircle, Layers, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLiveExchangeRates,
  convertCrossCurrency,
  formatCurrencyValue,
  DEFAULT_FALLBACK_RATES,
} from '@/services/realtimeExchangeRate';

export default function ImportExportAssistanceSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Quick preview calculator state
  const [origin, setOrigin] = useState('India');
  const [destination, setDestination] = useState('USA');
  const [category, setCategory] = useState('Machinery');
  const [estValue, setEstValue] = useState('25000');
  const [currency, setCurrency] = useState('USD');
  const [freightType, setFreightType] = useState<'sea' | 'air'>('sea');
  const [liveRates, setLiveRates] = useState<Record<string, number>>(DEFAULT_FALLBACK_RATES);

  useEffect(() => {
    async function loadQuickRates() {
      try {
        const res = await getLiveExchangeRates('USD', false);
        if (res.rates) {
          setLiveRates(res.rates);
        }
      } catch {}
    }
    loadQuickRates();
  }, []);

  // Quick live estimate calculation
  const rawVal = parseFloat(estValue) || 10000;
  // Convert from selected currency to USD for base computation
  const { convertedAmount: valInUsd } = convertCrossCurrency(rawVal, currency, 'USD', liveRates);
  const val = valInUsd;

  const dutyRate = category === 'Machinery' ? 0.075 : category === 'Steel' ? 0.125 : category === 'Chemicals' ? 0.085 : 0.06;
  const freightRate = freightType === 'sea' ? 0.08 : 0.22;
  const estDutyInUsd = Math.round(val * dutyRate);
  const estFreightInUsd = Math.round(val * freightRate);
  const estLandedInUsd = Math.round(val + estDutyInUsd + estFreightInUsd + (val * 0.015));

  // Convert all items back to user's selected display currency
  const { convertedAmount: estLandedInSelected } = convertCrossCurrency(estLandedInUsd, 'USD', currency, liveRates);
  const { convertedAmount: estDutyInSelected } = convertCrossCurrency(estDutyInUsd, 'USD', currency, liveRates);
  const { convertedAmount: estFreightInSelected } = convertCrossCurrency(estFreightInUsd, 'USD', currency, liveRates);

  const features = [
    {
      icon: Calculator,
      title: 'Landed Cost & Duty Estimator',
      desc: 'Instant tariff, HS code guidance, port handling & landed cost breakdown.',
    },
    {
      icon: Box,
      title: 'Supplier Search',
      desc: 'Find the suppliers whose listed products match what you need to source.',
    },
    {
      icon: FileCheck2,
      title: 'Trade Compliance & Documents',
      desc: 'Tailored checklists for COO, Bill of Lading, CE, BIS, and export filings.',
    },
    {
      icon: Truck,
      title: 'Shipment Request',
      desc: 'Send your shipment details to the BulkSkart team. Shipping lines and licensed customs brokers carry out the freight.',
    },
  ];

  return (
    <section className="relative z-20 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 my-8 sm:my-14">
      {/* Container with Dark Navy Card & Glowing Orange/Blue Accents */}
      <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-r from-[#FF5A00]/80 via-orange-500/40 to-[#FF5A00]/30 shadow-[0_0_50px_rgba(255,90,0,0.18)]">
        <div className="relative rounded-[22.5px] bg-[#070B13] p-5 sm:p-8 md:p-10 text-white overflow-hidden border border-white/5">
          {/* Subtle background ambient lights */}
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#FF5A00]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[#FF5A00]/10 blur-3xl pointer-events-none" />

          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 sm:pb-8 border-b border-slate-800/80">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5A00]/15 border border-[#FF5A00]/30 text-[#FF8A3D] text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 fill-[#FF5A00]" />
                <span>Optional Extra Feature</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                AI Import & Export <span className="text-[#FF5A00]">Assistance</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
                Supplier search, landed cost estimates, compliance checklists and a shipment request form for buyers and manufacturers.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Button
                onClick={() => navigate('/trade-assistant')}
                className="bg-gradient-to-r from-[#FF5A00] to-[#FF7700] hover:brightness-110 text-white font-bold text-sm px-6 py-5 rounded-xl shadow-lg shadow-orange-950/40 flex items-center gap-2"
              >
                <span>Launch Trade Assistant</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Button>
            </div>
          </div>

          {/* Live Real-Time Forex Rate Ticker Strip */}
          <div className="mb-6 p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold uppercase tracking-wider text-white text-[11px] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live FX Market Rates:</span>
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none text-[11px]">
              {[
                { label: 'USD/INR', val: (liveRates.INR || 83.54).toFixed(2) },
                { label: 'EUR/USD', val: (1 / (liveRates.EUR || 0.92)).toFixed(3) },
                { label: 'USD/AED', val: (liveRates.AED || 3.67).toFixed(2) },
                { label: 'GBP/USD', val: (1 / (liveRates.GBP || 0.79)).toFixed(3) },
                { label: 'USD/CNY', val: (liveRates.CNY || 7.24).toFixed(2) },
              ].map((fx, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <span className="text-slate-400 font-medium">{fx.label}:</span>
                  <span className="font-mono font-bold text-emerald-400">{fx.val}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate('/trade-assistant?tab=calculator')}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-[#FF8A3D] hover:text-white hover:bg-[#FF5A00]/20 font-semibold"
            >
              <span>Full Currency Matrix →</span>
            </Button>
          </div>

          {/* Grid: 4 Core Features on Left & Live Estimator Card on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 pt-6 sm:pt-8 items-stretch">
            {/* Left Column: 4 Feature Pillars (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {features.map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => navigate('/trade-assistant')}
                      className="group p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-[#FF5A00]/60 transition-all cursor-pointer hover:bg-slate-900 shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#FF5A00]/15 text-[#FF5A00] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#FF5A00] transition-colors">
                        {feat.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Partner Demarcation Badge */}
              <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-3 sm:p-3.5 flex items-start gap-3 text-xs text-slate-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Certified External Partner Network: </span>
                  Physical container booking, Bill of Lading clearance, and customs brokerage are executed via licensed logistics partners (e.g. DHL Global Forwarding, Maersk Logistics, CMA CGM, and certified customs agents).
                </div>
              </div>
            </div>

            {/* Right Column: Live Quick Duty & Landed Cost Estimator Card (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-[#0B101D] border border-slate-800 p-4 sm:p-5 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[#FF5A00]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Quick Landed Cost Calculator
                    </span>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold">
                    Live Demo
                  </Badge>
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-2 gap-2.5 pt-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Origin Port</label>
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-[#FF5A00]"
                    >
                      <option value="India">India (Nhava Sheva)</option>
                      <option value="China">China (Shanghai / Ningbo)</option>
                      <option value="Germany">Germany (Hamburg)</option>
                      <option value="USA">USA (Los Angeles)</option>
                      <option value="UAE">UAE (Jebel Ali)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Destination Port</label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-[#FF5A00]"
                    >
                      <option value="USA">USA (New York / NJ)</option>
                      <option value="India">India (Chennai / Mumbai)</option>
                      <option value="UAE">UAE (Dubai / Jebel Ali)</option>
                      <option value="Germany">Germany (Hamburg)</option>
                      <option value="UK">UK (Felixstowe)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Commodity Type</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-[#FF5A00]"
                    >
                      <option value="Machinery">Industrial Machinery</option>
                      <option value="Steel">Structural Steel & Coils</option>
                      <option value="Chemicals">Polymers & Chemicals</option>
                      <option value="Textiles">Textiles & Apparel</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-slate-400">Cargo Value</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-1 text-[10px] text-[#FF8A3D] font-bold focus:outline-none"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="AED">AED</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CNY">CNY (¥)</option>
                      </select>
                    </div>
                    <input
                      type="number"
                      value={estValue}
                      onChange={(e) => setEstValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-[#FF5A00]"
                      placeholder="e.g. 25000"
                    />
                  </div>
                </div>

                {/* Freight Toggle */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Mode:</span>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFreightType('sea')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        freightType === 'sea'
                          ? 'bg-[#FF5A00] text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Ship className="w-3 h-3" />
                      <span>Ocean FCL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFreightType('air')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        freightType === 'air'
                          ? 'bg-[#FF5A00] text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Plane className="w-3 h-3" />
                      <span>Air Cargo</span>
                    </button>
                  </div>
                </div>

                {/* Calculation Output Box */}
                <div className="mt-3.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span>FOB Commercial Value:</span>
                    <span className="font-semibold text-white">{formatCurrencyValue(rawVal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span>Est. Customs Tariff & BCD:</span>
                    <span className="font-semibold text-amber-400">+{formatCurrencyValue(estDutyInSelected, currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span>Est. International Freight:</span>
                    <span className="font-semibold text-sky-400">+{formatCurrencyValue(estFreightInSelected, currency)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                    <span className="text-white">Est. Total Landed Cost:</span>
                    <span className="text-base font-extrabold text-[#FF5A00]">
                      {formatCurrencyValue(estLandedInSelected, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <Button
                  onClick={() => navigate('/trade-assistant?tab=calculator')}
                  className="w-full bg-[#FF5A00]/20 hover:bg-[#FF5A00] text-[#FF8A3D] hover:text-white border border-[#FF5A00]/40 font-bold text-xs h-9 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Open Full Calculation & Documentation Guide</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
