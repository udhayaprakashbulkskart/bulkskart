import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight, Shield } from 'lucide-react';
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
import { getCountryMeta, getCountryGuestMask } from '@/lib/countryPhoneCodes';

interface MaskedPhoneProps {
  /** Raw phone string, e.g. "+971 4 398 5210" or "+919876543210" */
  phone?: string | null;
  /** Country of the supplier (e.g. 'UAE', 'Germany', 'USA', 'India') */
  country?: string | null;
  /** When true, shows a green "Verified Contact" badge next to the revealed number */
  verified?: boolean;
  /** Shown when the supplier has not stored a phone number */
  fallback?: string;
  /** Show/hide the phone icon before the number */
  showIcon?: boolean;
  /** Extra className on the root element */
  className?: string;
  /** Custom context description for the subscription modal */
  contextDesc?: string;
}

/** Formats phone string with country awareness */
function formatPhone(raw: string, country?: string | null): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  const meta = getCountryMeta(country);
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${meta.dialCode} ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `${meta.dialCode} ${trimmed}`;
}

/** Masks the phone digits appropriately based on country format */
function maskPhone(formatted: string, country?: string | null): string {
  const meta = getCountryMeta(country);
  if (formatted.startsWith('+')) {
    const parts = formatted.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} ${parts[2].slice(0, 1)}•••• ••••`;
    } else if (parts.length === 2) {
      return `${parts[0]} ${parts[1].slice(0, 2)}•••• ••••`;
    }
  }
  return meta.guestMask || '+91 98••••••••';
}

export default function MaskedPhone({
  phone,
  country,
  verified = false,
  fallback = 'Not available',
  showIcon = true,
  className = '',
  contextDesc = 'buyer and trading contact numbers'
}: MaskedPhoneProps) {
  const { user, profile, isPaidSubscriber } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Only a number the supplier actually stored is ever shown; nothing is generated from the country.
  const formatted = phone?.trim() ? formatPhone(phone, country) : null;
  const masked = formatted ? maskPhone(formatted, country) : getCountryGuestMask(country);

  // ── 0. No number on file: say so, whoever is looking ──────────────
  if (!formatted) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        {showIcon && <Phone className="w-3.5 h-3.5 shrink-0" />}
        {fallback}
      </span>
    );
  }

  // ── 1. Guest (not logged in) ──────────────────────────────────────
  if (!user) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
        {showIcon && <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="text-muted-foreground font-mono tracking-wider select-none">
          {masked}
        </span>
        <Link
          to="/auth"
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline ml-1"
        >
          <Lock className="w-2.5 h-2.5" /> Login to reveal
        </Link>
      </span>
    );
  }

  // ── 2. Logged-in Manufacturer without Paid Subscription ───────────
  // Rule: Manufacturers subscription paid users only can see the contact numbers.
  // Unpaid manufacturers cannot view contacts.
  const isUnpaidManufacturer = profile?.role === 'supplier' && !isPaidSubscriber;

  if (isUnpaidManufacturer) {
    return (
      <>
        <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
          {showIcon && <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          <span className="text-muted-foreground font-mono tracking-wider select-none">
            {masked}
          </span>
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF5A1F] hover:text-[#e04f00] bg-[#FF5A1F]/10 hover:bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 px-2 py-0.5 rounded transition-all cursor-pointer"
            title="Paid Subscription required to view contact number"
          >
            <Lock className="w-2.5 h-2.5" />
            <span>Subscribe to View</span>
          </button>
        </span>

        {/* Upgrade Prompt Modal */}
        <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-6 rounded-2xl border border-border">
            <DialogHeader className="space-y-2 text-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF5A1F]/20 to-amber-500/10 border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] mb-1">
                <Lock className="w-6 h-6" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Manufacturer Subscription Required
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Direct {contextDesc} are reserved exclusively for manufacturers with an active paid subscription plan.
              </DialogDescription>
            </DialogHeader>

            <div className="my-2 p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Shield className="w-4 h-4 text-[#FF5A1F]" />
                <span>What you unlock with a Paid Subscription:</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground pl-6 list-disc text-[11px]">
                <li>Direct buyer phone numbers & WhatsApp chat access</li>
                <li>Live bidding participant phone numbers & trade history</li>
                <li>Send official quotations with custom pricing & delivery terms</li>
                <li>Priority verified manufacturer badge & top catalog placement</li>
              </ul>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUpgradeModalOpen(false)}
                className="w-full sm:w-auto text-xs"
              >
                Cancel
              </Button>
              <Link to="/dashboard/supplier/subscription" className="w-full sm:w-auto">
                <Button
                  size="sm"
                  className="w-full bg-[#FF5A1F] hover:bg-[#e04f00] text-white font-bold text-xs gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upgrade Plan Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ── 3. Paid Subscriber Manufacturer, Buyer, or Admin ──────────────
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      {showIcon && <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      {revealed ? (
        <>
          <a
            href={`tel:${formatted.replace(/\s/g, '')}`}
            className="font-mono font-semibold text-foreground hover:text-primary transition-colors tracking-wider"
          >
            {formatted}
          </a>
          {verified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-full px-1.5 py-0.5 leading-none shrink-0">
              <ShieldCheck className="w-2.5 h-2.5" /> Verified
            </span>
          )}
          <button
            type="button"
            onClick={() => setRevealed(false)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Hide phone number"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </>
      ) : (
        <>
          <span className="font-mono text-muted-foreground tracking-wider select-none">
            {masked}
          </span>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
            aria-label="Reveal phone number"
          >
            <Eye className="w-2.5 h-2.5" /> Reveal
          </button>
        </>
      )}
    </span>
  );
}
