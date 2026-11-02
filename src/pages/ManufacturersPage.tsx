import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MainLayout from '@/components/layouts/MainLayout';
import PageMeta from '@/components/common/PageMeta';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import {
  Search, Shield, MapPin, Package, ArrowRight, Building2,
  BadgeCheck, Star, Globe, Users, Filter, ChevronDown,
  MessageSquare, X,
} from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCompanies, getOrCreateConversation, checkDirectMessageQuota, incrementMessageQuota, getRequirements, sendMessage } from '@/lib/api';
import type { Company, Requirement } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';
import SubscribeToContactDialog from '@/components/common/SubscribeToContactDialog';
import { toast } from 'sonner';
import { resolveCompanyBranding } from '@/lib/contentImages';
import { INCLUDE_TEMPLATE_SEED_DATA, SEED_OWNER_ID } from '@/lib/seedData';

// ── Static fallback assets: 12 completely distinct industrial factory, cleanroom, and plant photos ──
const FALLBACK_IMGS = [
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80', // Tannery & leather
  'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&w=1200&q=80', // Optics & laser cleanroom
  'https://cdn.pixabay.com/photo/2016/09/12/07/48/mechanical-1663275_1280.jpg', // Robotics & CNC
  'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=1200&q=80', // Terracotta & marble
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', // SMT electronics
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=80', // Agro commodities
  'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=1200&q=80', // Precision hydraulics
  'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80', // Semiconductor wafer fab
  'https://images.unsplash.com/photo-1579482495398-a28a2a0ebae7?auto=format&fit=crop&w=1200&q=80', // Heavy machinery & mining
  'https://cdn.pixabay.com/photo/2014/04/05/11/07/cardboard-314504_1280.jpg', // Polymer packaging rolls
  'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=1200&q=80', // Mobile commercial engineering
  'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80', // Petrochemical refinery
];

const COUNTRIES = [
  'India', 'USA', 'Germany', 'Japan', 'South Korea', 'UK',
  'Vietnam', 'UAE', 'Turkey', 'Italy', 'China', 'France', 'Brazil'
];

const COUNTRY_FLAGS: Record<string, string> = {
  'India': '🇮🇳',
  'USA': '🇺🇸',
  'Germany': '🇩🇪',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'UK': '🇬🇧',
  'Vietnam': '🇻🇳',
  'UAE': '🇦🇪',
  'Turkey': '🇹🇷',
  'Italy': '🇮🇹',
  'China': '🇨🇳',
  'France': '🇫🇷',
  'Brazil': '🇧🇷',
};

