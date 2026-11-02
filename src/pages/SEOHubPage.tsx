import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import PageMeta from '@/components/common/PageMeta';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2, MapPin, Shield, Star, CheckCircle, ArrowRight,
  Search, Package, FileText, ChevronRight, Phone, MessageSquare,
  Globe, Factory, Truck, Sparkles, Filter
} from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import { getCompanies, getProducts } from '@/lib/api';
import type { Company, Product } from '@/types/types';

export interface SEOHubConfig {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  tagline: string;
  canonical: string;
  region?: string;
  city?: string;
  type: 'manufacturers' | 'suppliers' | 'products' | 'marketplace';
  introTitle: string;
  introText: string;
  keyIndustries: string[];
  clusters: { title: string; desc: string }[];
  faqs: { question: string; answer: string }[];
  relatedLinks: { label: string; url: string }[];
}

export const SEO_HUBS: Record<string, SEOHubConfig> = {
  'b2b-marketplace': {
    slug: 'b2b-marketplace',
    title: 'India’s Leading B2B Marketplace | Wholesale Trade & Manufacturing | Bulkskart',
    metaDescription: 'Discover verified manufacturers and wholesale distributors across India. Source raw materials, industrial machinery, textiles, electronics, and bulk goods with Trade Assurance.',
    h1: 'India’s Leading B2B Wholesale Marketplace',
    tagline: 'Connect directly with verified industrial manufacturers, wholesale distributors, and export houses across India.',
    canonical: 'https://www.bulkskart.com/b2b-marketplace',
    type: 'marketplace',
    introTitle: 'Comprehensive B2B Sourcing Across 30+ Industrial Sectors',
    introText: 'Bulkskart’s B2B marketplace simplifies wholesale procurement for retail chains, tier-1 suppliers, government contractors, and international import houses. By bypassing intermediary broker markups, buyers negotiate directly with verified factory owners, compare audited factory quotations, and secure wholesale bulk orders with Trade Assurance escrow protection.',
    keyIndustries: ['Machinery & Industrial', 'Textiles & Garments', 'Electrical & Electronics', 'Agriculture & Food Processing', 'Packaging Materials', 'Chemicals & Minerals'],
    clusters: [
      { title: 'Factory Direct Sourcing', desc: 'Direct access to manufacturing plants across Gujarat, Tamil Nadu, Maharashtra, Punjab, and Haryana.' },
      { title: 'RFQ Quotation Comparison', desc: 'Post custom product specifications and receive up to 10 audited quotes from qualified producers within 24 hours.' },
      { title: 'Low MOQ & Flexible Terms', desc: 'Explore tier-based wholesale pricing, flexible MOQ trial batches, and formal LC/bank payment terms.' },
      { title: 'Escrow & Trade Protection', desc: 'Milestone-based release guarantees that goods meet technical specifications prior to final balance dispatch.' },
    ],
    faqs: [
      { question: 'What is Bulkskart’s B2B wholesale marketplace?', answer: 'Bulkskart is a verified digital B2B marketplace connecting corporate bulk buyers directly with Indian manufacturers, factory export houses, and wholesale distributors.' },
      { question: 'How can buyers find wholesale suppliers on Bulkskart?', answer: 'Buyers can search by product keyword, filter by state or city clusters, or post a single Request for Quotation (RFQ) to receive competing quotations directly from verified factories.' },
      { question: 'Is supplier verification mandatory on Bulkskart?', answer: 'Yes. All featured manufacturers undergo identity verification, GST/tax audit, manufacturing facility validation, and IEC code screening.' },
    ],
    relatedLinks: [
      { label: 'Verified Manufacturers', url: '/manufacturers' },
      { label: 'Wholesale Suppliers', url: '/wholesale-suppliers' },
      { label: 'Bulk Products Catalog', url: '/bulk-products' },
      { label: 'Post an RFQ', url: '/post-requirement' },
    ],
  },
  'wholesale-suppliers': {
    slug: 'wholesale-suppliers',
    title: 'Verified Wholesale Suppliers in India | Bulk Distributors | Bulkskart',
    metaDescription: 'Source bulk goods directly from verified wholesale suppliers and distributors in India. Compare wholesale price lists, MOQs, and stock availability on Bulkskart.',
    h1: 'Verified Wholesale Suppliers & Bulk Distributors in India',
    tagline: 'Source high-volume wholesale commodities, FMCG, textiles, and industrial hardware at direct distributor rates.',
    canonical: 'https://www.bulkskart.com/wholesale-suppliers',
    type: 'suppliers',
    introTitle: 'Trusted Wholesale Distribution Network Across India',
    introText: 'Access thousands of verified wholesale stockists, authorized dealers, and master distributors across all major commercial trading hubs. Whether you are restocking a retail franchise, sourcing hotel supplies, or purchasing construction inventory, our verified suppliers provide transparent MOQs, instant GST tax invoices, and reliable logistics fulfillment.',
    keyIndustries: ['FMCG & Food Commodities', 'Textile & Apparel Wholesalers', 'Consumer Electronics Distributors', 'Building Hardware & Tools', 'Pharmaceutical & Surgical Supplies'],
    clusters: [
      { title: 'Verified GST Stockists', desc: 'Pre-screened distributors with active warehouse facilities and real-time inventory buffers.' },
      { title: 'Tiered Bulk Price Lists', desc: 'Transparent tiered discounts for pallet, container, and truckload orders.' },
      { title: 'Fast Regional Dispatch', desc: 'Logistics fulfillment networks covering North, South, East, and Western regional corridors.' },
      { title: 'Instant Sample Orders', desc: 'Request commercial sample packs before placing high-volume container commitments.' },
    ],
    faqs: [
      { question: 'How do wholesale suppliers differ from manufacturers on Bulkskart?', answer: 'Wholesale suppliers maintain ready-to-ship stock in warehouses and offer smaller minimum order quantities (MOQs) for immediate dispatch, while manufacturers produce to custom specifications.' },
      { question: 'Can I get wholesale credit or payment terms?', answer: 'Verified corporate buyers with active trade profiles can negotiate 15 to 45-day credit terms, letters of credit (LC), or escrow milestone settlements.' },
    ],
    relatedLinks: [
      { label: 'Wholesale Suppliers in India', url: '/wholesale-suppliers-in-india' },
      { label: 'Bulk Products Catalog', url: '/bulk-products' },
      { label: 'B2B Marketplace Hub', url: '/b2b-marketplace' },
      { label: 'Post Your Wholesale Requirement', url: '/post-requirement' },
    ],
  },
  'bulk-products': {
    slug: 'bulk-products',
    title: 'Buy Bulk Products at Factory Wholesale Prices | Bulkskart',
    metaDescription: 'Browse thousands of bulk products across machinery, raw materials, textiles, packaging, and electronics. Compare wholesale bulk pricing and low MOQs on Bulkskart.',
    h1: 'Source Bulk Products at Factory-Direct Wholesale Prices',
    tagline: 'Discover high-demand commercial inventory, industrial raw materials, and manufactured goods with clear MOQ tiers.',
    canonical: 'https://www.bulkskart.com/bulk-products',
    type: 'products',
    introTitle: 'Explore Thousands of Direct-from-Factory Bulk Listings',
    introText: 'From industrial solar modules and precision pumps to agricultural rice commodities and woven garment rolls, Bulkskart’s bulk products catalog offers clear specifications, transparent MOQ thresholds, and audited price ranges in INR, USD, and regional currencies. Request quotes or initiate bulk sample orders directly from verified factory listings.',
    keyIndustries: ['Industrial Equipment', 'Agricultural Bulk Grains', 'Yarn & Finished Fabrics', 'Polymer Packaging Containers', 'Electronics & Components'],
    clusters: [
      { title: 'Factory Direct Rates', desc: 'Eliminate third-party trading margins with direct ex-factory pricing.' },
      { title: 'Detailed Technical Specs', desc: 'Review material grades, ISO certifications, dimensions, and testing reports.' },
      { title: 'Flexible MOQ Sourcing', desc: 'Select products supporting micro-batch validation runs up to multi-container shipments.' },
      { title: '24-Hour Quotation Turnaround', desc: 'Request quotes with custom packaging, private labeling, and port-of-entry CIF terms.' },
    ],
    faqs: [
      { question: 'What is MOQ in bulk product ordering?', answer: 'MOQ stands for Minimum Order Quantity, which is the smallest unit volume or weight a manufacturer or wholesaler accepts per order.' },
      { question: 'Can I request customized OEM / private label branding?', answer: 'Yes. Most manufacturers on Bulkskart provide OEM and ODM manufacturing, including custom mold tooling, color matching, and private label packaging.' },
    ],
    relatedLinks: [
      { label: 'All Products Catalog', url: '/products' },
      { label: 'Verified Manufacturers', url: '/manufacturers' },
      { label: '24-Hour B2B Auctions', url: '/auctions' },
      { label: 'Post Bulk Requirement', url: '/post-requirement' },
    ],
  },
  'bulk-suppliers': {
    slug: 'bulk-suppliers',
    title: 'Bulk Suppliers & Factory Exporters Directory | Bulkskart',
    metaDescription: 'Connect with verified bulk suppliers, contract factories, and export houses in India. Post your wholesale requirements and receive direct quotations.',
    h1: 'Directory of Verified Bulk Suppliers & Exporters',
    tagline: 'Find vetted corporate bulk suppliers capable of high-volume industrial production and global maritime export fulfillment.',
    canonical: 'https://www.bulkskart.com/bulk-suppliers',
    type: 'suppliers',
    introTitle: 'Engineered for High-Volume Industrial Procurement',
    introText: 'Our bulk supplier directory aggregates verified production facilities with proven monthly capacities exceeding 100+ metric tons or 50,000+ units. Review factory inspection scores, machinery installations, export track records, and ISO/CE/GMP compliance credentials before initiating business negotiations.',
    keyIndustries: ['Steel & Metal Fabrication', 'Specialty Chemicals', 'Textile Spinning & Weaving', 'Automotive Components', 'Food Commodities & Spices'],
    clusters: [
      { title: 'Audited Production Capacities', desc: 'Factories vetted for machinery count, cleanroom capabilities, and worker safety.' },
      { title: 'Export Compliant (IEC/RCMC)', desc: 'Suppliers equipped with active export licenses, phytosanitary certificates, and customs documentation.' },
      { title: 'Direct Factory Chat', desc: 'Communicate directly with plant managers and commercial export directors.' },
      { title: 'Reverse Auction Bidding', desc: 'Invite multiple suppliers to participate in competitive real-time cost bidding.' },
    ],
    faqs: [
      { question: 'How are bulk suppliers audited on Bulkskart?', answer: 'Suppliers submit business registration documents, GST/tax returns, production floor photos, machinery lists, and third-party lab inspection certificates.' },
      { question: 'What payment methods are supported for bulk orders?', answer: 'Bulkskart supports Razorpay corporate payment gateway, NEFT/RTGS bank transfers, Letters of Credit (LC), and Trade Assurance escrow protection.' },
    ],
    relatedLinks: [
      { label: 'Manufacturers in India', url: '/manufacturers-in-india' },
      { label: 'Wholesale Suppliers', url: '/wholesale-suppliers' },
      { label: 'B2B Marketplace Hub', url: '/b2b-marketplace' },
      { label: 'Post RFQ', url: '/post-requirement' },
    ],
  },
  'manufacturers-in-india': {
    slug: 'manufacturers-in-india',
    title: 'Top Manufacturers in India | Verified Indian Factory Directory | Bulkskart',
    metaDescription: 'Find and connect with verified manufacturing companies across India. Source textiles, precision engineering, chemicals, and consumer goods directly from Indian factories.',
    h1: 'Top Verified Manufacturers & Industrial Plants in India',
    tagline: 'Discover leading Indian production facilities across specialized manufacturing clusters with verified GST, ISO, and export credentials.',
    canonical: 'https://www.bulkskart.com/manufacturers-in-india',
    region: 'India',
    type: 'manufacturers',
    introTitle: 'India’s Manufacturing Renaissance: High Quality & Cost Advantage',
    introText: 'India has emerged as one of the world’s most competitive manufacturing hubs across heavy engineering, textile weaving, generic pharmaceuticals, and electronics assembly. Bulkskart indexes thousands of verified Indian production plants, connecting domestic buyers and international importers directly to factory floors without middlemen.',
    keyIndustries: ['Automotive & Aerospace Engineering', 'Textiles, Garments & Home Furnishings', 'Pharmaceuticals & API Manufacturing', 'Pumps, Motors & Agricultural Machinery', 'Plastics & Precision Tooling'],
    clusters: [
      { title: 'Western Corridor (Gujarat & Maharashtra)', desc: 'Chemicals, petrochemicals, textile processing, ports (Nhava Sheva, Mundra), and precision plastics.' },
      { title: 'Southern Corridor (Tamil Nadu & Karnataka)', desc: 'Automotive components, industrial pumps, textile yarn, hardware foundry, and electronics hardware.' },
      { title: 'Northern Corridor (Punjab, Haryana & UP)', desc: 'Auto parts, sports equipment, agro commodities, leather goods, and metal hand tools.' },
      { title: 'Eastern Corridor (West Bengal & Odisha)', desc: 'Steel fabrication, jute textiles, heavy mineral processing, and foundry operations.' },
    ],
    faqs: [
      { question: 'Why source directly from manufacturers in India?', answer: 'Indian manufacturers offer competitive labor costs, sophisticated engineering talent, strict quality control (ISO/IATF), and favorable trade pacts globally.' },
      { question: 'How can international buyers verify Indian factories on Bulkskart?', answer: 'Bulkskart provides verified business certificates, GST verification badges, IEC export codes, and video plant walkthrough options.' },
    ],
    relatedLinks: [
      { label: 'Manufacturers in Tamil Nadu', url: '/manufacturers-in-tamil-nadu' },
      { label: 'Manufacturers in Chennai', url: '/manufacturers-in-chennai' },
      { label: 'Manufacturers in Coimbatore', url: '/manufacturers-in-coimbatore' },
      { label: 'Wholesale Suppliers in India', url: '/wholesale-suppliers-in-india' },
    ],
  },
  'manufacturers-in-tamil-nadu': {
    slug: 'manufacturers-in-tamil-nadu',
    title: 'Manufacturers in Tamil Nadu | Verified Factories & Mills | Bulkskart',
    metaDescription: 'Source directly from verified manufacturers in Tamil Nadu. Leading factories in textiles, automotive, leather, industrial pumps, and electrical components.',
    h1: 'Verified Manufacturers & Industrial Factories in Tamil Nadu',
    tagline: 'Connect with Tamil Nadu’s top manufacturing powerhouses across Tirupur, Coimbatore, Chennai, Salem, and Madurai.',
    canonical: 'https://www.bulkskart.com/manufacturers-in-tamil-nadu',
    region: 'Tamil Nadu, India',
    type: 'manufacturers',
    introTitle: 'Tamil Nadu: India’s Premier Manufacturing & Export Powerhouse',
    introText: 'Tamil Nadu ranks among India’s top industrialized states, accounting for a massive share of the nation’s automotive exports, knitwear garment production, precision motor pumps, and leather footwear. Bulkskart connects global procurement heads directly with ISO-certified Tamil Nadu manufacturers enjoying world-class port infrastructure at Chennai Port and Ennore.',
    keyIndustries: ['Knitwear & Cotton Apparel (Tirupur)', 'Submersible Pumps & Motors (Coimbatore)', 'Automotive & Precision Spares (Chennai)', 'Finished Leather & Footwear (Vellore & Ambur)', 'Cast Iron Foundry & Engineering (Salem)'],
    clusters: [
      { title: 'Tirupur Knitwear Capital', desc: 'World capital for organic cotton t-shirts, innerwear, and export knit garments.' },
      { title: 'Coimbatore Pump City', desc: 'Produces over 40% of India’s motors, submersible pumps, and textile spinning machinery.' },
      { title: 'Chennai Auto Corridor', desc: 'Known as the Detroit of South Asia, home to OEM auto assembly and tier-1 component stamping.' },
      { title: 'Vellore Leather Cluster', desc: 'Global tanning and finished leather footwear production meeting stringent EU REACH standards.' },
    ],
    faqs: [
      { question: 'Which industries are most prominent in Tamil Nadu?', answer: 'Textiles and garments, automotive parts, industrial pumps and motors, leather footwear, and electronics hardware assembly.' },
      { question: 'Are Tamil Nadu manufacturers export-ready?', answer: 'Yes, most factories have active IEC licenses, CE/OEKO-TEX certifications, and ship daily via Chennai and Tuticorin seaports.' },
    ],
    relatedLinks: [
      { label: 'Manufacturers in Coimbatore', url: '/manufacturers-in-coimbatore' },
      { label: 'Manufacturers in Chennai', url: '/manufacturers-in-chennai' },
      { label: 'Manufacturers in India', url: '/manufacturers-in-india' },
      { label: 'Post an RFQ', url: '/post-requirement' },
    ],
  },
  'manufacturers-in-coimbatore': {
    slug: 'manufacturers-in-coimbatore',
    title: 'Manufacturers in Coimbatore | Pump, Motor & Textile Engineering | Bulkskart',
    metaDescription: 'Connect with verified manufacturers in Coimbatore. Leading producers of submersible pumps, electric motors, wet grinders, textile machinery, and precision casting.',
    h1: 'Verified Manufacturers & Engineering Plants in Coimbatore',
    tagline: 'Discover Coimbatore’s renowned pump, motor, foundry, and textile manufacturing excellence with direct factory pricing.',
    canonical: 'https://www.bulkskart.com/manufacturers-in-coimbatore',
    region: 'Coimbatore, Tamil Nadu',
    city: 'Coimbatore',
    type: 'manufacturers',
    introTitle: 'Coimbatore: The Manchester of South India & Engineering Hub',
    introText: 'Coimbatore is globally celebrated for high-precision engineering, energy-efficient agricultural and industrial water pumps, fractional horsepower motors, and heavy textile spinning machinery. Bulkskart enables bulk buyers to discover verified Coimbatore industrial units with direct factory quotations.',
    keyIndustries: ['Submersible & Centrifugal Pumps', 'Electric Induction Motors', 'Textile Machinery & Spares', 'Ferrous & Non-Ferrous Castings', 'Precision CNC Machining'],
    clusters: [
      { title: 'Pump & Motor Hub', desc: 'Over 3,000 pump manufacturing facilities delivering domestic, agricultural, and industrial pumping solutions.' },
      { title: 'Foundry & Precision Metalwork', desc: 'Certified grey iron and ductile iron foundries producing engine blocks and hydraulic housings.' },
      { title: 'Textile Machinery Spares', desc: 'Supplying spindles, flyers, rings, and automated loom parts worldwide.' },
      { title: 'Aerospace & Defense Machining', desc: 'Specialized 5-axis CNC facilities catering to defense research and industrial robotics.' },
    ],
    faqs: [
      { question: 'What products is Coimbatore most famous for in B2B manufacturing?', answer: 'Coimbatore is renowned for agricultural water pumps, domestic booster pumps, electric induction motors, wet grinders, and precision foundry castings.' },
      { question: 'Can I purchase OEM pump assemblies directly from Coimbatore factories?', answer: 'Yes. Manufacturers on Bulkskart provide complete white-label OEM manufacturing with custom copper windings, stainless steel impellers, and branded packaging.' },
    ],
    relatedLinks: [
      { label: 'Manufacturers in Tamil Nadu', url: '/manufacturers-in-tamil-nadu' },
      { label: 'Manufacturers in Chennai', url: '/manufacturers-in-chennai' },
      { label: 'Manufacturers in India', url: '/manufacturers-in-india' },
      { label: 'Post an RFQ', url: '/post-requirement' },
    ],
  },
  'manufacturers-in-chennai': {
    slug: 'manufacturers-in-chennai',
    title: 'Manufacturers in Chennai | Auto, Heavy Engineering & Electronics | Bulkskart',
    metaDescription: 'Source from verified manufacturing plants in Chennai. Automotive components, heavy machinery, electronic hardware, and export-grade fabrication.',
    h1: 'Verified Manufacturers & Industrial Plants in Chennai',
    tagline: 'Access Chennai’s world-class industrial corridors across Sriperumbudur, Oragadam, Ambattur, and Guindy with direct factory access.',
    canonical: 'https://www.bulkskart.com/manufacturers-in-chennai',
    region: 'Chennai, Tamil Nadu',
    city: 'Chennai',
    type: 'manufacturers',
    introTitle: 'Chennai: The Automotive & Industrial Gateway of South Asia',
    introText: 'Chennai houses one of the densest industrial manufacturing ecosystems in Asia. With state-of-the-art Special Economic Zones (SEZs) at Sriperumbudur and Oragadam and direct deep-water port access, Chennai factories manufacture world-class auto components, heavy fabrication equipment, medical devices, and consumer electronics.',
    keyIndustries: ['Automotive Assemblies & Brake Systems', 'Heavy Steel & Structural Fabrication', 'Electronics Manufacturing Services (EMS)', 'Polymer & Injection Molded Parts', 'Renewable Energy Equipment (Wind & Solar)'],
    clusters: [
      { title: 'Sriperumbudur - Oragadam Corridor', desc: 'Automotive and electronics belt hosting multinational assembly lines and tier-1 vendor parks.' },
      { title: 'Ambattur Industrial Estate', desc: 'One of the largest small and medium scale industrial estates in South Asia for precision machining.' },
      { title: 'Gummidipoondi Industrial Zone', desc: 'Heavy structural steel, chemical compounding, and high-volume packaging manufacturing.' },
      { title: 'Direct Deep-Water Port Access', desc: 'Seamless container stuffing and fast customs clearance via Chennai and Kamarajar Ports.' },
    ],
    faqs: [
      { question: 'What manufacturing sectors dominate Chennai?', answer: 'Automotive OEM and tier-1 parts, precision electrical hardware, electronics contract manufacturing, industrial plastics, and steel fabrication.' },
      { question: 'How do Chennai factories ship international bulk orders?', answer: 'Most factories utilize Chennai Port or Ennore Kamarajar Port with direct maritime container sailings to Singapore, Colombo, Dubai, Europe, and the US East Coast.' },
    ],
    relatedLinks: [
      { label: 'Manufacturers in Tamil Nadu', url: '/manufacturers-in-tamil-nadu' },
      { label: 'Manufacturers in Coimbatore', url: '/manufacturers-in-coimbatore' },
      { label: 'Manufacturers in India', url: '/manufacturers-in-india' },
      { label: 'Post an RFQ', url: '/post-requirement' },
    ],
  },
  'wholesale-suppliers-in-india': {
    slug: 'wholesale-suppliers-in-india',
    title: 'Wholesale Suppliers in India | B2B Bulk Product Distributors | Bulkskart',
    metaDescription: 'Connect with verified wholesale suppliers, master stockists, and bulk distributors across India. Compare bulk prices, MOQs, and instant GST invoices on Bulkskart.',
    h1: 'Verified Wholesale Suppliers & Master Distributors in India',
    tagline: 'Source direct from verified Indian wholesale traders, warehouse distributors, and bulk stockists with full buyer protection.',
    canonical: 'https://www.bulkskart.com/wholesale-suppliers-in-india',
    region: 'India',
    type: 'suppliers',
    introTitle: 'India’s Unified Wholesale Sourcing & Distribution Hub',
    introText: 'Bulkskart’s nationwide wholesale supplier network covers high-volume procurement across FMCG commodities, textiles, electronic accessories, industrial consumables, and construction hardware. Compare verified supplier ratings, verify GSTIN registration, request quotes, and manage multi-city bulk dispatches from one dashboard.',
    keyIndustries: ['FMCG & Agro Commodities', 'Apparel & Fabric Wholesalers', 'Consumer Electronics & Accessories', 'Industrial Hardware & Fasteners', 'Packaging Rolls & Corrugated Boxes'],
    clusters: [
      { title: 'Nationwide Logistics Coverage', desc: 'Direct supply lines connecting Delhi NCR, Mumbai, Surat, Bengaluru, Chennai, and Kolkata wholesale markets.' },
      { title: 'GST Compliant Invoicing', desc: '100% compliant business-to-business tax invoices for input tax credit (ITC) claims.' },
      { title: 'Escrow Payment Safeguard', desc: 'Funds held in secure escrow until physical goods pass consignment inspection.' },
      { title: 'Direct Factory Quotations', desc: 'Receive wholesale bulk offers without multiple distributor broker markups.' },
    ],
    faqs: [
      { question: 'How can I verify a wholesale supplier in India on Bulkskart?', answer: 'Check the supplier profile for the Verified Supplier badge, audited GSTIN number, company establishment year, product catalog, and verified buyer reviews.' },
      { question: 'Can wholesale suppliers handle pan-India multi-location deliveries?', answer: 'Yes. Most established wholesale distributors on Bulkskart have logistics partnerships with commercial freight carriers for pan-India delivery.' },
    ],
    relatedLinks: [
      { label: 'Wholesale Suppliers Directory', url: '/wholesale-suppliers' },
      { label: 'Bulk Products Catalog', url: '/bulk-products' },
      { label: 'Manufacturers in India', url: '/manufacturers-in-india' },
      { label: 'Post Your Requirement', url: '/post-requirement' },
    ],
  },
};

