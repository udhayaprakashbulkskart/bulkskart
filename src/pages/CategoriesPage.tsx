import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import PageMeta from '@/components/common/PageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, Factory, Package, ArrowRight, Layers, Cog, Shirt,
  FlaskConical, Sparkles, Building2, Globe, ShieldCheck, ChevronRight
} from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';

export interface CategoryCardData {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: any;
  heroImage: string;
  subcategories: string[];
}

export const ALL_CATEGORIES_DATA: CategoryCardData[] = [
  {
    id: 'textiles-apparel',
    name: 'Textiles & Knitted Fabrics',
    slug: 'textiles-apparel',
    description: 'Cotton yarns, woven fabrics, denim, silk rolls, garments, and industrial technical textiles.',
    icon: Shirt,
    heroImage: 'https://cdn.pixabay.com/photo/2019/03/25/04/43/weaving-4079366_1280.jpg',
    subcategories: ['Cotton Yarn', 'Denim Fabric', 'Knitted Garments', 'Silk & Rayon', 'Industrial Filter Cloth', 'Polyester Blends'],
  },
  {
    id: 'construction-building',
    name: 'Steel & Structural Metals',
    slug: 'construction-building',
    description: 'TMT rebar, structural beams, stainless steel pipes, sheets, billets, and construction hardware.',
    icon: Factory,
    heroImage: 'https://cdn.pixabay.com/photo/2016/11/29/09/32/welding-1868731_1280.jpg',
    subcategories: ['TMT Steel Bars', 'Hollow Sections', 'Stainless Steel Coils', 'Mild Steel Plates', 'Wire Rods', 'Pipes & Fittings'],
  },
  {
    id: 'machinery-industrial',
    name: 'Industrial Machinery & Equipment',
    slug: 'machinery-industrial',
    description: 'CNC machine tools, electric motors, centrifugal pumps, diesel generators, and hydraulic presses.',
    icon: Cog,
    heroImage: 'https://cdn.pixabay.com/photo/2016/09/12/07/48/mechanical-1663275_1280.jpg',
    subcategories: ['CNC Lathes', 'Electric Motors', 'Industrial Pumps', 'Air Compressors', 'Hydraulic Systems', 'Conveyor Belts'],
  },
  {
    id: 'chemicals-raw-materials',
    name: 'Polymers, Resins & Raw Materials',
    slug: 'chemicals-raw-materials',
    description: 'Virgin polymers, HDPE, LDPE granules, PVC compound, masterbatches, and synthetic rubber.',
    icon: Layers,
    heroImage: 'https://cdn.pixabay.com/photo/2017/10/04/21/01/turbine-engine-2817617_1280.jpg',
    subcategories: ['HDPE Granules', 'Polypropylene (PP)', 'PVC Resin', 'Color Masterbatches', 'Synthetic Rubber', 'Bio-Polymers'],
  },
  {
    id: 'chemicals-solvents',
    name: 'Chemicals, Reagents & Solvents',
    slug: 'chemicals-raw-materials',
    description: 'Bulk industrial solvents, specialty acids, pharmaceutical intermediates, and water treatment compounds.',
    icon: FlaskConical,
    heroImage: 'https://cdn.pixabay.com/photo/2014/12/10/20/56/laboratory-563423_1280.jpg',
    subcategories: ['Ethanol & Solvents', 'Sulfuric & Nitric Acids', 'Caustic Soda Flakes', 'Dyes & Pigments', 'Water Treatment', 'Agro Chemicals'],
  },
  {
    id: 'packaging-cartons',
    name: 'Corrugated Packaging & Containers',
    slug: 'packaging',
    description: '3-ply/5-ply corrugated cartons, kraft paper rolls, shipping crates, and flexible packaging pouches.',
    icon: Package,
    heroImage: 'https://cdn.pixabay.com/photo/2016/11/21/14/53/boxes-1845814_1280.jpg',
    subcategories: ['Corrugated Boxes', 'Kraft Paper Reels', 'Stretch Film Rolls', 'Printed Poly Pouches', 'Wooden Pallets', 'Bubble Wrap Rolls'],
  },
  {
    id: 'electronics-electricals',
    name: 'Electricals, Power & Electronics',
    slug: 'electronics-electrical',
    description: 'Copper cables, transformers, circuit breakers, solar inverters, and semiconductor modules.',
    icon: Sparkles,
    heroImage: 'https://cdn.pixabay.com/photo/2016/11/29/08/41/cable-1868478_1280.jpg',
    subcategories: ['Power Cables', 'Distribution Transformers', 'Solar PV Modules', 'Circuit Breakers', 'LED Industrial Lighting', 'Semiconductors'],
  },
  {
    id: 'agriculture-food',
    name: 'Agricultural Commodities & Bulk Food',
    slug: 'agriculture-food',
    description: 'Non-basmati and basmati rice, refined sugar, whole spices, edible oils, pulses, and animal feed.',
    icon: Globe,
    heroImage: 'https://cdn.pixabay.com/photo/2016/09/10/11/42/wheat-1659021_1280.jpg',
    subcategories: ['Basmati Rice', 'Refined Sugar', 'Turmeric & Spices', 'Edible Soybean Oil', 'Wheat & Maize', 'Coffee Beans'],
  },
];

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filteredCategories = ALL_CATEGORIES_DATA.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    cat.description.toLowerCase().includes(search.toLowerCase()) ||
    cat.subcategories.some(sub => sub.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <MainLayout>
      <PageMeta
        title="All B2B Product Categories & Industry Directory | BulkSkart"
        description="Explore all industrial bulk product categories on BulkSkart. Browse verified manufacturers, wholesale catalogs, raw materials, and machinery across India and globally."
        canonical="https://www.bulkskart.com/categories"
      />

      <div className="bg-[#0B0F19] min-h-screen text-slate-100 py-8 sm:py-12 px-3.5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Banner */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF5A00]/10 border border-[#FF5A00]/25 text-[#FF5A00] text-xs font-bold mb-3">
              <Sparkles className="w-4 h-4" />
              <span>Full B2B Taxonomy & Sourcing Directory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              All Industrial Categories
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl mx-auto">
              Source bulk commodities, machinery, structural metals, and chemical polymers directly from verified global manufacturing plants.
            </p>

            {/* Search Input */}
            <div className="relative max-w-xl mx-auto mt-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search categories, raw materials, or products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-4 py-3 bg-[#111726] border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:border-[#FF5A00] focus:ring-[#FF5A00]"
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  className="rounded-3xl bg-[#0F172A]/90 border border-slate-800 hover:border-[#FF5A00]/60 transition-all duration-300 overflow-hidden shadow-xl hover:-translate-y-1 group flex flex-col justify-between"
                >
                  {/* Category Image */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <img
                      src={cat.heroImage}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent" />
                    
                    {/* Floating Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center text-[#FF5A00]">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white group-hover:text-[#FF5A00] transition-colors">
                        {cat.name}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                        {cat.description}
                      </p>

                      {/* Subcategories Tags */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {cat.subcategories.map((sub) => (
                          <Link
                            key={sub}
                            to={`/products?q=${encodeURIComponent(sub)}`}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-[#FF5A00]/20 text-slate-300 hover:text-[#FF5A00] border border-slate-700/60 transition-colors"
                          >
                            {sub}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Action Links */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/manufacturers?industry=${encodeURIComponent(cat.name)}`)}
                        className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                      >
                        <Building2 className="w-3.5 h-3.5 mr-1 text-[#FF5A00]" />
                        Manufacturers
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => navigate(`/products?category=${cat.slug}`)}
                        className="text-xs bg-[#FF5A00] hover:bg-[#e04f00] text-white font-bold"
                      >
                        <span>Browse Catalog</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