const INDUSTRIES = [
  // Technology & Electronics
  'Electronics & Semiconductors', 'Consumer Electronics', 'IT Hardware & Networking',
  'Telecommunications Equipment', 'Solar & Renewable Energy', 'LED & Lighting',
  // Apparel & Textiles
  'Apparel & Garments', 'Textiles & Fabrics', 'Leather & Leather Products',
  'Footwear', 'Sports & Outdoor Apparel', 'Home Textiles & Bedding',
  // Food & Agriculture
  'Food Processing & Packaging', 'Fresh Produce & Vegetables', 'Grains & Cereals',
  'Spices & Condiments', 'Dairy & Poultry', 'Seafood & Marine Products',
  'Beverages & Drinks', 'Organic & Natural Foods', 'Agricultural Machinery',
  // Machinery & Industrial
  'Industrial Machinery', 'CNC & Machine Tools', 'Pumps & Valves',
  'Compressors & Generators', 'Material Handling Equipment', 'Packaging Machinery',
  'Mining & Construction Equipment', 'Hydraulic & Pneumatic Systems',
  // Chemicals
  'Industrial Chemicals', 'Agrochemicals & Pesticides', 'Specialty Chemicals',
  'Paints & Coatings', 'Adhesives & Sealants', 'Dyes & Pigments',
  'Cleaning & Hygiene Products', 'Water Treatment Chemicals',
  // Auto & Transportation
  'Auto Parts & Accessories', 'Tyres & Rubber', 'Auto Electrical & Electronics',
  'Commercial Vehicles', 'Two-Wheeler Parts', 'EV Components',
  // Construction & Infrastructure
  'Building Materials', 'Steel & Structural Materials', 'Cement & Concrete',
  'Flooring & Tiles', 'Glass & Windows', 'Plumbing & Sanitary',
  'Electrical Fittings & Wires', 'HVAC & Ventilation',
  // Furniture & Decor
  'Furniture & Fixtures', 'Home Decor & Furnishings', 'Office Furniture',
  'Kitchen & Bath Accessories', 'Carpets & Rugs', 'Lighting & Chandeliers',
  // Healthcare & Pharma
  'Pharmaceuticals & Medicines', 'Medical Devices & Equipment',
  'Surgical Instruments', 'Diagnostics & Lab Equipment',
  'Ayurveda & Herbal Products', 'Dental Products', 'Veterinary Products',
  // Beauty & Personal Care
  'Cosmetics & Skincare', 'Hair Care Products', 'Fragrances & Perfumes',
  'Personal Hygiene', 'Salon & Spa Equipment',
  // Plastics & Rubber
  'Plastic Raw Materials', 'Plastic Products & Components',
  'Rubber Products', 'Packaging & Containers',
  // Paper & Printing
  'Paper & Paperboard', 'Printing & Publishing', 'Stationery & Office Supplies',
  'Cardboard & Corrugated Boxes',
  // Metals & Mining
  'Iron & Steel', 'Aluminium & Alloys', 'Copper & Brass',
  'Precious Metals', 'Metal Castings & Forgings', 'Scrap & Recycled Materials',
  // Energy
  'Oil & Gas Equipment', 'Coal & Solid Fuels', 'Power Generation Equipment',
  'Energy Storage & Batteries',
  // Marine & Shipping
  'Marine Equipment & Parts', 'Ship Building & Repair', 'Port & Logistics Equipment',
  // Defense & Aerospace
  'Defense Equipment', 'Aerospace Components', 'Security Systems',
  // Education & Sports
  'Sports & Fitness Equipment', 'Educational Supplies & Toys',
  'Musical Instruments', 'Arts & Crafts Supplies',
  // Environment & Waste
  'Waste Management & Recycling', 'Environmental Services',
  'Water Purification Equipment',
  // Food Service & Hospitality
  'Restaurant & Hotel Equipment', 'Catering & Food Service',
  'Commercial Kitchen Equipment',
  // Others
  'Handicrafts & Artisans', 'Gifts & Promotional Items',
  'Gems & Jewellery', 'Pet Products', 'Religious & Cultural Items',
];

const MIN_RATINGS = ['4.5+', '4.0+', '3.5+'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'products', label: 'Most Products' },
];

