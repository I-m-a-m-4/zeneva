import { Resend } from 'resend';
import { adminFirestore } from '@/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://zeneva.space';

/**
 * Lazy-initialized Resend client to ensure environment variables are loaded.
 */
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

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
    <div style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background-color: #fcfcfc; padding: 25px; border-bottom: 1px solid #f5f5f5;">
        <div style="font-size: 20px; font-weight: 800; color: #f97316; letter-spacing: -0.5px;">Zeneva</div>
      </div>
      
      <div style="padding: 40px 30px; color: #1f2937; line-height: 1.7; font-size: 15px;">
        ${body}
      </div>
      
      <div style="margin: 0 30px; padding: 30px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #6b7280;">
        <p style="margin-bottom: 15px;">Talk soon,<br/><strong>Zeneva Team</strong></p>
        <p style="margin: 0; font-size: 12px; line-height: 1.5;">
          <strong>Account Executive</strong><br/>
          Zeneva POS & Inventory<br/>
          <a href="https://zeneva.space" style="color: #f97316; text-decoration: none; font-weight: 600;">Launch your workspace →</a>
        </p>
      </div>

      <!-- ZENEVA Premium Branded Bar - Orange -->
      <div style="padding: 0 30px 40px;">
        <div style="height: 50px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 8px; display: table; width: 100%; border-collapse: separate;">
          <div style="display: table-cell; vertical-align: middle; text-align: center; color: white; font-weight: 900; letter-spacing: 3px; font-size: 14px; text-transform: capitalize;">
            Zeneva POS & Inventory
          </div>
        </div>
      </div>
      
      <div style="background-color: #fffaf0; border-top: 1px solid #ffedd5; padding: 40px 30px; text-align: center; font-size: 11px; color: #7c2d12;">
        <div style="font-weight: 800; letter-spacing: 0.2em; margin-bottom: 20px; color: #ea580c; font-size: 14px; text-transform: capitalize;">
          Zeneva POS & Inventory
        </div>
        &copy; ${year} Zeneva POS & Inventory. All rights reserved.<br/>
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables.');
  }

  const trackId = uuidv4();
  
  // 1. Wrap in Premium Template
  const htmlWithBranding = wrapInTemplate(params.body, trackId);
  
  // 2. Create Log document in Firestore with Behavioral Intelligence
  await adminFirestore.collection('follow_up_logs').doc(trackId).set({
    sentTo: params.to,
    recipientName: params.name,
    subject: params.subject,
    sentAt: new Date(),
    status: 'pending',
    businessId: params.businessId || 'unknown',
    type: params.type || 'follow-up',
    behavior: params.behaviorContext || {}, 
    html: htmlWithBranding, 
    openCount: 0
  });

  try {
    // 3. Send Email via Resend
    const resend = getResendClient();
    if (!resend) {
      throw new Error('Resend client not initialized. Check RESEND_API_KEY environment variable.');
    }

    const fromAddress = 'Zeneva <hello@zeneva.space>';
    
    const { data, error } = await resend.emails.send({
      from: fromAddress,
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
