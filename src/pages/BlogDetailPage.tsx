import React from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import PageMeta from '@/components/common/PageMeta';
import NotFound from '@/pages/NotFound';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar, Clock, User, ArrowLeft, ArrowRight, Share2,
  CheckCircle, Building2, Package, FileText, ChevronRight,
  ShieldCheck, HelpCircle, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

export interface BlogPostData {
  slug: string;
  title: string;
  metaDescription: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  h1: string;
  summary: string;
  content: {
    heading: string;
    paragraphs: string[];
    bulletPoints?: string[];
  }[];
  faqs?: { question: string; answer: string }[];
  relatedLinks: { label: string; url: string }[];
}

export const BLOG_POSTS: Record<string, BlogPostData> = {
  'how-to-find-manufacturers-in-india': {
    slug: 'how-to-find-manufacturers-in-india',
    title: 'How to Find Verified Manufacturers in India (2026 Sourcing Guide)',
    metaDescription: 'Step-by-step guide to finding, vetting, and negotiating with verified Indian factories. Learn how to verify GST, audit production capabilities, and avoid trade risks.',
    category: 'Supplier Guides',
    author: 'BulkSkart Editorial Team',
    date: '02 Oct 2026',
    readTime: '7 min',
    h1: 'How to Find and Vet Reliable Manufacturers in India',
    summary: 'India is one of the world’s most dynamic manufacturing destinations across engineering, textiles, chemicals, and pharmaceuticals. This comprehensive guide walks you through finding authentic factories, verifying credentials, and placing your first production order.',
    content: [
      {
        heading: '1. Identify the Right Industrial Clusters',
        paragraphs: [
          'Manufacturing in India is geographically specialized. Rather than searching nationwide blindly, targeting the specific geographic cluster for your product category yields higher quality and better pricing.',
          'For example, Coimbatore in Tamil Nadu is India’s hub for electric motors, submersible pumps, and precision casting. Tirupur is the undisputed capital for cotton knitwear, while Gujarat specializes in petrochemicals, ceramic tiles, and industrial machinery.',
        ],
        bulletPoints: [
          'Tamil Nadu: Pumps (Coimbatore), Automotive (Chennai), Knitwear (Tirupur), Leather (Vellore)',
          'Gujarat: Specialty chemicals, packaging films, synthetic textiles (Surat), plastics (Ahmedabad)',
          'Maharashtra: Engineering fabrication, auto assemblies (Pune), pharmaceuticals (Mumbai)',
          'Punjab & Haryana: Fasteners (Ludhiana), sports goods (Jalandhar), scientific equipment (Ambala)',
        ],
      },
      {
        heading: '2. Verify Official Government Credentials',
        paragraphs: [
          'Before transferring sample fees or production advances, always verify the manufacturer’s statutory registrations. Legitimate Indian factories operate under verifiable government registrations.',
        ],
        bulletPoints: [
          'GSTIN (Goods and Services Tax Identification Number): Confirms active tax compliance and legal business name.',
          'IEC (Importer Exporter Code): Issued by the DGFT (Directorate General of Foreign Trade) for global maritime shipments.',
          'Udyam / MSME Registration: Official registration proving factory establishment date and category.',
          'Quality Certifications: Verify genuine ISO 9001, CE marking, or OEKO-TEX certificate numbers directly with issuing registrars.',
        ],
      },
      {
        heading: '3. Request Factory Audits and Video Walkthroughs',
        paragraphs: [
          'A common pitfall is mistaking a trading company or broker for the actual factory. Ask for a live video walkthrough of the factory floor, focusing on machine lines, raw material storage, and ongoing batch runs.',
          'On Bulkskart, all featured manufacturers have undergone physical address checks and facility document audits, giving buyers transparent confidence.',
        ],
      },
      {
        heading: '4. Order Commercial Samples and Test Specifications',
        paragraphs: [
          'Never commit to full container volumes without first receiving and lab-testing a production-grade pre-shipment sample. Verify material grade, dimensional tolerances, packaging resilience, and barcoding compliance.',
        ],
      },
    ],
    faqs: [
      { question: 'What is the best way to contact Indian manufacturers?', answer: 'Using a dedicated B2B platform like Bulkskart allows you to post an RFQ and receive audited factory quotes directly from verified plant managers.' },
      { question: 'Are Indian factories able to provide OEM / ODM private labeling?', answer: 'Yes, the vast majority of Indian manufacturers produce OEM orders with custom mold tooling, client branding, and custom packaging.' },
    ],
    relatedLinks: [
      { label: 'Browse Indian Manufacturers', url: '/manufacturers-in-india' },
      { label: 'Tamil Nadu Manufacturing Hub', url: '/manufacturers-in-tamil-nadu' },
      { label: 'Post an RFQ Free', url: '/post-requirement' },
    ],
  },
  'what-is-moq': {
    slug: 'what-is-moq',
    title: 'What is MOQ in Wholesale & Manufacturing? Complete Guide for Buyers',
    metaDescription: 'Understand Minimum Order Quantity (MOQ) in B2B trade. Learn why factories set MOQs, how to calculate them, and proven negotiation strategies to lower them.',
    category: 'Trade Tips',
    author: 'BulkSkart Editorial Team',
    date: '28 Sep 2026',
    readTime: '6 min',
    h1: 'What is Minimum Order Quantity (MOQ) and How to Negotiate It',
    summary: 'Minimum Order Quantity (MOQ) is the lowest volume of goods a manufacturer or supplier is willing to sell in a single order. Understanding why MOQs exist gives buyers powerful leverage in trade negotiations.',
    content: [
      {
        heading: 'Why Do Factories Set Minimum Order Quantities?',
        paragraphs: [
          'Factories do not set MOQs arbitrarily. An MOQ is driven by production economics, including machine calibration setup times, minimum raw material batch sizes from mills, and packaging print run minimums.',
          'For instance, a plastic injection molding facility requires several hours to mount molds, purge resins, and achieve optimal operating temperature. Running fewer than 1,000 units would result in operational losses.',
        ],
      },
      {
        heading: 'Proven Strategies to Lower Factory MOQs',
        paragraphs: [
          'When launching a new product line or testing a regional market, committing to large MOQs can tie up working capital. Here are proven ways to negotiate smaller test batches:',
        ],
        bulletPoints: [
          'Use Standard Colors and Materials: Request fabrics or resins that the factory already uses in existing active production lines.',
          'Pay a Modest Per-Unit Premium: Offer to pay 10%–15% more per unit on a 200-unit trial batch in exchange for full production volume later.',
          'Consolidate with Wholesale Stockists: If factory MOQ is out of reach, purchase from verified wholesale distributors on Bulkskart who stock ready-to-ship pallets.',
          'Staggered Release Orders: Contract for the full MOQ volume on paper, but request phased deliveries over 3 to 6 months.',
        ],
      },
    ],
    faqs: [
      { question: 'Can I order below the stated MOQ on Bulkskart?', answer: 'Yes, you can post a custom RFQ specifying your target quantity and budget. Many suppliers accept pilot or sample orders below their catalog MOQ.' },
      { question: 'What is the difference between product MOQ and order MOQ?', answer: 'Product MOQ applies to a single SKU (e.g. 500 red shirts), while order MOQ is the minimum total order value across multiple SKUs (e.g. $2,000 total order).' },
    ],
    relatedLinks: [
      { label: 'Browse Bulk Products', url: '/bulk-products' },
      { label: 'Wholesale Suppliers Directory', url: '/wholesale-suppliers' },
      { label: 'Post an RFQ', url: '/post-requirement' },
    ],
  },
  'how-to-buy-products-in-bulk': {
    slug: 'how-to-buy-products-in-bulk',
    title: 'How to Buy Products in Bulk Directly from Factories (2026)',
    metaDescription: 'Complete step-by-step tutorial on buying wholesale products in bulk. Master RFQs, compare quotations, inspect goods, and secure trade payments.',
    category: 'Buyer Resources',
    author: 'BulkSkart Editorial Team',
    date: '20 Sep 2026',
    readTime: '8 min',
    h1: 'The Ultimate Guide to Buying Products in Bulk Online',
    summary: 'Transitioning from retail purchasing to commercial bulk buying unlocks massive cost efficiencies. This guide outlines the complete procurement lifecycle from inquiry to port delivery.',
    content: [
      {
        heading: '1. Draft a Clear Specification Sheet',
        paragraphs: [
          'Ambiguous inquiries lead to delayed or inaccurate quotes. Before reaching out to manufacturers, specify exact technical dimensions, material grades, tolerance levels, packaging requirements, and compliance standards.',
        ],
      },
      {
        heading: '2. Post a Request for Quotation (RFQ)',
        paragraphs: [
          'Instead of emailing suppliers one by one, use Bulkskart’s digital RFQ engine. By submitting your requirement once, our system routes it to pre-screened factories in your sector, delivering multiple competitive quotes to your inbox.',
        ],
      },
      {
        heading: '3. Compare Total Landed Costs, Not Just Ex-Factory Price',
        paragraphs: [
          'A cheaper ex-factory (EXW) quote can become more expensive once freight, port handling, customs duties, and insurance are tallied. Always calculate your Total Landed Cost (TLC) using Bulkskart’s integrated shipping and tax calculators.',
        ],
      },
      {
        heading: '4. Protect Payments with Escrow and Milestone Releases',
        paragraphs: [
          'In bulk trade, standard payment terms typically follow 30% advance on order confirmation and 70% upon bill of lading (BL) or pre-shipment inspection pass. Use Trade Assurance escrow to protect capital against non-delivery or quality variances.',
        ],
      },
    ],
    faqs: [
      { question: 'Is it safe to pay manufacturers online for bulk orders?', answer: 'Yes, when paying through Bulkskart’s Trade Assurance and verified payment gateways (Razorpay), your funds are protected by milestone validation and dispute resolution.' },
    ],
    relatedLinks: [
      { label: 'Post an RFQ Now', url: '/post-requirement' },
      { label: 'Shipping Calculator', url: '/shipping-calculator' },
      { label: 'B2B Marketplace Hub', url: '/b2b-marketplace' },
    ],
  },
  'manufacturer-vs-wholesaler': {
    slug: 'manufacturer-vs-wholesaler',
    title: 'Manufacturer vs Wholesaler: Which Sourcing Partner is Right for You?',
    metaDescription: 'Compare manufacturers vs wholesale suppliers. Discover pricing differences, lead times, MOQ requirements, and how to choose the right partner on Bulkskart.',
    category: 'Trade Tips',
    author: 'BulkSkart Editorial Team',
    date: '15 Sep 2026',
    readTime: '5 min',
    h1: 'Manufacturer vs Wholesaler: Key Differences and Sourcing Strategy',
    summary: 'Choosing between a manufacturer and a wholesale distributor depends on your order volume, lead time flexibility, customization needs, and budget. Here is how to make the right choice.',
    content: [
      {
        heading: 'When to Choose a Manufacturer',
        paragraphs: [
          'Manufacturers produce goods directly from raw materials. They offer the lowest unit cost, complete OEM/ODM customization, and large production capacities. However, they require higher MOQs and longer manufacturing lead times (typically 15 to 45 days).',
        ],
        bulletPoints: [
          'Ideal for: High volume orders, private label branding, custom dimensions or formulations.',
          'Trade-offs: Higher MOQ, longer production lead times, upfront tooling or mold costs.',
        ],
      },
      {
        heading: 'When to Choose a Wholesale Supplier or Stockist',
        paragraphs: [
          'Wholesalers purchase in massive quantities from multiple factories and hold inventory in local distribution centers. They offer immediate dispatch (1–3 days), lower MOQs (often single cartons or pallets), and the convenience of bundling multiple product lines into one shipment.',
        ],
        bulletPoints: [
          'Ideal for: Immediate inventory needs, small to medium retail stores, testing new market demand.',
          'Trade-offs: Slightly higher unit price than ex-factory, limited or no custom branding options.',
        ],
      },
    ],
    faqs: [
      { question: 'Does Bulkskart have both manufacturers and wholesalers?', answer: 'Yes! Bulkskart clearly badges each supplier as either a Verified Manufacturer or Wholesale Distributor so buyers can filter by their exact operational requirements.' },
    ],
    relatedLinks: [
      { label: 'Browse Verified Manufacturers', url: '/manufacturers' },
      { label: 'Browse Wholesale Suppliers', url: '/wholesale-suppliers' },
      { label: 'Compare Pricing Plans', url: '/pricing' },
    ],
  },
  'how-to-post-an-rfq': {
    slug: 'how-to-post-an-rfq',
    title: 'How to Write an RFQ (Request for Quotation) That Gets 10+ Fast Quotes',
    metaDescription: 'Master the art of writing a high-converting RFQ. Step-by-step template, critical fields, and tips to attract verified suppliers on Bulkskart.',
    category: 'Trade Tips',
    author: 'BulkSkart Editorial Team',
    date: '10 Sep 2026',
    readTime: '6 min',
    h1: 'How to Write a Winning Request for Quotation (RFQ)',
    summary: 'A well-crafted RFQ separates professional corporate buyers from casual tire-kickers. Learn how to structure your RFQ to receive competitive factory bids within 24 hours.',
    content: [
      {
        heading: 'Essential Elements of a Professional RFQ',
        paragraphs: [
          'Factory quotation teams prioritize detailed RFQs that contain complete commercial parameters. Vague inquiries like "Send best price" are routinely ignored by top manufacturers.',
        ],
        bulletPoints: [
          'Exact Product Title and Material Specification: (e.g. 304 Stainless Steel Ball Valve 2-inch)',
          'Clear Target Volume and Packaging: (e.g. 5,000 units in wooden export crates)',
          'Incoterm and Destination Port: (e.g. CIF Nhava Sheva or FOB Chennai)',
          'Required Quality Certifications: (e.g. ISO 9001, CE, RoHS compliant)',
          'Target Delivery Deadline: (e.g. required within 45 days of order confirmation)',
        ],
      },
      {
        heading: 'How Bulkskart’s AI-Powered RFQ Engine Works',
        paragraphs: [
          'When you post a requirement on Bulkskart, our matching algorithm parses your product category, quantity, and technical parameters. It automatically alerts verified suppliers in that sector, allowing qualified manufacturers to submit transparent itemized quotes.',
        ],
      },
    ],
    faqs: [
      { question: 'Is posting an RFQ free on Bulkskart?', answer: 'Yes, posting requirements is 100% free for verified buyers with zero platform commissions.' },
    ],
    relatedLinks: [
      { label: 'Post Your RFQ Free', url: '/post-requirement' },
      { label: 'View Live Buyer Requirements', url: '/requirements' },
      { label: 'How Bulkskart Works', url: '/how-it-works' },
    ],
  },
};

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = BLOG_POSTS[slug || ''];

  // An unknown address is "not found", not a copy of the first article under a different URL.
  if (!post) return <NotFound />;

  const breadcrumbs = [
    { name: 'Home', item: '/' },
    { name: 'Blog', item: '/blog' },
    { name: post.title, item: `/blog/${post.slug}` },
  ];

  return (
    <MainLayout>
      <PageMeta
        title={`${post.title} | Bulkskart`}
        description={post.metaDescription}
        canonical={`https://www.bulkskart.com/blog/${post.slug}`}
        ogType="article"
        robots="index, follow"
        breadcrumbs={breadcrumbs}
        faq={post.faqs}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.metaDescription,
            author: {
              '@type': 'Person',
              name: post.author,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Bulkskart',
              logo: {
                '@type': 'ImageObject',
                url: 'https://www.bulkskart.com/brand/bulkskart-logo.jpg',
              },
            },
            datePublished: '2026-09-15',
            dateModified: '2026-10-07',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://www.bulkskart.com/blog/${post.slug}`,
            },
          },
        ]}
      />

      {/* ── Breadcrumbs ── */}
      <div className="border-b border-border/60 bg-muted/20 py-2.5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Breadcrumbs
            items={[
              { name: 'Blog & Sourcing Guides', href: '/blog' },
              { name: post.title },
            ]}
          />
        </div>
      </div>

      <article className="py-10 px-4 max-w-4xl mx-auto">
        {/* Back Link */}
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#FF5A00] font-semibold mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sourcing Guides
        </Link>

        {/* Article Header */}
        <div className="space-y-3 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#FF5A00]/10 text-[#FF5A00] border border-[#FF5A00]/25 text-xs font-bold uppercase tracking-wider">
              {post.category}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {post.readTime} read
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {post.date}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-[1.2]">
            {post.h1}
          </h1>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <User className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{post.author}</span>
          </div>
        </div>

        {/* Lead Summary */}
        <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/80 mb-8 text-sm md:text-base text-foreground leading-relaxed font-medium">
          {post.summary}
        </div>

        {/* Body Content */}
        <div className="space-y-8 text-sm md:text-base text-foreground/90 leading-relaxed">
          {post.content.map((sec, i) => (
            <section key={i} className="space-y-3">
              <h2 className="text-lg md:text-2xl font-black text-foreground pt-2">
                {sec.heading}
              </h2>
              {sec.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-muted-foreground leading-relaxed">
                  {p}
                </p>
              ))}
              {sec.bulletPoints && (
                <ul className="space-y-2 mt-3 pl-2">
                  {sec.bulletPoints.map((b, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2 text-xs md:text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-[#FF5A00] shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* Inline FAQ Section */}
        {post.faqs && post.faqs.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-lg md:text-xl font-black text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {post.faqs.map((f, i) => (
                <div key={i} className="border border-border rounded-xl bg-card p-4">
                  <h3 className="text-xs md:text-sm font-bold text-foreground">
                    {f.question}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {f.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Call to Action Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-[#0d1322] to-card border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Ready to source in bulk with zero intermediaries?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Post an RFQ now and receive competing factory quotations within 24 hours.</p>
          </div>
          <Link to="/post-requirement" className="shrink-0">
            <Button className="bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-10 px-5 rounded-xl shadow-md gap-1.5">
              <span>Post Free RFQ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Related Sourcing Links */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Related Sourcing Links:</p>
          <div className="flex flex-wrap gap-2">
            {post.relatedLinks.map((link) => (
              <Link key={link.url} to={link.url}>
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border hover:border-[#FF5A00]">
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </article>
    </MainLayout>
  );
}
