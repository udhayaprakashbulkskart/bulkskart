import React, { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import PageMeta from '@/components/common/PageMeta';
import FaqAccordion from '@/components/common/FaqAccordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Mail, MapPin, Clock, Send, CheckCircle2,
  Linkedin, Twitter, Facebook, Instagram, Youtube,
  Building2, Globe, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { SUPPORT_EMAIL, WHATSAPP_CHAT_URL, WHATSAPP_DISPLAY, WHATSAPP_MESSAGE_URL } from '@/lib/supportContact';

const CONTACT_INFO = [
  {
    icon: Building2,
    label: 'Company',
    value: 'BulkSkart B2B Marketplace',
    sub: 'Registered in India',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'info@bulkskart.com',
    href: 'mailto:info@bulkskart.com',
  },
  {
    icon: MessageSquare,
    label: 'WhatsApp chat',
    value: WHATSAPP_DISPLAY,
    href: WHATSAPP_CHAT_URL,
    sub: 'Message BulkSkart on WhatsApp',
  },
  {
    icon: MapPin,
    label: 'Address',
    value: 'India',
    sub: 'Headquarters',
  },
  {
    icon: Clock,
    label: 'Business Hours',
    value: 'Mon – Sat, 9 AM – 6 PM IST',
    sub: 'We respond within 24 hours',
  },
  {
    icon: Globe,
    label: 'Website',
    value: 'bulkskart.com',
    href: '/',
  },
];

const SOCIAL = [
  { icon: Linkedin,  href: 'https://linkedin.com/company/bulkskart',  label: 'LinkedIn'  },
  { icon: Twitter,   href: 'https://twitter.com/bulkskart',            label: 'Twitter'   },
  { icon: Facebook,  href: 'https://facebook.com/bulkskart',           label: 'Facebook'  },
  { icon: Instagram, href: 'https://instagram.com/bulkskart',          label: 'Instagram' },
  { icon: Youtube,   href: 'https://youtube.com/@bulkskart',           label: 'YouTube'   },
];

const FAQS = [
  { q: 'How do I register as a supplier?', a: 'Click "Join as Supplier" on the top navigation or visit /auth?tab=supplier to create your account.' },
  { q: 'How long does buyer verification take?', a: 'KYC review typically takes 1–2 business days. You\'ll receive an email notification once approved.' },
  { q: 'What subscription plans are available?', a: 'We offer Starter (₹2,500 with 5 responses), Business (₹7,500 with 50 responses + AI accessibility), Growth (₹15,000 with unlimited responses), and custom Enterprise plans. Add-on services include AI Accessibility (₹7,500) and 24 Hours Sell Products (₹5,000). See /pricing for details.' },
  { q: 'How do I raise a trade dispute?', a: 'Go to your dashboard → Dispute Center → Raise Dispute. Select the order and describe the issue with evidence.' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  // This form is not stored anywhere. It prepares the message, and the visitor sends it from their email app or WhatsApp.
  const subject = form.subject.trim() || 'Enquiry from bulkskart.com';
  const body = `${form.message.trim()}\n\n${form.name.trim()} (${form.email.trim()})`;
  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const whatsappHref = `${WHATSAPP_CHAT_URL}?text=${encodeURIComponent(`${subject}\n\n${body}`)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSent(true);
  };

  return (
    <MainLayout>
      <PageMeta
        title="Contact BulkSkart — Support, Partnerships & Global Trade Enquiries"
        description="Reach BulkSkart support by email or WhatsApp chat on +91 89702 02677. We respond within 24 hours."
        keywords="contact BulkSkart, B2B support, trade enquiry, supplier help, bulk trade contact"
        canonical="/contact"
        ogType="website"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Contact Us', item: '/contact' },
        ]}
      />

      {/* Hero */}
      <div className="bg-[#1a1a2e] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4">
            <MessageSquare className="w-3.5 h-3.5 text-[#FF5A00]" />
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Get in Touch</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3">
            Contact <span className="text-[#FF5A00]">BulkSkart</span>
          </h1>
          <p className="text-white/70 text-sm max-w-xl mx-auto">
            Operated by <strong className="text-white">Tech Pod AI Database Private Limited</strong>. We're here to help you with trade inquiries, support, and partnerships.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact form */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Send Us a Message</h2>
            <p className="text-sm text-muted-foreground mb-5">Fill in the form, then send it from your email app or WhatsApp.</p>

            {sent ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 gap-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <h3 className="text-lg font-bold text-foreground">Your message is ready to send</h3>
                <p className="text-sm text-muted-foreground max-w-xs">This form does not send your message by itself. Send it from your email app or on WhatsApp so it reaches the BulkSkart team.</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <a href={mailtoHref} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold text-sm h-10 px-4">
                    <Mail className="w-4 h-4" /> Send by email
                  </a>
                  <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card hover:bg-muted text-foreground font-bold text-sm h-10 px-4">
                    <MessageSquare className="w-4 h-4" /> Send on WhatsApp
                  </a>
                </div>
                <Button variant="ghost" onClick={() => setSent(false)}>
                  Edit message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="How can we help?" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Describe your inquiry, issue, or partnership proposal..."
                    rows={5}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-[#FF5A00] hover:bg-[#e04e00] text-white font-bold h-11 gap-2">
                  <Send className="w-4 h-4" /> Prepare Message
                </Button>
              </form>
            )}
          </div>

          {/* Contact info */}
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Contact Information</h2>
              <p className="text-sm text-muted-foreground mb-4">Reach us through any of the channels below.</p>
              <div className="space-y-3">
                {CONTACT_INFO.map(({ icon: Icon, label, value, sub, href }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <div className="w-9 h-9 rounded-lg bg-[#FF5A00]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#FF5A00]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">{label}</p>
                      {href ? (
                        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="text-sm font-semibold text-foreground hover:text-[#FF5A00] transition-colors break-words">{value}</a>
                      ) : (
                        <p className="text-sm font-semibold text-foreground break-words">{value}</p>
                      )}
                      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                    </div>
                  </div>
                ))}
                <a
                  href={WHATSAPP_MESSAGE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 h-11 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-bold transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message BulkSkart on WhatsApp
                </a>
              </div>
            </div>

            {/* Social links */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Follow Us</p>
              <div className="flex gap-2 flex-wrap">
                {SOCIAL.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-[#FF5A00] hover:border-[#FF5A00]/40 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-foreground mb-5">Frequently Asked Questions</h2>
          <FaqAccordion faqs={FAQS} />
        </div>
      </div>
    </MainLayout>
  );
}
