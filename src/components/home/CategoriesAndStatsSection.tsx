import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '@/components/home/SectionHeader';
import {
  Layers, Package, Factory, Cog, FlaskConical, Shirt,
  ChevronRight, ArrowRight
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBadgeStyle: string;
  query: string;
  categorySlug: string;
  img: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-textiles',
    name: 'Textiles & Knitted Fabrics',
    description: 'Fabrics, yarns, woven rolls, cotton and apparel',
    icon: Shirt,
    iconBadgeStyle: 'bg-[#221612] border-[#FF5A00]/40 text-[#FF5A00]',
    query: 'textiles fabric cotton',
    categorySlug: 'textiles-apparel',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b2662490-e089-46e1-9fab-c6fb86d378a0.jpg',
  },
  {
    id: 'cat-steel',
    name: 'Steel & Structural Metals',
    description: 'Steel beams, pipes, hollow tubes, rebar and structures',
    icon: Factory,
    iconBadgeStyle: 'bg-[#1b1c25] border-orange-500/40 text-orange-400',
    query: 'steel pipe rebar',
    categorySlug: 'construction-building',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_54c924bf-b297-4865-bab0-5a1ff17d5d1d.jpg',
  },
  {
    id: 'cat-machinery',
    name: 'Industrial Machinery & Equipment',
    description: 'Electric motors, industrial pumps, machinery & tools',
    icon: Cog,
    iconBadgeStyle: 'bg-[#221a12] border-amber-500/40 text-amber-400',
    query: 'machinery generator motor',
    categorySlug: 'machinery-industrial',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_a32b8102-74a7-48dd-90fe-2dda0bf1ff43.jpg',
  },
  {
    id: 'cat-polymers',
    name: 'Polymers & Plastic Raw Materials',
    description: 'Virgin polymers, resins, HDPE, LDPE and plastic pellets',
    icon: Layers,
    iconBadgeStyle: 'bg-[#1c142c] border-purple-500/40 text-purple-400',
    query: 'plastic granules hdpe',
    categorySlug: 'chemicals-raw-materials',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5b6610fe-9767-454b-8aba-d2c002b0de04.jpg',
  },
  {
    id: 'cat-chemicals',
    name: 'Chemicals & Solvents',
    description: 'Industrial solvents, reagents, acids and specialty chemicals',
    icon: FlaskConical,
    iconBadgeStyle: 'bg-[#101e28] border-cyan-500/40 text-cyan-400',
    query: 'chemical industrial',
    categorySlug: 'chemicals-raw-materials',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c9e63855-7bd4-49c5-8a93-a95bc5a59714.jpg',
  },
  {
    id: 'cat-packaging',
    name: 'Corrugated Packaging',
    description: 'Kraft boxes, corrugated cartons, shipping crates & rolls',
    icon: Package,
    iconBadgeStyle: 'bg-[#241810] border-orange-500/40 text-orange-400',
    query: 'packaging box carton',
    categorySlug: 'packaging',
    img: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_c28a0ced-2f8b-4e2c-bdd1-300fa581dc34.jpg',
  },
];

export default function CategoriesAndStatsSection() {
  return (
    <section className="relative z-20 max-w-[1400px] mx-auto w-full px-4 sm:px-5 md:px-6 pt-3 sm:pt-4 mb-6 sm:mb-10 overflow-hidden rounded-3xl scroll-mt-20">
      
      {/* ── Ambient Industrial Port Background (Top-Right) matching Image 2 ── */}
      <div className="absolute right-0 top-0 w-full sm:w-[58%] md:w-[48%] h-[200px] sm:h-[260px] pointer-events-none select-none overflow-hidden z-0 opacity-80 sm:opacity-90">
        <img
          src="https://miaoda-site-img.s3cdn.medo.dev/images/KLing_8968ecea-7c21-468b-a30c-31275c92e5cc.jpg"
          alt="Industrial Sourcing Port & Container Shipping"
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
        {/* Gradients blending into the dark section background */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080C14] via-[#080C14]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080C14] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080C14]/70 via-transparent to-transparent" />
      </div>

      {/* ── Section Header ── */}
      <div className="relative z-10 mb-3 pt-1 sm:mb-4">
        <SectionHeader
          tone="dark"
          eyebrow="Core industrial taxonomy"
          title={
            <>
              Explore Bulk Product <span className="text-primary">Categories</span>
            </>
          }
          subtitle="Source directly from verified manufacturers across multiple industries"
          action={
            <Link
              to="/categories"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF5A00] to-[#FF4500] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#FF5A00]/25 transition-all hover:from-[#ff6b1a] hover:to-[#e04500] hover:shadow-[#FF5A00]/40 active:scale-95 sm:px-5 sm:text-sm"
            >
              <span>View All Categories</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      </div>

      {/* ── 2-Column Mobile Grid & 3-Column Desktop Grid matching Image 2 ── */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 lg:gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              to={`/products?category=${cat.categorySlug}`}
              className="relative overflow-hidden rounded-2xl bg-[#0c121e]/90 hover:bg-[#101726] border border-slate-800/90 hover:border-slate-700/90 transition-all duration-300 flex flex-col justify-between group p-3 sm:p-3.5 shadow-lg hover:-translate-y-0.5 active:scale-[0.98] min-h-[120px] sm:min-h-[135px] md:min-h-[145px]"
            >
              {/* Category Icon Badge (Top-Left) */}
              <div className="relative z-10 flex items-center justify-between w-full mb-1.5 sm:mb-2">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border ${cat.iconBadgeStyle} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner`}>
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              </div>

              {/* Title & Product Count (Left Side, Full Text without truncation) */}
              <div className="relative z-10 pt-1 flex-1 flex flex-col justify-end max-w-[62%] sm:max-w-[65%]">
                <h3 className="font-extrabold text-white text-xs sm:text-[13.5px] md:text-sm leading-tight group-hover:text-[#FF5A00] transition-colors break-words">
                  {cat.name}
                </h3>
              </div>

              {/* Authentic Commodity Photography (Right Half) seamlessly blending into card */}
              <div className="absolute right-0 top-0 bottom-0 w-[52%] sm:w-[50%] pointer-events-none overflow-hidden rounded-r-2xl">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                />
                {/* Seamless ambient blend gradients */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0c121e] via-[#0c121e]/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c121e]/60 via-transparent to-transparent" />
              </div>

              {/* Circular Chevron Button (Floating over Right Side) matching Image 2 */}
              <div className="absolute right-2.5 sm:right-3 bottom-2.5 sm:bottom-3 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-900/80 border border-slate-700/80 text-white group-hover:bg-[#FF5A00] group-hover:border-[#FF5A00] flex items-center justify-center shrink-0 transition-all shadow-md group-hover:scale-105">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

    </section>
  );
}
