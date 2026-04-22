'use client';

import React from 'react';
import { Mail, Phone, MessageSquare, Send, ArrowRight, HelpCircle, MapPin, Loader2, MessageCircle } from 'lucide-react';
import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { sendContactFormEmail } from '@/lib/email';
import { AppConfig } from '@/lib/config';

export default function ContactPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const formRef = React.useRef<HTMLFormElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;

        setIsSubmitting(true);
        try {
            await sendContactFormEmail(formRef.current);
            toast({
                variant: 'success',
                title: 'Message Sent!',
                description: "We've received your message and will get back to you shortly.",
            });
            formRef.current.reset();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: error.message || 'Something went wrong. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <MarketingHeader />

            <main>
                {/* Hero Section */}
                <section className="relative flex items-center justify-center px-6 pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-[#F9F8F6]">
                    <div className="absolute inset-0">
                        <svg aria-hidden="true" className="w-full h-full opacity-[0.03] fill-stone-950 stroke-stone-950 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
                            <defs>
                                <pattern id="contact-grid" width="40" height="40" patternUnits="userSpaceOnUse" x="-1" y="-1">
                                    <path d="M.5 40V.5H40" fill="none" strokeDasharray="4 2"></path>
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" strokeWidth="0" fill="url(#contact-grid)"></rect>
                        </svg>
                    </div>

                    <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/10 bg-white/50 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all">
                            <Mail className="w-4 h-4 text-primary animate-pulse" />
                            <span className="text-sm font-medium text-primary">Get in touch</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-slate-900">
                            Contact Us
                        </h1>
                        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                            Have questions or feedback? We'd love to hear from you. We typically respond within 24 hours.
                        </p>
                    </div>
                </section>

                {/* Main Content */}
                <section className="py-20 md:py-32 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-16 md:gap-24">
                            {/* Left Column: Info */}
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-bold text-slate-900">Reach out to our team</h2>
                                    <p className="text-slate-600 text-lg">
                                        Choose the method that works best for you. Our support team is ready to help you optimize your business operations.
                                    </p>
                                </div>

                                <div className="grid gap-6">
                                    <ContactCard 
                                        href="mailto:zenevapos@gmail.com"
                                        icon={<Mail className="w-6 h-6 text-primary" />}
                                        title="Email Support"
                                        description="For general inquiries and technical help."
                                        info="zenevapos@gmail.com"
                                    />
                                    <ContactCard 
                                        href="https://wa.me/2349064233805"
                                        icon={<MessageCircle className="w-6 h-6 text-emerald-500" />}
                                        title="WhatsApp"
                                        description="Chat directly with our success managers."
                                        info="+234 906 423 3805"
                                        isExternal
                                    />
                                    <ContactCard 
                                        href="/help-center"
                                        icon={<HelpCircle className="w-6 h-6 text-orange-500" />}
                                        title="Help Center"
                                        description="Browse our knowledge base and tutorials."
                                        info="Visit Knowledge Base"
                                    />
                                </div>

                                <div className="p-8 rounded-2xl bg-slate-900 text-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-colors"></div>
                                    <h3 className="text-xl font-semibold mb-2">Location</h3>
                                    <div className="flex items-start gap-3 text-slate-300">
                                        <MapPin className="w-5 h-5 mt-1 text-primary shrink-0" />
                                        <p>Lagos, Nigeria. Serving businesses globally.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Form */}
                            <div className="relative">
                                {/* Decorative elements */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>

                                <form 
                                    ref={formRef}
                                    onSubmit={handleSubmit}
                                    className="relative bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 md:p-12 space-y-8"
                                >
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</label>
                                            <input 
                                                id="name"
                                                name="from_name"
                                                required 
                                                type="text" 
                                                placeholder="John Doe"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all bg-slate-50/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="email" className="text-sm font-medium text-slate-700">Work Email</label>
                                            <input 
                                                id="email"
                                                name="from_email"
                                                required 
                                                type="email" 
                                                placeholder="john@company.com"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all bg-slate-50/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="subject" className="text-sm font-medium text-slate-700">Subject</label>
                                        <select 
                                            id="subject"
                                            name="project_type"
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all bg-slate-50/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                                        >
                                            <option value="">Select a topic</option>
                                            <option value="sales">Sales & Pricing</option>
                                            <option value="support">Technical Support</option>
                                            <option value="partnership">Partnership</option>
                                            <option value="feedback">Product Feedback</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="message" className="text-sm font-medium text-slate-700">Message</label>
                                        <textarea 
                                            id="message"
                                            name="message"
                                            required 
                                            rows={6}
                                            placeholder="How can we help your business flourish?"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all bg-slate-50/50 resize-none"
                                        />
                                    </div>

                                    <Button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="w-full h-14 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span>Send Message</span>
                                                <Send className="w-5 h-5" />
                                            </>
                                        )}
                                    </Button>
                                    
                                    <p className="text-center text-xs text-slate-500">
                                        By submitting, you agree to our <a href="/legal/privacy-policy" className="underline hover:text-primary">Privacy Policy</a>
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <MarketingFooter />
        </div>
    );
}

function ContactCard({ href, icon, title, description, info, isExternal = false }: { 
    href: string, 
    icon: React.ReactNode, 
    title: string, 
    description: string, 
    info: string,
    isExternal?: boolean
}) {
    return (
        <a 
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="group flex flex-col sm:flex-row items-start gap-4 p-6 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-slate-50 transition-all duration-300"
        >
            <div className="shrink-0 w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-sm text-slate-600">{description}</p>
                <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm font-medium text-slate-900">{info}</span>
                    <ArrowRight className="w-3 h-3 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
            </div>
        </a>
    );
}
