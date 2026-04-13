import { Resend } from 'resend';
import { adminFirestore } from '@/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

const resend = (typeof process !== 'undefined' && process.env.RESEND_API_KEY) ? new Resend(process.env.RESEND_API_KEY) : null;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://zeneva.space';
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Bime <bime@zeneva.space>';

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
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background-color: #fcfcfc; padding: 25px; border-bottom: 1px solid #f5f5f5;">
        <div style="font-size: 20px; font-weight: 800; color: #f97316; letter-spacing: -0.5px;">ZENEVA</div>
      </div>
      
      <div style="padding: 40px 30px; color: #1f2937; line-height: 1.7; font-size: 15px;">
        ${body}
      </div>
      
      <div style="margin: 0 30px; padding: 30px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #6b7280;">
        <p style="margin-bottom: 15px;">Talk soon,<br/><strong>Bime from Zeneva</strong></p>
        <p style="margin: 0; font-size: 12px; line-height: 1.5;">
          <strong>Account Executive</strong><br/>
          Zeneva POS & Inventory<br/>
          <a href="https://zeneva.space" style="color: #f97316; text-decoration: none; font-weight: 600;">Launch your workspace →</a>
        </p>
      </div>

      <!-- ZENEVA Premium Branded Bar - Orange -->
      <div style="padding: 0 30px 40px;">
        <div style="height: 50px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 8px; display: table; width: 100%; border-collapse: separate;">
          <div style="display: table-cell; vertical-align: middle; text-align: center; color: white; font-weight: 900; letter-spacing: 3px; font-size: 14px; text-transform: uppercase;">
            ZENEVA POS & INVENTORY
          </div>
        </div>
      </div>
      
      <div style="background-color: #f9fafb; padding: 30px; text-align: center; font-size: 11px; color: #9ca3af;">
        &copy; ${year} Zeneva Space. All rights reserved.<br/>
        <div style="margin-top: 10px;">
          You requested intelligence updates from our engine. 
          <br/>To optimize your node settings, <a href="https://zeneva.space/settings" style="color: #6b7280; text-decoration: underline;">manage notifications here</a>.
        </div>
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
    html: htmlWithBranding, // Save full HTML for auditing
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
