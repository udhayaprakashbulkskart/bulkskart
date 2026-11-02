import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Lock, MessageSquare, ShieldCheck, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProtectedContactProps {
  /** Phone number to protect (buyer contact, bidder phone, etc.) */
  phone?: string | null;
  /** Contact person name if available */
  name?: string | null;
  /** Email address (optional) */
  email?: string | null;
  /** Country code or context (e.g. 'India') */
  country?: string | null;
  /** Context description for the prompt (e.g. 'buyer contact number', 'bidding contact number') */
  contactType?: 'buyer' | 'bidder' | 'inquiry' | 'general';
  /** Show call and WhatsApp buttons when unlocked */
  showActions?: boolean;
  /** Compact inline display or card display */
  variant?: 'inline' | 'pill' | 'card';
  /** Extra CSS class */
  className?: string;
  /** Is the current viewing user the post owner (creator of the auction / RFQ)? */
  isPostOwner?: boolean;
  /**
   * When true, any paid supplier (manufacturer) can unlock this contact —
   * used on RFQ Leads where the supplier is matching buyer requirements (not the post owner).
   */
  allowPaidSupplierUnlock?: boolean;
  /**
   * Stable ID (requirement / auction / lead id) so each locked card gets a unique
   * country code + masked phone when the real number is hidden or missing.
   */
  seed?: string | null;
}

/** "+91 98201 88921" becomes "+91 ••••• •••••": the dial code stays, the number does not. */
function maskPhone(raw: string): string {
  const trimmed = raw.trim();
  const dial = trimmed.match(/^\+\d{1,3}/)?.[0] ?? '';
  return `${dial}${trimmed.slice(dial.length).replace(/\d/g, '•')}`;
}

