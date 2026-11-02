/**
 * useRazorpay
 *
 * Loads the Razorpay checkout script on demand, creates an order via our
 * Edge Function, and opens the Razorpay payment modal.
 * On payment success, calls razorpay-verify-payment to activate subscriptions or promotions.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { BULKSKART_ICON_URL } from '@/constants/branding';

export interface CheckoutOptions {
  plan_tier: string;       // 'starter' | 'business' | 'growth' | 'enterprise'
  plan_label: string;      // display name e.g. "Business"
  price_inr: number;       // e.g. 999
  billing_cycle: string;   // 'monthly' | 'annual'
  company_id: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  onSuccess?: () => void;
  onError?: (err: string) => void;
}

export interface PromotionCheckoutOptions {
  company_id: string;
  product_id: string;
  product_name: string;
  promotion_type: 'featured' | 'boost' | 'campaign';
  duration_days: number;
  base_amount: number;
  gst_amount: number;
  total_amount: number;
  target_category?: string;
  target_country?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  onSuccess?: () => void;
  onError?: (err: string) => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpay() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 1. Subscription Checkout Flow
  const startCheckout = useCallback(async (opts: CheckoutOptions) => {
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Please check your internet connection.');
        setLoading(false);
        opts.onError?.('Failed to load payment gateway');
        return;
      }

      const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
        body: {
          type: 'subscription',
          plan_tier: opts.plan_tier,
          plan_label: opts.plan_label,
          price_inr: opts.price_inr,
          billing_cycle: opts.billing_cycle,
          company_id: opts.company_id,
        },
      });

      if (error || !data?.order_id) {
        const msg =
          (typeof data?.error === 'string' && data.error) ||
          (typeof data?.details === 'string' && data.details) ||
          error?.message ||
          'Could not create payment order';
        toast.error(msg);
        setLoading(false);
        opts.onError?.(msg);
        return;
      }

      const { order_id, amount, currency, key_id } = data;

      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        order_id,
        name: 'BulkSkart B2B Marketplace',
        description: `${opts.plan_label} Plan — ${opts.billing_cycle}`,
        image: BULKSKART_ICON_URL,
        prefill: {
          name: opts.user_name ?? '',
          email: opts.user_email ?? '',
          contact: opts.user_phone ?? '',
        },
        theme: { color: '#FF5A00' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const { data: verifyData, error: verifyErr } = await supabase.functions.invoke('razorpay-verify-payment', {
            body: {
              type: 'subscription',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              company_id: opts.company_id,
              plan_tier: opts.plan_tier,
              billing_cycle: opts.billing_cycle,
            },
          });

          if (verifyErr || !verifyData?.success) {
            const errMsg = verifyErr?.message || 'Payment verification failed. Please contact support.';
            toast.error(errMsg);
            setLoading(false);
            opts.onError?.(errMsg);
            return;
          }

          toast.success(`🎉 ${opts.plan_label} plan activated! Welcome to BulkSkart.`);
          opts.onSuccess?.();
          setLoading(false);
          navigate(`/payment-success?plan=${encodeURIComponent(opts.plan_tier)}`);
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment was cancelled');
            setLoading(false);
          },
        },
      });

      rzp.on('payment.failed', (resp: { error: { description: string } }) => {
        const failMsg = resp.error?.description || 'Transaction declined';
        toast.error(`Payment failed: ${failMsg}`);
        setLoading(false);
        opts.onError?.(failMsg);
      });

      rzp.open();
    } catch (e: any) {
      console.error('Razorpay checkout error:', e);
      toast.error('Payment initialization error. Please try again.');
      setLoading(false);
      opts.onError?.(e?.message || 'Unknown error');
    }
  }, [navigate]);

  // 2. Product Promotion Checkout Flow
  const startPromotionCheckout = useCallback(async (opts: PromotionCheckoutOptions) => {
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load Razorpay payment gateway.');
        setLoading(false);
        opts.onError?.('Failed to load Razorpay script');
        return;
      }

      // Backend order creation via Edge Function
      const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
        body: {
          type: 'promotion',
          company_id: opts.company_id,
          product_id: opts.product_id,
          promotion_type: opts.promotion_type,
          duration_days: opts.duration_days,
          base_amount: opts.base_amount,
          gst_amount: opts.gst_amount,
          total_amount: opts.total_amount,
          target_category: opts.target_category || null,
          target_country: opts.target_country || 'All Countries',
        },
      });

      if (error || !data?.order_id) {
        const msg =
          (typeof data?.error === 'string' && data.error) ||
          (typeof data?.details === 'string' && data.details) ||
          error?.message ||
          'Failed to initialize promotion order';
        toast.error(msg);
        setLoading(false);
        opts.onError?.(msg);
        return;
      }

      const { order_id, amount, currency, key_id } = data;

      const promoTypeTitle =
        opts.promotion_type === 'featured'
          ? 'Featured Product'
          : opts.promotion_type === 'boost'
            ? 'Boost Product'
            : 'Promotion Campaign';

      // Open Razorpay Checkout Modal
      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency: currency || 'INR',
        order_id,
        name: 'BulkSkart B2B Marketplace',
        description: `${promoTypeTitle} — ${opts.duration_days} Days (${opts.product_name})`,
        image: BULKSKART_ICON_URL,
        prefill: {
          name: opts.user_name ?? '',
          email: opts.user_email ?? '',
          contact: opts.user_phone ?? '',
        },
        theme: { color: '#FF5A00' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // Server-side signature verification & campaign activation
          const { data: verifyData, error: verifyErr } = await supabase.functions.invoke('razorpay-verify-payment', {
            body: {
              type: 'promotion',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              company_id: opts.company_id,
              product_id: opts.product_id,
            },
          });

          if (verifyErr || !verifyData?.success) {
            const errMsg = verifyErr?.message || 'Payment signature verification failed. Please contact support.';
            toast.error(errMsg);
            setLoading(false);
            opts.onError?.(errMsg);
            return;
          }

          toast.success(`🎉 Promotion for "${opts.product_name}" is now active!`);
          opts.onSuccess?.();
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled by user');
            setLoading(false);
          },
        },
      });

      rzp.on('payment.failed', (resp: { error: { description: string } }) => {
        const failMsg = resp.error?.description || 'Transaction declined';
        toast.error(`Payment failed: ${failMsg}`);
        setLoading(false);
        opts.onError?.(failMsg);
      });

      rzp.open();
    } catch (e: any) {
      console.error('Promotion checkout error:', e);
      toast.error('Could not open payment window. Please try again.');
      setLoading(false);
      opts.onError?.(e?.message || 'Checkout error');
    }
  }, []);

  return { startCheckout, startPromotionCheckout, loading };
}
