
'use client';
import { Check, Github, Linkedin, Mail, Phone, Send, Twitter, Loader2 } from "lucide-react";
import BackToTopButton from '@/components/back-to-top-button';
import Link from "next/link";
import React, { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import { useToast } from '@/hooks/use-toast';
import { EMAILJS_TEMPLATES } from "@/lib/email-templates";

export default function MarketingFooter() {
  const form = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const sendEmail = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.current) return;

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = EMAILJS_TEMPLATES.CONTACT_US;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey || serviceId === 'your_service_id') {
      toast({
        variant: 'destructive',
        title: 'EmailJS Not Configured',
        description: 'The email service has not been configured by the administrator.',
      });
      return;
    }

    setIsSending(true);

    emailjs.sendForm(serviceId, templateId, form.current, publicKey)
      .then((result) => {
        toast({ variant: 'success', title: 'Message Sent!', description: 'We will get back to you shortly.' });
        form.current?.reset();
      }, (error) => {
        toast({ variant: 'destructive', title: 'Send Failed', description: 'Could not send message. Please try again later.' });
      })
      .finally(() => {
        setIsSending(false);
      });
  };

  return (
    <footer id="contact" className="bg-stone-950 w-full max-w-none gap-x-4 gap-y-4">
      <div className="overflow-hidden max-w-7xl mx-auto relative gap-x-4 gap-y-4 bg-stone-200">
        <div className="z-10 sm:p-12 md:p-16 bg-stone-950 pt-12 pr-8 pb-8 pl-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-12 border-b border-white/10">
            <div className="lg:col-span-4 gap-x-2 gap-y-2">
              <div className="flex cursor-pointer mb-8 gap-x-2 gap-y-2 items-center">
                    <span className="text-4xl font-bold text-white font-instrument-serif">Zeneva</span>
                </div>
              <p className="max-w-3xl text-white/70">Ready to take control of your inventory? Tell us a bit about
                your business and we’ll get back within one business day.</p>

              <div className="sm:p-6 md:p-8 border rounded-md mt-6 pt-5 pr-5 pb-5 pl-5 bg-white/5 border-white/10" id="contact-form-section">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="inline-flex gap-2 text-xs ring-1 rounded-full pt-1 pr-2.5 pb-1 pl-2.5 gap-x-2 gap-y-2 items-center text-emerald-300 bg-emerald-400/10 ring-emerald-300/20">
                      <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-emerald-400"></span>
                      Time slots available
                    </div>
                    <h4 className="font-semibold tracking-tight text-white">Get a demo of Zeneva and start building your next success story.</h4>
                    <ul className="space-y-2 text-sm text-neutral-300">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-emerald-400" />
                        <span>Senior engineers and designers only — no handoffs, no fluff.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-emerald-400" />
                        <span>Transparent weekly demos, metrics, and delivery plans.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 text-emerald-400" />
                        <span>Security, accessibility, and performance baked-in.</span>
                      </li>
                    </ul>
                    <div className="flex items-center gap-3 pt-2 text-sm">
                      <a href="mailto:nexuscraftx@gmail.com" className="inline-flex items-center gap-2 transition hover:text-amber-300 text-white">nexuscraftx@gmail.com</a>
                      <span className="text-white/20">•</span>
                      <a href="https://wa.me/2349064233805" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition text-white hover:text-amber-300">
                        <Phone className="w-4 h-4" />
                        +234 906 423 3805
                      </a>
                    </div>
                  </div>

                  <form ref={form} onSubmit={sendEmail} className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 gap-x-4 gap-y-4" id="contact-form">
                    <div className="sm:col-span-1">
                      <label htmlFor="name" className="block text-xs font-medium mb-1 text-white/80">Your name</label>
                      <input id="name" name="from_name" type="text" required placeholder="Jane Doe" className="placeholder-white/40 outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-300 transition text-sm w-full border rounded pt-2.5 pr-3 pb-2.5 pl-3 text-white bg-white/10 border-white/10" />
                    </div>
                    <div className="sm:col-span-1">
                      <label htmlFor="email" className="block text-xs font-medium mb-1 text-white/80">Email</label>
                      <input name="from_email" type="email" required placeholder="jane@company.com" className="placeholder-white/40 outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-300 transition text-sm w-full border rounded pt-2.5 pr-3 pb-2.5 pl-3 text-white bg-white/10 border-white/10" id="email" />
                    </div>
                    <div className="sm:col-span-1">
                      <label htmlFor="company" className="block text-xs font-medium mb-1 text-white/80">Company</label>
                      <input id="company" name="company" type="text" placeholder="Acme Inc." className="placeholder-white/40 outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-300 transition text-sm w-full border rounded pt-2.5 pr-3 pb-2.5 pl-3 text-white bg-white/10 border-white/10" />
                    </div>
                    <div className="sm:col-span-1">
                      <label htmlFor="project-type" className="block text-xs font-medium mb-1 text-white/80">Primary Goal</label>
                      <select id="project-type" name="project_type" className="appearance-none outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-300 transition text-sm w-full border rounded pt-2.5 pr-3 pb-2.5 pl-3 text-white bg-white/10 border-white/10">
                              <option className="bg-neutral-900" value="inventory">Inventory Management</option>
                              <option className="bg-neutral-900" value="pos">Point of Sale</option>
                              <option className="bg-neutral-900" value="analytics">Sales Analytics</option>
                              <option className="bg-neutral-900" value="full-suite">Full Suite</option>
                            </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="message" className="block text-xs font-medium mb-1 text-white/80">How can we help?</label>
                      <textarea name="message" rows={4} placeholder="A few sentences about your business goals and current challenges." className="placeholder-white/40 outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-300 transition text-sm w-full border rounded pt-2.5 pr-3 pb-2.5 pl-3 text-white bg-white/10 border-white/10" id="message"></textarea>
                    </div>
                    <div className="sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex gap-2 text-xs items-center text-white/70">
                        <input id="nda" name="nda_request" type="checkbox" className="h-4 w-4 rounded focus:ring-amber-400/60 bg-white/10 border-white/20 text-amber-400" />
                        <label htmlFor="nda">Please send an NDA</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="submit" disabled={isSending} className="inline-flex transition text-sm font-medium ring-1 rounded pt-2.5 pr-4 pb-2.5 pl-4 shadow gap-x-2 gap-y-2 items-center hover:bg-amber-300 text-neutral-900 bg-stone-50 disabled:opacity-50">
                                {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <Send className="w-4 h-4" />
                                {isSending ? 'Sending...' : 'Send request'}
                              </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 pt-12">
            <div className="">
              <h4 className="text-xs uppercase tracking-[0.2em] text-white/80">Services</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="/#features" className="transition inline-flex items-center gap-2 text-neutral-300 hover:text-white">Inventory</a></li>
                <li><a href="/#features" className="transition inline-flex items-center gap-2 text-neutral-300 hover:text-white">Sales</a></li>
                <li><a href="/#features" className="transition inline-flex items-center gap-2 text-neutral-300 hover:text-white">Customers</a></li>
              </ul>
            </div>
            <div className="">
              <h4 className="text-xs uppercase tracking-[0.2em] text-white/80">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="#" className="transition text-neutral-300 hover:text-white">Case Studies</Link></li>
                <li><Link href="/blog" className="transition text-neutral-300 hover:text-white">Blog</Link></li>
                <li><Link href="#" className="transition text-neutral-300 hover:text-white">Open Source</Link></li>
              </ul>
            </div>
            <div className="">
              <h4 className="text-xs uppercase tracking-[0.2em] text-white/80">Company</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="#" className="transition text-neutral-300 hover:text-white">About</Link></li>
                <li><Link href="#" className="transition text-neutral-300 hover:text-white">Principles</Link></li>
                <li><Link href="#contact" className="transition text-neutral-300 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div className="">
              <h4 className="uppercase text-xs tracking-[0.2em] text-white/80">Stay in touch</h4>
              <form id="subscribe" className="mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
                  <input type="email" name="subscribeEmail" required placeholder="you@example.com" className="placeholder-white/40 outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-300 transition text-xs w-full border rounded pt-2.5 pr-3 pb-2.5 pl-9 text-white bg-white/10 border-white/10" />
                </div>
                <button type="submit" className="inline-flex gap-2 transition text-xs font-medium ring-1 rounded pt-2.5 pr-3.5 pb-2.5 pl-3.5 gap-x-2 gap-y-2 items-center hover:bg-amber-300 hover:ring-amber-200 text-neutral-900 bg-white ring-white/80">
                      Join
                    </button>
              </form>
              <div className="mt-4 flex items-center gap-3">
                <a href="#" aria-label="GitHub" className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 transition bg-white/5 ring-white/10 text-white/80 hover:text-white hover:bg-white/10">
                  <Github className="w-[16px] h-[16px]" style={{color: 'rgb(255, 255, 255)'}} />
                </a>
                <a href="#" aria-label="X" className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 transition bg-white/5 ring-white/10 text-white/80 hover:text-white hover:bg-white/10">
                  <Twitter className="w-[16px] h-[16px]" style={{color: 'rgb(255, 255, 255)'}} />
                </a>
                <a href="#" aria-label="LinkedIn" className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 transition bg-white/5 ring-white/10 text-white/80 hover:text-white hover:bg-white/10">
                  <Linkedin className="w-[16px] h-[16px]" style={{color: 'rgb(255, 255, 255)'}} />
                </a>
                <a href="https://wa.me/2349064233805" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 transition bg-white/5 ring-white/10 text-white/80 hover:text-white hover:bg-white/10">
                  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-[16px] h-[16px]" fill="currentColor"><title>WhatsApp</title><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-white/10">
            <p className="text-sm text-white/60">© 2026 Zeneva. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm text-white/60">
              <a href="#" className="transition hover:text-white">Privacy</a>
              <span className="hidden sm:block text-white/20">•</span>
              <a href="#" className="transition hover:text-white">Terms</a>
              <span className="hidden sm:block text-white/20">•</span>
              <BackToTopButton />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