export default function ProtectedContact({
  phone,
  name,
  email,
  country = 'India',
  contactType = 'buyer',
  showActions = true,
  variant = 'inline',
  className = '',
  isPostOwner = false,
  allowPaidSupplierUnlock = false,
}: ProtectedContactProps) {
  const { user, profile, isPaidSubscriber } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [nonOwnerModalOpen, setNonOwnerModalOpen] = useState(false);

  // Only a number that exists in the database is ever shown. Nothing is generated.
  const displayPhone = (phone && String(phone).trim()) || '';
  const cleanDigits = displayPhone.replace(/\D/g, '');
  const maskedDisplay = maskPhone(displayPhone);

  // Access:
  // - Post owner with paid sub can always unlock
  // - Paid suppliers can unlock RFQ buyer contacts when allowPaidSupplierUnlock
  // - Unpaid manufacturers see subscribe CTA
  const isSupplier = profile?.role === 'supplier' || profile?.role === 'admin';
  const canUnlockAsPaidSupplier = Boolean(allowPaidSupplierUnlock && isSupplier && isPaidSubscriber);
  const canView = Boolean((isPostOwner && isPaidSubscriber) || canUnlockAsPaidSupplier);
  const showSubscribeCta = Boolean(isPostOwner || (allowPaidSupplierUnlock && isSupplier));

  if (!displayPhone) return null;

  const contactLabel = contactType === 'bidder' 
    ? 'Bidding Contact Number' 
    : contactType === 'buyer' 
    ? 'Buyer Contact Number' 
    : 'Direct Contact Number';

  // ── 1. Unlocked View: ONLY Post Owner with Active Paid Subscription ──
  if (canView) {
    if (variant === 'pill') {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs ${className}`}>
          <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
          <a
            href={`tel:${cleanDigits}`}
            className="font-mono font-bold text-foreground hover:text-primary transition-colors"
          >
            {displayPhone}
          </a>
          {showActions && cleanDigits.length >= 10 && (
            <div className="flex items-center gap-1.5 ml-1">
              <a
                href={`https://wa.me/${cleanDigits}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded hover:bg-emerald-500/20 transition-colors"
              >
                WhatsApp
              </a>
            </div>
          )}
        </div>
      );
    }

    if (variant === 'card') {
      return (
        <div className={`p-3.5 rounded-2xl bg-card border border-border space-y-2 text-xs ${className}`}>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-primary" /> {contactLabel}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Unlocked
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="font-mono font-extrabold text-sm text-foreground">{displayPhone}</div>
            {showActions && cleanDigits.length >= 10 && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${cleanDigits}`}
                  className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 hover:bg-primary/90 transition-colors"
                >
                  <Phone className="w-3 h-3" /> Call
                </a>
                <a
                  href={`https://wa.me/${cleanDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" /> WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default inline
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
        <a
          href={`tel:${cleanDigits}`}
          className="font-mono font-bold text-foreground hover:text-primary transition-colors"
        >
          {displayPhone}
        </a>
        {showActions && cleanDigits.length >= 10 && (
          <a
            href={`https://wa.me/${cleanDigits}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded hover:bg-emerald-500/20 transition-colors ml-1"
          >
            WhatsApp
          </a>
        )}
      </span>
    );
  }

  // ── 2. Locked View: Unpaid supplier / non-owner ─────────────────
  return (
    <>
      {variant === 'card' ? (
        <div className={`p-3.5 rounded-2xl bg-muted/30 border border-dashed border-border space-y-2 text-xs ${className}`}>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-[#FF5A1F]" /> {contactLabel}
            </span>
            <span className="text-[10px] font-bold text-[#FF5A1F] bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 px-2 py-0.5 rounded-full">
              {showSubscribeCta ? '🔒 Subscribe to Unlock' : '🔒 Protected'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <span className="font-mono font-bold text-muted-foreground tracking-wider select-none">
              {maskedDisplay}
            </span>
            {showSubscribeCta ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-[#FF5A1F] hover:bg-[#e04f00] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Lock className="w-3 h-3" /> Subscribe to View
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setNonOwnerModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-medium flex items-center gap-1.5 border border-border transition-all cursor-pointer"
              >
                <Lock className="w-3 h-3 text-muted-foreground" /> Protected
              </button>
            )}
          </div>
        </div>
      ) : (
        <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
          <Lock className="w-3 h-3 text-[#FF5A1F] shrink-0" />
          <span className="font-mono text-muted-foreground tracking-wider select-none">
            {maskedDisplay}
          </span>
          {showSubscribeCta ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF5A1F] hover:text-[#e04f00] bg-[#FF5A1F]/10 hover:bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 px-2 py-0.5 rounded transition-all cursor-pointer ml-1"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>Subscribe to View</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setNonOwnerModalOpen(true)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border border-border/60 px-1.5 py-0.5 rounded transition-all cursor-pointer ml-1"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>Protected</span>
            </button>
          )}
        </span>
      )}

      {/* Subscription Upgrade Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-6 rounded-3xl border border-border">
          <DialogHeader className="space-y-2 text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF5A1F]/20 to-amber-500/10 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Unlock Buyer Contact Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Activate your manufacturer subscription to view unmasked buyer phone numbers and start direct negotiations on RFQ leads.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Shield className="w-4 h-4 text-[#FF5A1F]" />
              <span>Paid Subscription Privileges:</span>
            </div>
            <ul className="space-y-1.5 text-muted-foreground pl-6 list-disc text-[11px]">
              <li><strong className="text-foreground">Unmasked Direct Phone & WhatsApp</strong> for all active RFQ buyers</li>
              <li><strong className="text-foreground">Full Bidding Contact Numbers</strong> across 24h & reverse auction rooms</li>
              <li><strong className="text-foreground">Unlimited Quotation Submissions</strong> directly to corporate buyers</li>
              <li><strong className="text-foreground">Priority Supplier Placement</strong> & Verified Manufacturer Badge</li>
            </ul>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="w-full sm:w-auto text-xs"
            >
              Maybe Later
            </Button>
            <Link to="/dashboard/supplier/subscription" className="w-full sm:w-auto">
              <Button
                size="sm"
                className="w-full bg-[#FF5A1F] hover:bg-[#e04f00] text-white font-bold text-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade Plan to Unlock</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Non-Owner Informational Dialog */}
      <Dialog open={nonOwnerModalOpen} onOpenChange={setNonOwnerModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-6 rounded-3xl border border-border">
          <DialogHeader className="space-y-2 text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5A00]/10 border border-[#FF5A00]/30 flex items-center justify-center text-[#FF5A00] mb-1">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Contact Privacy Protected
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              To prevent unauthorized solicitation and spam, participant contact numbers are strictly confidential. Under BulkSkart privacy policy, phone numbers can only be unmasked by the verified listing/auction owner who holds an active paid subscription.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1.5 text-xs text-muted-foreground">
            <p>• If you need to contact this entity, please use the official platform quotation or messaging system.</p>
            <p>• Direct contact numbers remain masked for all non-owners.</p>
          </div>

          <DialogFooter className="mt-2">
            <Button
              size="sm"
              onClick={() => setNonOwnerModalOpen(false)}
              className="w-full bg-primary text-primary-foreground font-bold text-xs"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
