'use client';

import emailjs from '@emailjs/browser';
import { apiBase } from '@/lib/platform';

// --- For User Invitations & General Contact ---
export interface ContactEmailParams {
    to_email: string;
    to_name: string;
    business_name: string;
    inviter_name: string;
    invitation_link: string;
}

export const sendInvitationEmail = async (params: ContactEmailParams) => {
    try {
        const response = await fetch(`${apiBase()}/api/emails/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });

        const text = await response.text();
        let data: any = {};
        try {
            data = JSON.parse(text);
        } catch {
            if (!response.ok) {
                throw new Error('Email service is currently unreachable. Please check your connection.');
            }
            throw new Error('Received an invalid response from email service.');
        }

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error: any) {
        console.error('[Email API] Failed to send invitation email:', error.message || error);
        throw error;
    }
};


// --- For Receipt Emails ---
export interface ReceiptEmailParams {
    to_email: string;
    to_name: string;
    business_name: string;
    receipt_id: string;
    items_html: string;
    currency_symbol: string;
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
    payment_method: string;
    date: string;
}

export const sendReceiptEmail = async (params: ReceiptEmailParams) => {
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_RECEIPT_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_RECEIPT_TEMPLATE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_RECEIPT_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
        const missing = [
            !serviceId && 'NEXT_PUBLIC_EMAILJS_RECEIPT_SERVICE_ID',
            !templateId && 'NEXT_PUBLIC_EMAILJS_RECEIPT_TEMPLATE_ID',
            !publicKey && 'NEXT_PUBLIC_EMAILJS_RECEIPT_PUBLIC_KEY'
        ].filter(Boolean).join(', ');
        const errorMessage = `EmailJS receipt service is not fully configured. Missing keys: ${missing}. Please check your .env file and restart the server.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    try {
        const response = await emailjs.send(serviceId, templateId, params as any, publicKey);
        return response;
    } catch (error: any) {
        // emailjs errors sometimes are objects that don't stringify well, or network errors (TypeError)
        const errorMessage = error?.text || error?.message || (typeof error === 'object' ? JSON.stringify(error) : error);
        console.error('[EmailJS] Failed to send receipt email:', errorMessage);
        throw error;
    }
};

// --- For Marketing Contact Form ---
export const sendContactFormEmail = async (form: HTMLFormElement) => {
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_CONTACT_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE_ID; // Often same as invitation
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_CONTACT_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
        const missing = [
            !serviceId && 'NEXT_PUBLIC_EMAILJS_CONTACT_SERVICE_ID',
            !templateId && 'NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE_ID',
            !publicKey && 'NEXT_PUBLIC_EMAILJS_CONTACT_PUBLIC_KEY'
        ].filter(Boolean).join(', ');
        const errorMessage = `EmailJS contact form service is not fully configured. Missing keys: ${missing}. Please check your .env file and restart the server.`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    return emailjs.sendForm(serviceId, templateId, form, publicKey);
}
