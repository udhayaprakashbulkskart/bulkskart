import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, MapPin, Building2, Calendar, Star, Phone, Briefcase, IndianRupee } from 'lucide-react';
import ProtectedContact from '@/components/common/ProtectedContact';

/** The part of a company record this pop-up shows. Everything on it comes from the database. */
export interface BidderCompany {
  id: string;
  company_name: string;
  business_type?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  verification_status?: string | null;
  created_at?: string | null;
  rating_avg?: number | null;
  contact_phone?: string | null;
  annual_turnover?: string | null;
}

interface BidderProfileModalProps {
  /** The name the bid or chat message was recorded under. */
  bidderName: string | null;
  /** The matching company record, when the bid or listing is linked to one. */
  company?: BidderCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPostOwner?: boolean;
}

function memberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function BidderProfileModal({
  bidderName,
  company = null,
  open,
  onOpenChange,
  isPostOwner = false
}: BidderProfileModalProps) {
  if (!bidderName) return null;

  const displayName = company?.company_name || bidderName.replace(/\s*\((You|Your Active Bid)\)/gi, '').trim();
  const verified = company?.verification_status === 'verified';
  const location = [company?.city, company?.state, company?.country].filter(Boolean).join(', ');
  const since = memberSince(company?.created_at);
  const rating = company?.rating_avg && company.rating_avg > 0 ? company.rating_avg : null;

  const rows: Array<{ key: string; icon: React.ReactNode; label: string; value: React.ReactNode }> = [];
  if (location) rows.push({ key: 'location', icon: <MapPin className="w-4 h-4 text-[#FF5A1F]" />, label: 'Location:', value: location });
  if (company?.business_type) rows.push({ key: 'type', icon: <Briefcase className="w-4 h-4 text-[#FF5A1F]" />, label: 'Business type:', value: company.business_type });
  if (company?.annual_turnover) rows.push({ key: 'turnover', icon: <IndianRupee className="w-4 h-4 text-[#FF5A1F]" />, label: 'Annual turnover:', value: company.annual_turnover });
  if (since) rows.push({ key: 'since', icon: <Calendar className="w-4 h-4 text-[#FF5A1F]" />, label: 'Member on BulkSkart:', value: since });
  if (rating) rows.push({ key: 'rating', icon: <Star className="w-4 h-4 text-[#FF5A1F]" />, label: 'Rating:', value: `${rating.toFixed(1)} / 5` });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg p-0 overflow-hidden rounded-3xl border border-border">
        <DialogHeader className="sr-only">
          <DialogTitle>{displayName}</DialogTitle>
          <DialogDescription>Details BulkSkart holds about this bidder</DialogDescription>
        </DialogHeader>

        <div className="bg-gradient-to-r from-zinc-900 via-slate-900 to-black text-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5A1F] text-white font-bold text-lg flex items-center justify-center shadow-lg shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">{displayName}</h3>
                {verified && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-1.5 py-0">
                    <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified on BulkSkart
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-2.5 text-xs">
          {rows.map((row) => (
            <div key={row.key} className="p-3 rounded-2xl bg-muted/20 border border-border/50 flex items-center justify-between gap-3">
              <span className="text-muted-foreground flex items-center gap-2 shrink-0">{row.icon} {row.label}</span>
              <span className={`font-bold text-foreground text-right ${row.key === 'type' ? 'capitalize' : ''}`}>{row.value}</span>
            </div>
          ))}

          {company?.contact_phone && (
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/50 flex items-center justify-between gap-3">
              <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                <Phone className="w-4 h-4 text-[#FF5A1F]" /> Bidding contact:
              </span>
              <ProtectedContact
                phone={company.contact_phone}
                contactType="bidder"
                variant="inline"
                showActions={true}
                isPostOwner={isPostOwner}
              />
            </div>
          )}

          {!company && (
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/50 flex items-start gap-2 text-muted-foreground">
              <Building2 className="w-4 h-4 text-[#FF5A1F] shrink-0 mt-0.5" />
              <span>BulkSkart has no further details on file for this bidder.</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-muted/20 border-t border-border flex justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-[#FF5A1F] hover:bg-[#e04f1a] text-white text-xs font-semibold px-5"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
