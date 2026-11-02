import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  UserPlus, FileText, MessageSquare, Package, ArrowRight,
  Shield, Globe, TrendingUp, CheckCircle, Zap,
} from 'lucide-react';
import PageMeta from '@/components/common/PageMeta';
import FaqAccordion from '@/components/common/FaqAccordion';

const HERO_IMG = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=75';

const buyerSteps = [
  { n: 1, icon: UserPlus, title: 'Register for Free', desc: 'Create your buyer account with your business details in minutes. No subscription needed.' },
  { n: 2, icon: FileText, title: 'Post a Bulk Requirement', desc: 'Specify product, quantity, destination, timeline and specifications. Get posted in 2 minutes.' },
  { n: 3, icon: Package, title: 'Receive Multiple Quotes', desc: 'Verified manufacturers will send you competitive quotes directly to your dashboard.' },
  { n: 4, icon: TrendingUp, title: 'Compare & Choose', desc: 'Compare quotes side-by-side on price, MOQ, delivery time and supplier rating.' },
  { n: 5, icon: MessageSquare, title: 'Negotiate Directly', desc: 'Chat with suppliers to negotiate terms, request samples, and clarify specifications.' },
  { n: 6, icon: CheckCircle, title: 'Confirm Your Order', desc: 'Accept the best quote and place your bulk order. Delivery is free on every order, and the loan calculator can show the monthly cost before you buy.' },
];

const supplierSteps = [
  { n: 1, icon: UserPlus, title: 'Register Your Business', desc: 'Create your supplier account with company details, GST, IEC, and upload your business documents.' },
  { n: 2, icon: Shield, title: 'Get Verified', desc: 'Our team reviews your submitted documents and grants you the Verified Business badge.' },
  { n: 3, icon: Package, title: 'Subscribe & List Products', desc: 'Choose a subscription plan and list your products with MOQ, pricing, and specifications.' },
  { n: 4, icon: Zap, title: 'Receive Matching RFQs', desc: 'Get instant notifications when buyers post requirements matching your product categories.' },
  { n: 5, icon: FileText, title: 'Submit Quotations', desc: 'View full RFQ details and send competitive quotations with your pricing and delivery terms.' },
  { n: 6, icon: Globe, title: 'Win Global Orders', desc: 'Connect with buyers globally, build long-term relationships, and grow your export business.' },
];

const faqs = [
  { q: 'Is registration free for buyers?', a: 'Yes, buyer registration is completely free. You can post requirements and receive quotes at no cost.' },
  { q: 'Is delivery free?', a: 'Yes. Every order placed on BulkSkart includes free delivery. No delivery fee is added at checkout, for any order value or category.' },
  { q: 'Can I calculate a monthly installment for an order?', a: 'Yes. The order loan calculator on the homepage and at /loan-calculator estimates a monthly installment from the order value, down payment, rate, and tenure. It is a planning estimate, not a loan approval. Delivery on the order stays free.' },
  { q: 'How are manufacturers verified?', a: 'Suppliers submit GST certificates, IEC (Import Export Code), and company registration documents. Our team reviews and approves each application.' },
  { q: 'How many quotes will I receive?', a: 'Typically, buyers receive 5–20 quotes within 48–72 hours of posting their requirement, depending on the product category.' },
  { q: 'Can I export to any country?', a: 'Yes. BulkSkart connects you with manufacturers who export internationally. Specify your destination country when posting a requirement.' },
  { q: 'What is an IEC number?', a: 'IEC (Importer Exporter Code) is a 10-digit number issued by DGFT, India, mandatory for businesses doing import/export. Non-Indian businesses should upload equivalent documentation.' },
  { q: 'How do subscription plans work for suppliers?', a: 'Suppliers choose a plan that determines how many products they can list, how many RFQ leads they can access per month, and their visibility in search results.' },
];

export default function HowItWorksPage() {
  return (
    <MainLayout>
      <PageMeta
        title="How BulkSkart Works — B2B Bulk Trade Made Simple"
        description="Step-by-step guide for buyers and suppliers. Post requirements, receive quotes, compare offers and place bulk orders through BulkSkart's verified trade platform."
        keywords="how B2B works, bulk trade guide, post requirement, get quotes, BulkSkart"
        canonical="/how-it-works"
        ogType="website"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'How It Works', item: '/how-it-works' },
        ]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Source Bulk Goods on BulkSkart',
          description: 'A 4-step guide to finding verified manufacturers, receiving competitive wholesale quotations, and trading securely on BulkSkart.',
          step: [
            {
              '@type': 'HowToStep',
              name: 'Post a Bulk Requirement (RFQ)',
              text: 'Submit specifications, target volume, and delivery destination to notify matching factories instantly.',
            },
            {
              '@type': 'HowToStep',
              name: 'Receive & Compare Quotations',
              text: 'Verified suppliers review requirements and send detailed price slabs and incoterms within 24 hours.',
            },
            {
              '@type': 'HowToStep',
              name: 'Negotiate in Real-Time',
              text: 'Chat securely with factory managers, request material samples, and finalize custom terms.',
            },
            {
              '@type': 'HowToStep',
              name: 'Execute Secure Trade',
              text: 'Complete orders backed by trade verification, quality inspections, and milestone tracking.',
            },
          ],
        }}
      />
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={HERO_IMG} alt="BulkSkart B2B Trade Process Illustration" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            How <span className="gradient-text">BulkSkart</span> Works
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8 text-pretty">
            Your step-by-step guide to sourcing and supplying bulk products through the world's most trusted B2B trade platform.
          </p>
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <Link to="/auth"><Button className="bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold gap-2 shadow-[0_2px_0_#922f00] rounded-xl h-11 px-6">Register as Buyer <ArrowRight className="w-4 h-4" /></Button></Link>
            <Link to="/auth?tab=supplier"><Button className="bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold gap-2 shadow-[0_2px_0_#922f00] rounded-xl h-11 px-6">Register as Supplier <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
        </div>
      </section>

      {/* Buyer steps */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">For Buyers — Post Requirements, Get Quotes Free</h2>
              <p className="text-sm text-muted-foreground">No subscription needed. Source bulk products from verified manufacturers.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {buyerSteps.map(step => {
              const Icon = step.icon;
              return (
                <div key={step.n} className="bg-card border border-border rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-5xl font-black text-muted/30 leading-none">{step.n}</div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground text-pretty">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link to="/post-requirement">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">Post a Bulk Requirement <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Supplier steps */}
      <section className="py-16 bg-muted">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">For Suppliers — Get Verified & Win Bulk Orders</h2>
              <p className="text-sm text-muted-foreground">Subscription-based platform to showcase your manufacturing capabilities globally.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {supplierSteps.map(step => {
              const Icon = step.icon;
              return (
                <div key={step.n} className="bg-card border border-border rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-5xl font-black text-muted/30 leading-none">{step.n}</div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground text-pretty">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link to="/auth?tab=supplier">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">Join as Supplier <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">Frequently Asked Questions</h2>
          <FaqAccordion faqs={faqs} />
        </div>
      </section>
    </MainLayout>
  );
}
