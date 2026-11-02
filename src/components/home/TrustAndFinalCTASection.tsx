import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, CheckCircle2, Lock, Award,
  Truck, ArrowRight, FileText, ShoppingBag, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionHeader from '@/components/home/SectionHeader';

export default function TrustAndFinalCTASection() {
  const trustPoints = [
    {
      title: '100% Escrow Protection',
      desc: 'Buyer payments are held securely in escrow until goods pass physical quality inspection and receipt is confirmed.',
      icon: ShieldCheck
    },
    {
      title: 'GST & Factory Audited',
      desc: 'All listed manufacturers undergo verification of GSTIN, IEC credentials, factory premises, and machinery capacity.',
      icon: CheckCircle2
    },
    {
      title: 'Quotation Transparency',
      desc: 'Itemized commercial bids with full visibility into basic unit cost, applicable GST/VAT, and freight terms.',
      icon: Award
    },
    {
      title: 'Multimodal Cargo Freight',
      desc: 'Integrated logistics partners covering full container load (FCL), less than container load (LCL), and road freight.',
      icon: Truck
    }
  ];

  return (
    <section className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12 space-y-8 sm:space-y-10">
      
      {/* 4 Trust Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {trustPoints.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 backdrop-blur-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-[#FF5A1F] flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Final Cinematic Call to Action Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-[#FF5A1F]/40 p-8 sm:p-12 overflow-hidden shadow-2xl text-center space-y-6">
        
        {/* Glow circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF5A1F]/15 blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <SectionHeader
            tone="dark"
            align="center"
            eyebrow="Global B2B Wholesale"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            title="Start Your Bulk Trading Journey Today"
            subtitle="Join verified manufacturers and enterprise buyers securing high-volume orders with escrow protection."
          />
        </div>

        <div className="relative z-10 flex items-center justify-center gap-3.5 pt-2 flex-wrap">
          <Button
            asChild
            className="h-12 px-7 rounded-xl bg-[#FF5A1F] hover:bg-[#e04f1a] text-white font-bold text-sm shadow-xl shadow-orange-950/50 transition-transform active:scale-95"
          >
            <Link to="/post-requirement" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Post Your Requirement
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className="h-12 px-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-sm shadow-md transition-transform active:scale-95"
          >
            <Link to="/products" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#FF5A1F]" />
              Explore Marketplace
            </Link>
          </Button>
        </div>

      </div>

    </section>
  );
}
