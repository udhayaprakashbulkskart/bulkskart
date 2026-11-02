import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Tag, ArrowRight, TrendingUp, Sparkles, CheckCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layouts/Header';
import Footer from '@/components/layouts/Footer';
import PageMeta from '@/components/common/PageMeta';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { BLOG_POSTS } from './BlogDetailPage';

const CATEGORIES = ['All', 'Trade Tips', 'Supplier Guides', 'Buyer Resources'];

const POSTS = [
  {
    slug: 'how-to-find-manufacturers-in-india',
    category: 'Supplier Guides',
    title: 'How to Find Verified Manufacturers in India (2026 Sourcing Guide)',
    excerpt: 'Step-by-step guide to finding, vetting, and negotiating with verified Indian factories. Learn how to verify GST, audit production capabilities, and avoid trade risks.',
    author: 'BulkSkart Editorial Team',
    date: '02 Oct 2026',
    readTime: '7 min',
    tag: 'Trending',
  },
  {
    slug: 'what-is-moq',
    category: 'Trade Tips',
    title: 'What is MOQ in Wholesale & Manufacturing? Complete Guide for Buyers',
    excerpt: 'Understand Minimum Order Quantity (MOQ) in B2B trade. Learn why factories set MOQs, how to calculate them, and proven negotiation strategies to lower them.',
    author: 'BulkSkart Editorial Team',
    date: '28 Sep 2026',
    readTime: '6 min',
    tag: 'Essential',
  },
  {
    slug: 'how-to-buy-products-in-bulk',
    category: 'Buyer Resources',
    title: 'How to Buy Products in Bulk Directly from Factories (2026)',
    excerpt: 'Complete step-by-step tutorial on buying wholesale products in bulk. Master RFQs, compare quotations, inspect goods, and secure trade payments.',
    author: 'BulkSkart Editorial Team',
    date: '20 Sep 2026',
    readTime: '8 min',
    tag: 'Popular',
  },
  {
    slug: 'manufacturer-vs-wholesaler',
    category: 'Trade Tips',
    title: 'Manufacturer vs Wholesaler: Which Sourcing Partner is Right for You?',
    excerpt: 'Compare manufacturers vs wholesale suppliers. Discover pricing differences, lead times, MOQ requirements, and how to choose the right partner on Bulkskart.',
    author: 'BulkSkart Editorial Team',
    date: '15 Sep 2026',
    readTime: '5 min',
    tag: null,
  },
  {
    slug: 'how-to-post-an-rfq',
    category: 'Trade Tips',
    title: 'How to Write an RFQ (Request for Quotation) That Gets 10+ Fast Quotes',
    excerpt: 'Master the art of writing a high-converting RFQ. Step-by-step template, critical fields, and tips to attract verified suppliers on Bulkskart.',
    author: 'BulkSkart Editorial Team',
    date: '10 Sep 2026',
    readTime: '6 min',
    tag: 'Guide',
  },
];

const TAG_COLORS: Record<string, string> = {
  Trending: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  Essential: 'bg-[#FF5A00]/10 text-[#FF5A00] border-[#FF5A00]/25',
  Popular: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Guide: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

export default function BlogPage() {
  const [selectedCat, setSelectedCat] = useState('All');

  const filteredPosts = selectedCat === 'All'
    ? POSTS
    : POSTS.filter(p => p.category === selectedCat);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PageMeta
        title="B2B Sourcing Guides & Global Trade Insights | Bulkskart Blog"
        description="Authoritative B2B trade guides, manufacturer discovery strategies, MOQ negotiation tips, and wholesale sourcing insights for global procurement professionals."
        canonical="https://www.bulkskart.com/blog"
        robots="index, follow"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Blog', item: '/blog' },
        ]}
      />

      <Header />

      {/* Breadcrumbs */}
      <div className="border-b border-border/60 bg-muted/20 py-2.5">
        <div className="max-w-4xl mx-auto px-4">
          <Breadcrumbs
            items={[
              { name: 'Blog & Sourcing Guides' },
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-muted/40 to-background py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="bg-[#FF5A00]/10 text-[#FF5A00] border border-[#FF5A00]/25 text-xs font-bold mb-3 uppercase tracking-wider">
            Trade Knowledge Hub
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight mb-3">
            B2B Sourcing Guides & Wholesale Insights
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Practical strategies on finding verified Indian manufacturers, negotiating MOQ terms, and scaling wholesale procurement.
          </p>
        </div>
      </section>

      {/* Category filter */}
      <div className="border-b border-border bg-card px-4 sticky top-14 z-10 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex gap-1.5 py-2.5 whitespace-nowrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                cat === selectedCat
                  ? 'bg-[#FF5A00] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      <section className="py-10 px-4 max-w-4xl mx-auto flex-1 w-full">
        <div className="grid grid-cols-1 gap-6">
          {filteredPosts.map((post, idx) => (
            <article
              key={post.slug}
              className="bg-card border border-border rounded-2xl p-5 md:p-6 hover:border-[#FF5A00]/50 transition-all duration-300 hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <Badge variant="outline" className="text-[10px] font-bold text-[#FF5A00] border-[#FF5A00]/30 uppercase tracking-wider">
                    {post.category}
                  </Badge>
                  {post.tag && (
                    <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${TAG_COLORS[post.tag] || 'bg-muted text-foreground'}`}>
                      {post.tag}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" /> {post.readTime} read
                  </span>
                </div>

                <Link to={`/blog/${post.slug}`}>
                  <h2 className="text-lg md:text-xl font-black text-foreground mb-2 leading-snug group-hover:text-[#FF5A00] transition-colors">
                    {post.title}
                  </h2>
                </Link>

                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-4">
                  {post.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{post.author}</span> • <span>{post.date}</span>
                </div>
                <Link to={`/blog/${post.slug}`}>
                  <Button size="sm" className="bg-[#FF5A00] hover:bg-[#e04e00] text-white text-xs font-bold gap-1 rounded-xl h-8 px-3">
                    <span>Read Guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