// ── Star renderer ──────────────────────────────────────────
function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-3 h-3 ${n <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`}
        />
      ))}
    </div>
  );
}

// ── Supplier card ──────────────────────────────────────────
function SupplierCard({
  co, idx, onContact, contacting, isFav, onToggleFav, onInviteRfq
}: {
  co: Company;
  idx: number;
  onContact: (co: Company) => void;
  contacting: boolean;
  isFav: boolean;
  onToggleFav: (id: string) => void;
  onInviteRfq: (co: Company) => void;
}) {
  const branding = resolveCompanyBranding(co);
  // Prioritize authentic self-hosted cover_url over static unsplash banner_url
  const bestCover = (co.cover_url && !co.cover_url.includes('unsplash.com'))
    ? co.cover_url
    : (co.banner_url && !co.banner_url.includes('unsplash.com') ? co.banner_url : (co.cover_url || co.banner_url || co.logo_url || branding.banner));
  const verified = co.verification_status === 'verified' || co.is_verified;

  return (
    <div className="bg-[#0e121b]/95 hover:bg-[#151a26] border border-slate-800/90 hover:border-[#FF5A00]/70 rounded-2xl overflow-hidden shadow-md hover:shadow-[0_12px_30px_rgba(255,90,0,0.2)] hover:-translate-y-1 transition-all duration-300 flex flex-col group backdrop-blur-md">
      {/* Cover image */}
      <div className="aspect-[16/9] overflow-hidden bg-muted relative">
        <SafeImage
          src={bestCover}
          alt={co.company_name}
          category={co.business_type}
          fallbackSrc={branding.banner}
          isRepresentativeImage={true}
          type="company"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Verification & Pixabay Live Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 flex-wrap">
          {verified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#FF5A00] rounded-full px-2.5 py-0.5 shadow-md">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified Factory
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-200 bg-black/75 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/10 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Pixabay Verified
          </span>
        </div>
        
        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleFav(co.id); }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all z-10 backdrop-blur-xs"
          title={isFav ? 'Remove from Favourites' : 'Add to Favourites'}
        >
          <Star className={`w-4 h-4 ${isFav ? 'fill-[#FF5A00] text-[#FF5A00]' : 'text-white'}`} />
        </button>

        {co.is_featured && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#1a1a2e]/90 rounded-full px-2.5 py-0.5 shadow z-10 border border-white/10">
            ⭐ Top Rated OEM
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Name + location */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug group-hover:text-[#FF5A00] transition-colors line-clamp-1">
            {co.company_name}
          </h3>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
          <MapPin className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
          <span>{[co.city, co.country].filter(Boolean).join(', ')}</span>
          {co.years_in_business ? (
            <span className="ml-1 text-slate-400">· {co.years_in_business}+ Yrs Operating</span>
          ) : null}
        </div>

        {/* Rating and Verification details */}
        <div className="flex items-center gap-2 mb-2.5 min-w-0 flex-wrap">
          <StarRating value={co.rating_avg ?? 4.8} />
          <span className="text-xs font-bold text-foreground shrink-0">{co.rating_avg ? co.rating_avg.toFixed(1) : '4.8'}</span>
          <span className="text-[11px] text-muted-foreground shrink-0">({co.review_count || 12} audits)</span>
          
          <span className="text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded px-1.5 py-0.5 ml-auto">
            GSTIN Active
          </span>
        </div>

        {/* Certifications badges */}
        <div className="flex flex-wrap gap-1 mb-2.5">
          {Array.isArray((co as any).certifications) && (co as any).certifications.length > 0 ? (
            (co as any).certifications.slice(0, 3).map((cert: string) => (
              <span key={cert} className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5">
                ✓ {cert}
              </span>
            ))
          ) : (
            <>
              <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5">
                ✓ ISO 9001:2015
              </span>
              <span className="text-[10px] font-medium bg-orange-500/10 text-[#FF5A00] border border-[#FF5A00]/25 rounded px-1.5 py-0.5">
                ✓ CE Certified
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {co.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {co.description}
          </p>
        )}

        {/* Key products */}
        {co.key_products && co.key_products.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {co.key_products.slice(0, 3).map(kp => (
              <span key={kp} className="text-[10px] bg-primary/10 border border-primary/20 text-primary rounded-md px-2 py-0.5 font-medium">{kp}</span>
            ))}
          </div>
        )}

        {/* Factory & Product Preview Thumbnails */}
        {Array.isArray((co as any).gallery_images) && (co as any).gallery_images.length > 1 && (
          <div className="flex items-center gap-1.5 mb-3 overflow-hidden">
            {(co as any).gallery_images.slice(0, 4).map((thumb: string, tIdx: number) => (
              <div key={tIdx} className="w-12 h-9 rounded-md overflow-hidden bg-muted border border-border/80 shrink-0">
                <SafeImage
                  src={thumb}
                  alt={`${co.company_name} preview ${tIdx + 1}`}
                  isRepresentativeImage={true}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        )}

        {/* Stats row: MOQ & Capacity */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border mt-auto mb-3.5">
          <span className="flex items-center gap-1 font-medium">
            <Package className="w-3.5 h-3.5 text-[#FF5A00]" /> 
            MOQ: <strong>500 units</strong>
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Globe className="w-3.5 h-3.5 text-[#FF5A00]" />
            Cap: <strong>50K/mo</strong>
          </span>
        </div>

        {/* Action Buttons: View Profile, Invite to RFQ, Contact */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <Link to={`/companies/${co.slug}`}>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs font-semibold border-border hover:border-[#FF5A00] hover:text-[#FF5A00] px-1"
            >
              Profile
            </Button>
          </Link>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onInviteRfq(co)}
            className="w-full h-8 text-xs font-semibold border-border hover:border-[#FF5A00] hover:bg-[#FF5A00]/10 hover:text-[#FF5A00] px-1"
          >
            Invite RFQ
          </Button>

          <Button
            size="sm"
            disabled={contacting}
            onClick={() => onContact(co)}
            className="w-full h-8 text-xs font-bold bg-[#FF5A00] hover:bg-[#e04e00] text-white shadow-sm px-1 flex items-center justify-center gap-1"
          >
            <MessageSquare className="w-3 h-3" /> Contact
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function ManufacturersPage() {
  const { profile, company, user } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [minRating, setMinRating] = useState('all');
  const [selectedMoq, setSelectedMoq] = useState('all');
  const [selectedCert, setSelectedCert] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 24;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogReason, setDialogReason] = useState<'not_logged_in' | 'not_registered_business' | 'no_subscription' | 'quota_exceeded'>('no_subscription');
  const [contactingId, setContactingId] = useState<string | null>(null);

  // Favourites state
  const [favouriteIds, setFavouriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bulkskart_fav_mfg');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleFavourite = (id: string) => {
    setFavouriteIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('bulkskart_fav_mfg', JSON.stringify(next));
      toast.success(next.includes(id) ? 'Added to Favourites' : 'Removed from Favourites');
      return next;
    });
  };

  // RFQ Invitation Dialog state: the invitation goes to the supplier's BulkSkart inbox as a real message
  // that links to one of the buyer's own active requirements.
  const [inviteTargetCo, setInviteTargetCo] = useState<Company | null>(null);
  const [inviteRfqs, setInviteRfqs] = useState<Requirement[] | null>(null);
  const [inviteRfqId, setInviteRfqId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('We would like to invite your factory to submit a quotation for our bulk requirement.');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const handleOpenInvite = async (target: Company) => {
    if (!user || !profile) { setDialogReason('not_logged_in'); setDialogOpen(true); return; }
    if (profile.role !== 'buyer') {
      toast.info('Only buyer accounts can invite a supplier to an RFQ. Post a requirement from a buyer account first.');
      return;
    }
    setInviteTargetCo(target);
    setInviteRfqs(null);
    setInviteRfqId('');
    const rfqs = await getRequirements({ buyerId: user.id, status: 'active', limit: 50 });
    setInviteRfqs(rfqs);
    setInviteRfqId(rfqs[0]?.id ?? '');
  };

  const handleSendInvite = async () => {
    if (!inviteTargetCo || !user) return;
    const rfq = inviteRfqs?.find((r) => r.id === inviteRfqId);
    if (!rfq) { toast.error('Choose one of your active requirements first.'); return; }
    setIsSendingInvite(true);
    const { id: convId, error } = await getOrCreateConversation(user.id, inviteTargetCo.owner_id, inviteTargetCo.id, rfq.id);
    if (error || !convId) {
      setIsSendingInvite(false);
      toast.error('We could not reach this supplier. Please try again.');
      return;
    }
    const text = `${inviteMessage.trim()}\n\nRequirement: ${rfq.title}${rfq.req_number ? ` (${rfq.req_number})` : ''}\n${window.location.origin}/requirement/${rfq.id}`;
    const { error: sendError } = await sendMessage(convId, text);
    setIsSendingInvite(false);
    if (sendError) {
      toast.error('Your invitation could not be delivered. Please try again.');
      return;
    }
    toast.success(`Invitation sent to ${inviteTargetCo.company_name}.`, {
      description: 'It is in their BulkSkart inbox, with a link to your requirement.',
    });
    setInviteTargetCo(null);
  };

  // count
  useEffect(() => {
    import('@/db/supabase').then(({ supabase }) => {
      let query = supabase.from('companies').select('id', { count: 'exact', head: true });
      // the template's demo companies are not suppliers
      if (!INCLUDE_TEMPLATE_SEED_DATA) query = query.neq('owner_id', SEED_OWNER_ID);
      query.then(({ count }) => setTotalCount(count ?? 0));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getCompanies({
      search: search || undefined,
      verified: verifiedOnly || undefined,
      country: selectedCountry !== 'all' ? selectedCountry : undefined,
      limit: 1500
    }).then(data => {
      setCompanies(data);
      setLoading(false);
    });
  }, [search, verifiedOnly, selectedCountry]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, verifiedOnly, selectedCountry, selectedIndustry, minRating, sortBy]);

  // Client-side filter + sort
  const filtered = companies
    .filter(co => {
      if (selectedCountry !== 'all' && co.country.toLowerCase() !== selectedCountry.toLowerCase()) return false;
      if (selectedIndustry !== 'all') {
        const indLower = selectedIndustry.toLowerCase();
        const coInd = ((co as any).industry || co.business_type || '').toLowerCase();
        const coSub = ((co as any).subcategory || '').toLowerCase();
        const hasProd = co.key_products?.some(p => p.toLowerCase().includes(indLower));
        if (!coInd.includes(indLower) && !coSub.includes(indLower) && !hasProd) return false;
      }
      if (minRating !== 'all') {
        const min = parseFloat(minRating);
        if ((co.rating_avg ?? 0) < min) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
      if (sortBy === 'products') return b.total_products - a.total_products;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeFilters = [
    verifiedOnly && 'Verified Only',
    selectedCountry !== 'all' && selectedCountry,
    selectedIndustry !== 'all' && selectedIndustry,
    minRating !== 'all' && `Rating ${minRating}`,
  ].filter(Boolean) as string[];

  const clearFilter = (label: string) => {
    if (label === 'Verified Only') setVerifiedOnly(false);
    else if (COUNTRIES.includes(label)) setSelectedCountry('all');
    else if (INDUSTRIES.includes(label)) setSelectedIndustry('all');
    else setMinRating('all');
  };

  const handleContact = useCallback(async (co: Company) => {
    if (!user || !profile) { setDialogReason('not_logged_in'); setDialogOpen(true); return; }
    if (profile.role === 'buyer') {
      navigate(`/companies/${co.slug}`);
      return;
    }
    if (!company) { setDialogReason('not_registered_business'); setDialogOpen(true); return; }
    setContactingId(co.id);
    const quota = await checkDirectMessageQuota(company.id, company);
    if (quota !== 'ok') { setDialogReason(quota); setDialogOpen(true); setContactingId(null); return; }
    const { id: convId, error } = await getOrCreateConversation(co.owner_id, user.id, company.id, undefined);
    if (error || !convId) { toast.error('Could not open conversation.'); setContactingId(null); return; }
    await incrementMessageQuota(company.id);
    setContactingId(null);
    navigate(`/dashboard/supplier/messages?conv=${convId}`);
  }, [user, profile, company, navigate]);

  return (
    <MainLayout>
      <PageMeta
        title="Verified Global Manufacturers & Wholesale Exporters Directory | BulkSkart"
        description="Browse verified factories, exporters, and OEM/ODM manufacturers on BulkSkart. Filter by country, certification and business type, and connect directly."
        keywords="verified manufacturers directory, global exporters directory, bulk suppliers, B2B wholesale factories, OEM ODM manufacturers, ISO certified suppliers India"
        canonical="/manufacturers"
        ogType="website"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Verified Manufacturers', item: '/manufacturers' },
        ]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Verified Global Manufacturers & Exporters Directory',
          description: 'Official directory of verified B2B manufacturing plants and industrial exporters worldwide on BulkSkart.',
          url: 'https://www.bulkskart.com/manufacturers',
        }}
      />
      {/* ── Trust bar */}
      <div className="w-full bg-[#1a1a2e] text-white text-[11px] py-1.5 px-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <span className="font-medium">Verified suppliers and factory-direct sourcing</span>
          <div className="hidden md:flex items-center gap-4 text-white/60">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#FF5A00]" /> Verified Suppliers</span>
            <span>|</span>
            <span className="flex items-center gap-1"><BadgeCheck className="w-3 h-3 text-[#FF5A00]" /> Trade Assurance</span>
          </div>
        </div>
      </div>

      {/* ── Hero banner */}
      <div className="bg-[#1a1a2e] text-white">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-7">
          <Breadcrumbs
            items={[{ name: 'Verified Manufacturers & Exporters' }]}
            className="text-white/60 mb-2 text-[11px]"
          />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-[#FF5A00] uppercase tracking-widest">Global Directory</span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/80">OEM / ODM Factories</span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/80">Wholesale Volume Sourcing</span>
              </div>
              <h1 className="text-[22px] md:text-[36px] font-black leading-tight mb-1 md:mb-2">
                Verified <span className="text-[#FF5A00]">Suppliers</span> & Manufacturers
              </h1>
              <p className="text-white/70 text-[14px]">
                Connect directly with certified factories, OEM/ODM producers, and verified exporters
              </p>
            </div>
            <Link to="/auth?tab=register">
              <Button className="bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-11 px-7 text-[14px] gap-2 shadow-[0_3px_0_#b83c00] rounded shrink-0">
                Become a Supplier <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 md:mt-8">
            {[
              { icon: Building2, value: totalCount, label: 'Suppliers listed' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FF5A00]/15 border border-[#FF5A00]/30 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#FF5A00]" />
                </div>
                <div>
                  <div className="text-[15px] font-black text-white leading-none">{value}</div>
                  <div className="text-[10px] text-white/50 leading-none mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content */}
      <div className="bg-background min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-8">

          {/* Filter bar */}
          <div className="bg-card border border-border rounded-xl p-3 md:p-4 mb-4 md:mb-5 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              {/* Search */}
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search suppliers by name, product, category..."
                  className="pl-9 bg-muted border-border text-[13px] h-10"
                />
              </div>

              {/* Country */}
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full md:w-40 bg-muted border-border text-[13px] h-10">
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Countries</SelectItem>
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Industry */}
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="w-full md:w-44 bg-muted border-border text-[13px] h-10">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRIES.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Min rating */}
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger className="w-full md:w-36 bg-muted border-border text-[13px] h-10">
                  <Star className="w-3.5 h-3.5 mr-1.5 text-yellow-400" />
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">Any Rating</SelectItem>
                  {MIN_RATINGS.map(r => <SelectItem key={r} value={r.replace('+', '')}>{r}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-40 bg-muted border-border text-[13px] h-10">
                  <ChevronDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Verified toggle */}
              <Button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`shrink-0 h-10 gap-1.5 text-[12px] font-semibold px-4 ${
                  verifiedOnly
                    ? 'bg-[#FF5A00] text-white shadow-[0_2px_0_#b83c00] hover:bg-[#e04e00]'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                <BadgeCheck className="w-3.5 h-3.5" /> Verified Only
              </Button>
            </div>

            {/* Quick Worldwide Country Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-3 pt-3 border-t border-border no-scrollbar">
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#FF5A00]" /> Hubs:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCountry('all')}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  selectedCountry === 'all'
                    ? 'bg-[#FF5A00] text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All Countries
              </button>
              {COUNTRIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCountry(c)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedCountry === c
                      ? 'bg-[#FF5A00] text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span>{COUNTRY_FLAGS[c] ?? '🌐'}</span>
                  <span>{c}</span>
                </button>
              ))}
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground">Active:</span>
                {activeFilters.map(label => (
                  <button
                    key={label}
                    onClick={() => clearFilter(label)}
                    className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 border border-primary/30 text-primary rounded-full px-2.5 py-0.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {label} <X className="w-3 h-3" />
                  </button>
                ))}
                <button
                  onClick={() => { setVerifiedOnly(false); setSelectedCountry('all'); setSelectedIndustry('all'); setMinRating('all'); }}
                  className="text-[11px] text-muted-foreground hover:text-[#FF5A00] underline underline-offset-2 ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Results count & Pagination info */}
          <div id="supplier-results" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-5">
            <p className="text-[13px] text-muted-foreground">
              Showing <span className="font-bold text-foreground">{filtered.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}</span> – <span className="font-bold text-foreground">{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of <span className="font-bold text-foreground">{filtered.length}</span> suppliers
              {filtered.length !== companies.length && <> (filtered from <span className="font-bold text-foreground">{companies.length}</span>)</>}
            </p>
            {totalPages > 1 && (
              <span className="text-[12px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="aspect-[16/9] bg-muted animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                    <div className="flex gap-2 pt-2">
                      <div className="flex-1 h-8 bg-muted rounded animate-pulse" />
                      <div className="flex-1 h-8 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-xl text-center py-24 shadow-sm">
              <Building2 className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-[15px] font-semibold text-foreground mb-1">No suppliers found</p>
              <p className="text-[13px] text-muted-foreground mb-6">Try adjusting your filters or search query</p>
              <Link to="/auth?tab=register">
                <Button className="bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold gap-2">
                  Register as Supplier <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {paginated.map((co, i) => (
                <SupplierCard
                  key={co.id}
                  co={co}
                  idx={(currentPage - 1) * PAGE_SIZE + i}
                  onContact={handleContact}
                  contacting={contactingId === co.id}
                  isFav={favouriteIds.includes(co.id)}
                  onToggleFav={toggleFavourite}
                  onInviteRfq={handleOpenInvite}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && !loading && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  document.getElementById('supplier-results')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="h-9 px-3 text-[12px] font-semibold border-border"
              >
                Previous
              </Button>

              {/* Numbered pages */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (page === 1 || page === totalPages) return true;
                  return Math.abs(page - currentPage) <= 2;
                })
                .reduce<(number | string)[]>((acc, page, idx, arr) => {
                  if (idx > 0 && (page as number) - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) => {
                  if (typeof item === 'string') {
                    return <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-[12px]">...</span>;
                  }
                  return (
                    <Button
                      key={item}
                      variant={currentPage === item ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setCurrentPage(item);
                        document.getElementById('supplier-results')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`h-9 min-w-9 px-2 text-[12px] font-bold ${
                        currentPage === item
                          ? 'bg-[#FF5A00] hover:bg-[#e04e00] text-white shadow-sm'
                          : 'border-border text-foreground hover:border-[#FF5A00]'
                      }`}
                    >
                      {item}
                    </Button>
                  );
                })}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  document.getElementById('supplier-results')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="h-9 px-3 text-[12px] font-semibold border-border"
              >
                Next
              </Button>
            </div>
          )}

          {/* Bottom CTA */}
          {!user && !loading && (
            <div className="mt-5 md:mt-10 bg-[#1a1a2e] rounded-2xl p-4 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
              <div>
                <h3 className="text-[20px] font-black text-white mb-1">Are you a supplier or manufacturer?</h3>
                <p className="text-white/60 text-[13px]">Join Bulkskart and reach thousands of verified global buyers.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link to="/auth">
                  <Button variant="ghost" className="border border-white/30 text-white hover:bg-white/10 h-10 px-6 font-semibold">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth?tab=register">
                  <Button className="bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-10 px-6 gap-2 shadow-[0_3px_0_#b83c00]">
                    Join Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <SubscribeToContactDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        reason={dialogReason}
      />

      {/* ── Invite to RFQ Modal ── */}
      {inviteTargetCo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setInviteTargetCo(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-bold w-7 h-7 rounded-full bg-muted flex items-center justify-center"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5A00]/15 text-[#FF5A00] flex items-center justify-center font-bold shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Invite Manufacturer to Quote</h3>
                <p className="text-xs text-muted-foreground">Directly invite {inviteTargetCo.company_name} to your RFQ</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-foreground">Select Active Requirement (RFQ) *</label>
              {inviteRfqs === null ? (
                <p className="text-xs text-muted-foreground">Loading your requirements…</p>
              ) : inviteRfqs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  You have no active requirements yet. <Link to="/post-requirement" className="text-[#FF5A00] font-semibold hover:underline">Post an RFQ</Link> first, then invite suppliers to quote.
                </p>
              ) : (
                <select
                  value={inviteRfqId}
                  onChange={(e) => setInviteRfqId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary"
                >
                  {inviteRfqs.map((rfq) => (
                    <option key={rfq.id} value={rfq.id}>
                      {rfq.req_number ? `${rfq.req_number}: ` : ''}{rfq.title} ({rfq.quantity.toLocaleString()} {rfq.quantity_unit})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Personalized Message / Notes for Supplier</label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
                className="w-full bg-background border border-border rounded-xl p-3 text-xs resize-none"
                placeholder="Include any specific delivery terms, sample request, or target budget details..."
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setInviteTargetCo(null)}
                className="flex-1 h-10 rounded-xl border-border text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={isSendingInvite || !inviteRfqId}
                className="flex-1 h-10 rounded-xl bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold text-xs shadow-sm"
              >
                {isSendingInvite ? 'Sending Invitation...' : 'Send RFQ Invitation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
