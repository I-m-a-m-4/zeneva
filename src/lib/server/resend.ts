import { Resend } from 'resend';
import { adminFirestore } from '@/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://zeneva.space';
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Zeneva <onboarding@resend.dev>';

export interface EmailParams {
  to: string;
  name: string;
  subject: string;
  body: string; // HTML body
  businessId?: string;
  type?: string;
}

/**
 * Wraps the email body in a premium Zeneva template with a branded footer.
 */
function wrapInTemplate(body: string, trackId: string): string {
  const year = new Date().getFullYear();
  return `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
      <div style="padding: 20px 0;">
        ${body}
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        <p>Talk soon,<br/><strong>Bime from Zeneva</strong></p>
        <p>--<br/>Account Executive | Zeneva POS & Inventory<br/>
           <a href="https://zeneva.space" style="color: #6366f1; text-decoration: none;">Visit our workspace</a>
        </p>
      </div>

      <!-- HubSpot-style Branded Bar -->
      <div style="margin-top: 30px; height: 40px; background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
        <div style="color: white; font-weight: 800; letter-spacing: 2px; font-size: 14px; text-transform: uppercase;">
          ZENEVA POS & INVENTORY
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #999;">
        &copy; ${year} Zeneva Space. All rights reserved.<br/>
        You are receiving this because you showed interest in our intelligence engine.
      </div>

      <!-- Tracking Pixel -->
      <img src="${BASE_URL}/api/track?tid=${trackId}" width="1" height="1" style="display:none;" />
    </div>
  `;
}

/**
 * Sends an email via Resend with 1x1 tracking pixel and premium branding.
 */
export async function sendEmail(params: EmailParams & { behaviorContext?: any }): Promise<string> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured in environment variables.');
  }

  const trackId = uuidv4();
  
  // 1. Create Log document in Firestore with Behavioral Intelligence
  await adminFirestore.collection('follow_up_logs').doc(trackId).set({
    sentTo: params.to,
    recipientName: params.name,
    subject: params.subject,
    sentAt: new Date(),
    status: 'pending',
    businessId: params.businessId || 'unknown',
    type: params.type || 'follow-up',
    behavior: params.behaviorContext || {}, // Exploit why they quit here
    openCount: 0
  });

  // 2. Wrap in Premium Template
  const htmlWithBranding = wrapInTemplate(params.body, trackId);

  try {
    // 3. Send Email via Resend
    if (!resend) {
      throw new Error('Resend client not initialized. Check RESEND_API_KEY environment variable.');
    }
    const { data, error } = await resend.emails.send({
      from: 'Bime <bime@zeneva.space>',
      to: [params.to],
      replyTo: 'hello@zeneva.space',
      subject: params.subject,
      html: htmlWithBranding,
    });

    if (error) {
      throw error;
    }

    console.log('Email sent successfully via Resend:', data?.id);
    
    // Update log on success
    await adminFirestore.collection('follow_up_logs').doc(trackId).update({
      status: 'sent'
    });

    return trackId;

  } catch (error: any) {
    console.error(`Failed sending Resend email to ${params.to}:`, error.message);

    // Update log to failed
    await adminFirestore.collection('follow_up_logs').doc(trackId).update({
      status: 'failed',
      error: error.message
    });

    throw error;
  }
}