export default function SEOHubPage({ forcedSlug }: { forcedSlug?: string }) {
  const { slug } = useParams<{ slug: string }>();
  const activeSlug = forcedSlug || slug || 'b2b-marketplace';
  const config = SEO_HUBS[activeSlug] || SEO_HUBS['b2b-marketplace'];

  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getCompanies({ limit: 12 }),
      getProducts({ limit: 8 }),
    ]).then(([coList, prodList]) => {
      if (cancelled) return;
      if (Array.isArray(coList)) {
        let filtered: Company[] = coList;
        if (config.city) {
          const cLower = config.city.toLowerCase();
          const cityMatches = coList.filter((c: Company) =>
            (c.city && c.city.toLowerCase().includes(cLower)) ||
            (c.state && c.state.toLowerCase().includes(cLower)) ||
            (c.address && c.address.toLowerCase().includes(cLower))
          );
          filtered = cityMatches.length >= 3 ? cityMatches : coList;
        } else if (config.region && config.region.toLowerCase().includes('tamil nadu')) {
          const tnMatches = coList.filter((c: Company) =>
            (c.state && c.state.toLowerCase().includes('tamil nadu')) ||
            (c.city && ['coimbatore', 'chennai', 'tirupur', 'salem', 'madurai'].some(city => c.city?.toLowerCase().includes(city)))
          );
          filtered = tnMatches.length >= 3 ? tnMatches : coList;
        }
        setCompanies(filtered);
      }
      if (Array.isArray(prodList)) {
        setProducts(prodList);
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeSlug, config.city, config.region]);

  const breadcrumbs = [
    { name: 'Home', item: '/' },
    { name: config.h1, item: config.canonical },
  ];

  return (
    <MainLayout>
      <PageMeta
        title={config.title}
        description={config.metaDescription}
        canonical={config.canonical}
        robots="index, follow"
        ogType="website"
        breadcrumbs={breadcrumbs}
        faq={config.faqs}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: config.h1,
            description: config.metaDescription,
            url: config.canonical,
            isPartOf: {
              '@type': 'WebSite',
              name: 'Bulkskart',
              url: 'https://www.bulkskart.com',
            },
          },
        ]}
      />

      {/* ── Breadcrumbs Bar ── */}
      <div className="border-b border-border/60 bg-muted/20 py-2.5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <Breadcrumbs
            items={[
              { name: config.type === 'manufacturers' ? 'Manufacturers' : 'Marketplace', href: '/manufacturers' },
              { name: config.h1 },
            ]}
          />
        </div>
      </div>

      {/* ── Hero Banner Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0a0f1d] via-[#0d1322] to-background border-b border-border py-10 md:py-14">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#FF5A00]/10 border border-[#FF5A00]/25 rounded-full px-3 py-1 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5A00]" />
              <span className="text-xs font-bold text-[#FF5A00] tracking-wide uppercase">
                {config.region || 'India Wholesale Sourcing'}
              </span>
            </div>

            {/* Exactly one authoritative H1 tag */}
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-foreground tracking-tight leading-[1.15] mb-4">
              {config.h1}
            </h1>

            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6">
              {config.tagline}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/post-requirement">
                <Button className="bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-11 px-6 rounded-xl shadow-md gap-2">
                  <FileText className="w-4 h-4" /> Post RFQ for {config.city || 'Wholesale'}
                </Button>
              </Link>
              <Link to="/products">
                <Button variant="outline" className="border-border hover:border-[#FF5A00] text-primary font-semibold h-11 px-5 rounded-xl gap-2">
                  <Package className="w-4 h-4 text-[#FF5A00]" /> Browse Bulk Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── In-Depth Market & Industrial Overview ── */}
      <section className="py-10 bg-card/60 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                Industry Insights
              </Badge>
              <h2 className="text-xl md:text-2xl font-black text-foreground">
                {config.introTitle}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                {config.introText}
              </p>

              <div className="pt-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Core Sourcing Sectors:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {config.keyIndustries.map(ind => (
                    <Badge key={ind} variant="outline" className="bg-muted/40 border-border text-foreground text-xs py-1 px-2.5">
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.clusters.map((c, idx) => (
                <Card key={idx} className="border-border/80 bg-background/80 shadow-sm">
                  <CardContent className="p-4">
                    <div className="w-8 h-8 rounded-lg bg-[#FF5A00]/10 flex items-center justify-center text-[#FF5A00] mb-2 font-black text-xs">
                      {idx + 1}
                    </div>
                    <h3 className="text-xs font-bold text-foreground mb-1">{c.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{c.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Curated Verified Suppliers / Directory ── */}
      <section className="py-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-foreground">
                Featured Verified Suppliers & Production Facilities
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Audited factory profiles with active GST registration, low MOQs, and direct quotations.
              </p>
            </div>
            <Link to="/manufacturers">
              <Button variant="outline" size="sm" className="border-border hover:border-[#FF5A00] text-xs font-bold gap-1.5 self-start">
                <span>View all suppliers</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-64 rounded-xl bg-muted/40 animate-pulse border border-border" />
              ))}
            </div>
          ) : companies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {companies.slice(0, 8).map(co => (
                <Card key={co.id} className="border-border hover:border-[#FF5A00]/60 transition-all duration-300 hover:-translate-y-1 bg-card flex flex-col overflow-hidden group">
                  <div className="aspect-[16/9] relative overflow-hidden bg-muted">
                    <SafeImage
                      src={co.cover_url || co.banner_url || co.logo_url}
                      alt={co.company_name}
                      category={co.business_type}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-[#FF5A00] text-white text-[10px] font-bold">
                        Verified Supplier
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-[#FF5A00] transition-colors">
                        {co.company_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                        <span className="truncate">{co.city ? `${co.city}, ` : ''}{co.state || co.country || 'India'}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {co.description || 'Verified manufacturer offering contract production, wholesale catalog distribution, and custom OEM bulk orders.'}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <Link to={`/companies/${co.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full h-8 text-xs font-semibold border-border hover:border-[#FF5A00]">
                          View Profile
                        </Button>
                      </Link>
                      <Link to="/post-requirement" className="flex-1">
                        <Button size="sm" className="w-full h-8 text-xs font-bold bg-[#FF5A00] hover:bg-[#e04e00] text-white">
                          Get Quote
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-muted/20">
              <Factory className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-foreground font-semibold">Active listings are synchronizing.</p>
              <p className="text-xs text-muted-foreground mt-1">Explore all verified suppliers across India.</p>
              <Link to="/manufacturers" className="inline-block mt-3">
                <Button size="sm" className="bg-[#FF5A00] text-white text-xs font-bold">
                  Browse All Manufacturers
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Visible FAQ Accordion Section (Paired with FAQPage Schema) ── */}
      <section className="py-10 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <Badge className="bg-[#FF5A00]/10 text-[#FF5A00] border border-[#FF5A00]/25 text-xs font-bold mb-2">
              Buyer Questions
            </Badge>
            <h2 className="text-xl md:text-3xl font-black text-foreground">
              Frequently Asked Questions About Sourcing
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Essential knowledge for B2B buyers procuring in bulk.
            </p>
          </div>

          <div className="space-y-3">
            {config.faqs.map((f, i) => (
              <div key={i} className="border border-border/80 rounded-xl bg-card p-4 shadow-sm">
                <h3 className="text-xs md:text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#FF5A00] shrink-0" />
                  <span>{f.question}</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2 pl-6">
                  {f.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Internal Cross-Linking Matrix ── */}
      <section className="py-8 bg-card border-t border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
            Explore Related Sourcing Hubs & Regional Industrial Clusters
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {config.relatedLinks.map(link => (
              <Link key={link.url} to={link.url}>
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border hover:border-[#FF5A00] hover:text-[#FF5A00]">
                  {link.label}
                </Button>
              </Link>
            ))}
            <Link to="/manufacturers-in-india">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border hover:border-[#FF5A00]">
                Manufacturers in India
              </Button>
            </Link>
            <Link to="/manufacturers-in-tamil-nadu">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border hover:border-[#FF5A00]">
                Tamil Nadu Factories
              </Button>
            </Link>
            <Link to="/manufacturers-in-coimbatore">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border hover:border-[#FF5A00]">
                Coimbatore Pump & Textile Mills
              </Button>
            </Link>
            <Link to="/manufacturers-in-chennai">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border hover:border-[#FF5A00]">
                Chennai Auto & Industrial Plants
              </Button>
            </Link>
            <Link to="/wholesale-suppliers-in-india">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border hover:border-[#FF5A00]">
                Wholesale Distributors India
              </Button>
            </Link>
            <Link to="/bulk-products">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border hover:border-[#FF5A00]">
                Bulk Products Catalog
              </Button>
            </Link>
            <Link to="/b2b-marketplace">
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border hover:border-[#FF5A00]">
                B2B Marketplace Hub
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
