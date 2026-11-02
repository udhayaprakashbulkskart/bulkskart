import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { SUPPORT_EMAIL } from '@/lib/supportContact';

interface ReportItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'product' | 'company' | 'requirement' | 'auction';
  targetId: string;
  targetTitle: string;
}

const REPORT_REASONS = [
  { value: 'counterfeit', label: 'Counterfeit or Fake Product' },
  { value: 'fraud', label: 'Fraudulent Supplier / Scam Attempt' },
  { value: 'misleading_pricing', label: 'Incorrect Specifications or Misleading Price' },
  { value: 'ip_infringement', label: 'Intellectual Property / Trademark Violation' },
  { value: 'prohibited_goods', label: 'Prohibited, Hazardous or Restricted Goods' },
  { value: 'abusive_spam', label: 'Spam, Abusive or Inappropriate Content' },
  { value: 'other', label: 'Other Regulatory or Policy Violation' },
];

export default function ReportItemModal({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetTitle,
}: ReportItemModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to report a listing.');
      return;
    }
    if (!reason) {
      toast.error('Please select a violation reason.');
      return;
    }
    if (!notes.trim() || notes.trim().length < 10) {
      toast.error('Please provide at least 10 characters describing the issue.');
      return;
    }

    setLoading(true);
    const reportId = crypto.randomUUID();
    const reasonLabel = REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
    const description = [
      `Reported ${targetType}: ${targetTitle} (id ${targetId})`,
      `Contact email: ${contactEmail || user.email || 'not given'}`,
      '',
      notes.trim(),
    ].join('\n');

    // Written to the reports table (row-level security keeps each report visible to its author and to admins).
    // The reference shown below is the first part of that row's id, so it can be quoted to support.
    const { error } = await supabase.from('reports').insert({
      id: reportId,
      reporter_id: user.id,
      reported_product_id: targetType === 'product' ? targetId : null,
      reported_company_id: targetType === 'company' ? targetId : null,
      reason: reasonLabel,
      description,
    });
    setLoading(false);

    if (error) {
      toast.error(`We could not record your report. Please email ${SUPPORT_EMAIL} instead.`);
      return;
    }
    setSubmitted(true);
    setTicketId(reportId.slice(0, 8).toUpperCase());
    toast.success('Report recorded.');
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      setReason('');
      setNotes('');
      setTicketId('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-[#0B132B] border-slate-700 text-white p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white">
                Report {targetType === 'company' ? 'Supplier' : 'Product'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                BulkSkart Trust &amp; Safety Compliance Division
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Report Received</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Thank you for helping keep BulkSkart a safe B2B trade marketplace. Your report has been recorded and will be reviewed by the BulkSkart team.
              </p>
              <div className="mt-3 inline-block px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-mono">
                Tracking Ref: <span className="text-[#FF5A1F] font-bold">{ticketId}</span>
              </div>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleClose}
                className="w-full bg-[#FF5A1F] hover:bg-[#e04f1a] text-white font-semibold text-xs h-10 rounded-xl"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-0.5">Target Entity:</span>
              <p className="font-semibold text-white truncate">{targetTitle}</p>
            </div>
            {!user && (
              <p className="text-xs text-amber-300">
                You need to <a href="/auth" className="underline font-semibold">sign in</a> before you can submit a report.
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Reason for reporting <span className="text-red-400">*</span>
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="w-full bg-[#070D1F] border-slate-700 text-slate-200 text-xs h-10 rounded-xl">
                  <SelectValue placeholder="Select a violation category..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0B132B] border-slate-700 text-slate-200 text-xs">
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="hover:bg-slate-800 cursor-pointer py-2">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Details &amp; Evidence <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Please describe why this listing violates BulkSkart policies (e.g., inaccurate specs, fake certification, price gouging)..."
                className="bg-[#070D1F] border-slate-700 text-slate-200 text-xs rounded-xl min-h-[90px] focus:ring-1 focus:ring-[#FF5A1F]"
              />
              <span className="text-[10px] text-slate-400">Min 10 characters</span>
            </div>

            {!user && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Your Contact Email (for updates)
                </label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="yourname@company.com"
                  className="bg-[#070D1F] border-slate-700 text-slate-200 text-xs h-10 rounded-xl"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 text-xs h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-10 rounded-xl px-5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
