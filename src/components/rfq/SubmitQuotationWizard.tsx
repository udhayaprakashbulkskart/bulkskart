import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Clock, UploadCloud, FileText, Check, AlertCircle,
  Pencil, ChevronRight, ArrowLeft, ArrowRight, ShieldCheck, Download,
  Package, Calendar, CheckSquare, Sparkles, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { createQuotation } from '@/lib/api';

export interface SubmitQuotationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfq: {
    id: string;
    reqNumber?: string;
    title: string;
    quantity: number;
    quantityUnit: string;
    targetPriceMin?: number;
    targetPriceMax?: number;
    deliveryLocation?: string;
    deliveryTimeText?: string;
    paymentTerms?: string;
    endSecondsRemaining?: number;
  };
  onSuccess?: () => void;
}

export default function SubmitQuotationWizard({
  open,
  onOpenChange,
  rfq,
  onSuccess
}: SubmitQuotationWizardProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form States matching Screen 3
  const [unitPrice, setUnitPrice] = useState<number>(66);
  const [totalQuantity, setTotalQuantity] = useState<number>(rfq.quantity || 10000);
  const [deliveryLeadDays, setDeliveryLeadDays] = useState<number>(7);
  const [freightCharges, setFreightCharges] = useState<number>(20000);
  const [packagingCharges, setPackagingCharges] = useState<number>(5000);
  const [taxRate, setTaxRate] = useState<number>(18);

  // Uploaded documents state
  const [documents, setDocuments] = useState<Array<{ name: string; size: string; type: string }>>([
    { name: 'product_catalog.pdf', size: '2.4 MB', type: 'Product Catalog' },
    { name: 'quality_certificate.pdf', size: '1.1 MB', type: 'Quality Certificate' },
    { name: 'test_report.pdf', size: '3.2 MB', type: 'Test Report' },
  ]);

  // Step 2 Agreement Checkbox
  const [termsAgreed, setTermsAgreed] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Countdown timer for Step 3
  const [secondsRemaining, setSecondsRemaining] = useState<number>(rfq.endSecondsRemaining || 26 * 60 + 51);

  useEffect(() => {
    if (!open) {
      setStep(1);
    }
  }, [open]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Financial Calculations matching Screen 3 & 4
  const productSubtotal = unitPrice * totalQuantity;
  const subtotalBeforeTax = productSubtotal + (freightCharges || 0) + (packagingCharges || 0);
  const gstAmount = Math.round((subtotalBeforeTax * taxRate) / 100);
  const totalQuotationValue = subtotalBeforeTax + gstAmount;

  const targetMin = rfq.targetPriceMin ?? 60;
  const targetMax = rfq.targetPriceMax ?? 75;
  const isWithinTarget = unitPrice >= targetMin && unitPrice <= targetMax;

  const handleNextToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitPrice || unitPrice <= 0) {
      toast.error('Please enter a valid unit price');
      return;
    }
    if (!deliveryLeadDays || deliveryLeadDays <= 0) {
      toast.error('Please specify delivery lead time');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!termsAgreed) {
      toast.error('Please agree to the RFQ terms and conditions');
      return;
    }

    if (!user) {
      toast.error('Authentication Required', {
        description: 'Please sign in to your supplier account to submit quotations.'
      });
      navigate('/login');
      return;
    }

    if (profile?.role !== 'supplier' && (profile?.role as any) !== 'manufacturer' && profile?.role !== 'admin') {
      toast.error('Supplier Account Required', {
        description: 'Only registered suppliers can submit quotations for buyer RFQs.'
      });
      return;
    }

    setSubmitting(true);
    try {
      await createQuotation({
        requirement_id: rfq.id,
        unit_price: unitPrice,
        currency: 'INR',
        moq: Math.min(100, totalQuantity),
        moq_unit: rfq.quantityUnit || 'Metre (m)',
        delivery_days: deliveryLeadDays,
        validity_days: 14,
        payment_terms: rfq.paymentTerms || '50% advance, 50% before dispatch',
        notes: `Total quotation value: ₹${totalQuotationValue.toLocaleString('en-IN')}. Freight: ₹${freightCharges}, Packaging: ₹${packagingCharges}, GST: ${taxRate}%. Qty: ${totalQuantity}`,
        is_draft: false
      });

      toast.success('Quotation submitted successfully!');
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to submit quotation:', err);
      toast.error(err.message || 'Failed to submit quotation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] md:max-w-xl bg-card border border-border text-foreground p-0 rounded-3xl overflow-hidden max-h-[92dvh] flex flex-col shadow-2xl">
        
        {/* ── Top App Bar & Stepper Indicator ── */}
        <div className="bg-background border-b border-border p-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                if (step === 2) setStep(1);
                else onOpenChange(false);
              }}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-foreground">
              {step === 1 ? 'Submit Quotation' : step === 2 ? 'Review Quotation' : 'Confirmation'}
            </h2>
            <div className="w-5" /> {/* spacer */}
          </div>

          {/* Stepper Pills */}
          <div className="flex items-center justify-center gap-6 text-xs font-bold">
            {/* Step 1 */}
            <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-[#FF5A1F]' : step > 1 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1 ? 'bg-[#FF5A1F] text-white' : step > 1 ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {step > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span>Quotation</span>
            </div>

            <div className="w-8 h-0.5 bg-border" />

            {/* Step 2 */}
            <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-[#FF5A1F]' : step > 2 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2 ? 'bg-[#FF5A1F] text-white' : step > 2 ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {step > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span>Review</span>
            </div>

            <div className="w-8 h-0.5 bg-border" />

            {/* Step 3 */}
            <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 3 ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
              <span>Confirm</span>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
          
          {/* ═════════════════════════════════════════════════════════
              STEP 1: QUOTATION ENTRY (Exact UI matching Screen 3)
          ═════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <form onSubmit={handleNextToReview} className="space-y-4">
              
              {/* Unit Price */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="text-[#FF5A1F]">●</span> Unit Price (₹ per metre) *
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-foreground">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={unitPrice}
                    onChange={e => setUnitPrice(Number(e.target.value))}
                    className="pl-8 bg-background border-border text-foreground font-bold text-base h-12 rounded-xl focus:border-[#FF5A1F]"
                    placeholder="66.00"
                  />
                </div>
                {/* Target Range feedback */}
                {isWithinTarget ? (
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Within buyer's target range (₹{targetMin} – ₹{targetMax})
                  </p>
                ) : (
                  <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Buyer's target range is ₹{targetMin} – ₹{targetMax}
                  </p>
                )}
              </div>

              {/* Total Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Total Quantity</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={totalQuantity}
                    onChange={e => setTotalQuantity(Number(e.target.value))}
                    className="bg-background border-border text-foreground font-bold text-base h-12 rounded-xl focus:border-[#FF5A1F]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                    {rfq.quantityUnit || 'm'}
                  </span>
                </div>
              </div>

              {/* Delivery Lead Time (Days) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Delivery Lead Time (Days) *</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    required
                    value={deliveryLeadDays}
                    onChange={e => setDeliveryLeadDays(Number(e.target.value))}
                    className="bg-background border-border text-foreground font-bold text-base h-12 rounded-xl focus:border-[#FF5A1F]"
                  />
                  <Calendar className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Delivery within {deliveryLeadDays} days
                </p>
              </div>

              {/* Additional Charges (Freight + Packaging) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Additional Charges <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Freight Charges (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={freightCharges}
                      onChange={e => setFreightCharges(Number(e.target.value))}
                      className="bg-background border-border text-foreground h-11 rounded-xl text-xs focus:border-[#FF5A1F]"
                      placeholder="20000"
                    />
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">Optional</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Packaging Charges (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={packagingCharges}
                      onChange={e => setPackagingCharges(Number(e.target.value))}
                      className="bg-background border-border text-foreground h-11 rounded-xl text-xs focus:border-[#FF5A1F]"
                      placeholder="5000"
                    />
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">Optional</span>
                  </div>
                </div>
              </div>

              {/* GST (Tax) Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">GST (Tax)</label>
                <select
                  value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  className="w-full bg-background border border-border text-foreground font-bold text-xs h-11 rounded-xl px-3 focus:outline-none focus:border-[#FF5A1F]"
                >
                  <option value={18}>18% (Standard GST)</option>
                  <option value={12}>12% (Reduced Rate)</option>
                  <option value={5}>5% (Essential Goods)</option>
                  <option value={28}>28% (Luxury / Special)</option>
                  <option value={0}>0% (Zero Rated / SEZ / Export)</option>
                </select>
              </div>

              {/* Total Quotation Value Highlight Box */}
              <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 text-center">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Total Quotation Value
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-[#FF5A1F] mt-1">
                  ₹{totalQuotationValue.toLocaleString('en-IN')}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                  (Inclusive of product + freight + packaging + GST)
                </p>
              </div>

              {/* Product Compliance & Documents Upload */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#FF5A1F]" />
                    Product Compliance & Documents
                  </label>
                  <span className="text-[10px] text-muted-foreground">Upload files (Max 10 MB each)</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl border border-dashed border-border bg-background/50 hover:bg-muted/50 transition-colors flex items-center gap-2 cursor-pointer">
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-foreground truncate">Product Catalog</div>
                      <div className="text-[9px] text-muted-foreground">PDF, JPG, PNG</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-dashed border-border bg-background/50 hover:bg-muted/50 transition-colors flex items-center gap-2 cursor-pointer">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-foreground truncate">Quality Certificate</div>
                      <div className="text-[9px] text-muted-foreground">PDF, JPG, PNG</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-dashed border-border bg-background/50 hover:bg-muted/50 transition-colors flex items-center gap-2 cursor-pointer">
                    <FileText className="w-4 h-4 text-[#FF5A00] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-foreground truncate">Test Report</div>
                      <div className="text-[9px] text-muted-foreground">PDF, JPG, PNG</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-dashed border-[#FF5A1F]/50 bg-[#FF5A1F]/5 hover:bg-[#FF5A1F]/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[#FF5A1F]">
                    <span className="text-xs font-bold">+ Upload More</span>
                  </div>
                </div>
              </div>

              {/* Submit CTA for Step 1 */}
              <Button
                type="submit"
                className="w-full bg-[#FF5A1F] hover:bg-[#e04e17] text-white font-bold text-sm h-12 rounded-xl shadow-lg transition-transform active:scale-[0.98] mt-2"
              >
                Next: Review Quotation <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

          {/* ═════════════════════════════════════════════════════════
              STEP 2: REVIEW QUOTATION (Exact UI matching Screen 4)
          ═════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              
              {/* Card 1: Quotation Summary */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="text-[#FF5A1F]">●</span> Quotation Summary
                  </h3>
                  <button
                    onClick={() => setStep(1)}
                    className="p-1 text-muted-foreground hover:text-[#FF5A1F] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Unit Price</span>
                    <span className="font-bold text-foreground">₹{unitPrice.toFixed(2)} / metre</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-bold text-foreground">{totalQuantity.toLocaleString()} metres</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Lead Time</span>
                    <span className="font-bold text-foreground">{deliveryLeadDays} days</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Freight Charges</span>
                    <span className="font-bold text-foreground">₹{freightCharges.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Packaging Charges</span>
                    <span className="font-bold text-foreground">₹{packagingCharges.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-border/40 font-semibold">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">₹{subtotalBeforeTax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>GST ({taxRate}%)</span>
                    <span>₹{gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-bold text-sm">
                    <span className="text-foreground">Total Quotation Value</span>
                    <span className="text-[#FF5A1F] text-base">₹{totalQuotationValue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Delivery & Payment Terms */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="text-[#FF5A1F]">●</span> Delivery & Payment Terms
                  </h3>
                  <button
                    onClick={() => setStep(1)}
                    className="p-1 text-muted-foreground hover:text-[#FF5A1F] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Delivery Location</span>
                    <span className="font-bold text-foreground text-right">{rfq.deliveryLocation || 'Tiruppur, Tamil Nadu'}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Delivery Time</span>
                    <span className="font-bold text-foreground">Within {deliveryLeadDays} days</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Payment Terms</span>
                    <span className="font-bold text-foreground text-right">{rfq.paymentTerms || '50% advance, 50% before dispatch'}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Quotation Validity</span>
                    <span className="font-bold text-foreground">7 days after auction close</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Uploaded Documents */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="text-[#FF5A1F]">●</span> Uploaded Documents ({documents.length})
                  </h3>
                  <button
                    onClick={() => setStep(1)}
                    className="p-1 text-muted-foreground hover:text-[#FF5A1F] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="font-bold text-foreground truncate">{doc.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{doc.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Binding Agreement Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-50/50 dark:bg-[#FF5A1F]/10 border border-[#FF5A1F]/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={e => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#FF5A1F] focus:ring-[#FF5A1F] accent-[#FF5A1F]"
                />
                <span className="text-xs text-foreground leading-snug">
                  I agree to the RFQ terms and conditions and confirm that my quotation is binding and valid until the auction closes.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-1/3 h-12 rounded-xl text-xs font-bold"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={submitting || !termsAgreed}
                  className="flex-1 bg-[#FF5A1F] hover:bg-[#e04e17] text-white font-bold text-sm h-12 rounded-xl shadow-lg transition-transform active:scale-[0.98]"
                >
                  {submitting ? 'Submitting...' : 'Submit Quotation'} <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════
              STEP 3: CONFIRMATION SCREEN (Exact UI matching Screen 5)
          ═════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-4 py-2 text-center">
              
              {/* Graphic Icon (Green Checkmark with Paper Plane) */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg relative z-10">
                  <Check className="w-9 h-9 stroke-[3]" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#FF5A1F] text-white shadow">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Headline */}
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  Quotation Submitted Successfully!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Your quotation has been submitted for RFQ: <strong className="text-foreground">{rfq.reqNumber || rfq.title}</strong>
                </p>
              </div>

              {/* Quotation Details Card */}
              <div className="p-4 rounded-2xl bg-card border border-border text-left space-y-2 text-xs shadow-sm">
                <h4 className="text-xs font-bold text-foreground pb-1.5 border-b border-border flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#FF5A1F]" />
                  Quotation Details
                </h4>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Unit Price</span>
                  <span className="font-bold text-foreground">₹{unitPrice.toFixed(2)} / metre</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Total Quantity</span>
                  <span className="font-bold text-foreground">{totalQuantity.toLocaleString()} metres</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-bold text-[#FF5A1F] text-sm">₹{totalQuotationValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Lead Time</span>
                  <span className="font-bold text-foreground">{deliveryLeadDays} days</span>
                </div>
              </div>

              {/* Informational note */}
              <div className="p-2.5 rounded-xl bg-muted/50 border border-border/60 text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-[#FF5A1F] shrink-0" />
                <span>You can revise your quotation anytime before the auction closes.</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = '/my-quotations';
                  }}
                  className="w-full bg-[#FF5A1F] hover:bg-[#e04e17] text-white font-bold text-sm h-12 rounded-xl shadow-lg"
                >
                  View Quotation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full h-11 rounded-xl text-xs font-bold"
                >
                  Back to RFQ Details
                </Button>
              </div>

              {/* Live Closing Countdown Footer matching Screen 5 */}
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 mt-3">
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center justify-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Auction Closes In
                </span>
                <div className="flex items-center justify-center gap-2 font-mono">
                  <div className="bg-white dark:bg-black/60 px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-900 shadow-sm">
                    <span className="text-lg font-bold text-foreground">{hours.toString().padStart(2, '0')}</span>
                    <span className="block text-[9px] text-muted-foreground font-sans font-semibold">Hours</span>
                  </div>
                  <span className="font-bold text-red-500 text-lg">:</span>
                  <div className="bg-white dark:bg-black/60 px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-900 shadow-sm">
                    <span className="text-lg font-bold text-foreground">{minutes.toString().padStart(2, '0')}</span>
                    <span className="block text-[9px] text-muted-foreground font-sans font-semibold">Minutes</span>
                  </div>
                  <span className="font-bold text-red-500 text-lg">:</span>
                  <div className="bg-white dark:bg-black/60 px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-900 shadow-sm">
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">{seconds.toString().padStart(2, '0')}</span>
                    <span className="block text-[9px] text-muted-foreground font-sans font-semibold">Seconds</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </DialogContent>
    </Dialog>
  );
}
