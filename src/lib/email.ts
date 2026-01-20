'use client';

import emailjs from '@emailjs/browser';
import { EMAILJS_TEMPLATES } from './email-templates';

export interface ReceiptEmailParams {
    to_email: string;
    to_name: string;
    plan_name: string;
    amount_paid: string;
    expiry_date: string;
    business_name: string;
}

export const sendSubscriptionReceipt = async (params: ReceiptEmailParams) => {
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = EMAILJS_TEMPLATES.SUBSCRIPTION_RECEIPT;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey || templateId === '') {
        console.error('EmailJS is not configured for subscription receipts.');
        return Promise.reject('EmailJS not configured for subscription receipts.');
    }

    return emailjs.send(serviceId, templateId, params as any, publicKey);
}

export interface InvitationEmailParams {
    to_email: string;
    to_name: string;
    business_name: string;
    inviter_name: string;
}

export const sendInvitationEmail = async (params: InvitationEmailParams) => {
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    // Always use the contact template as the primary/fallback template for invitations.
    const templateId = EMAILJS_TEMPLATES.CONTACT_US;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey || templateId === '') {
        console.error('EmailJS service ID, public key, or the Contact Us template ID is not configured.');
        return Promise.reject('EmailJS Contact Us template is not configured.');
    }

    // The universal template will handle rendering based on the `inviter_name` parameter.
    return emailjs.send(serviceId, templateId, params as any, publicKey);
};
