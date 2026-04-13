import { Resend } from 'resend';
import { adminFirestore } from '@/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

const resend = new Resend(process.env.RESEND_API_KEY);
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
 * Sends an email via Resend with 1x1 tracking pixel.
 */
export async function sendEmail(params: EmailParams): Promise<string> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured in environment variables.');
  }

  const trackId = uuidv4();
  
  // 1. Create Log document in Firestore
  await adminFirestore.collection('follow_up_logs').doc(trackId).set({
    sentTo: params.to,
    recipientName: params.name,
    subject: params.subject,
    sentAt: new Date(),
    status: 'pending',
    businessId: params.businessId || 'unknown',
    type: params.type || 'follow-up',
    openCount: 0
  });

  // 2. Inject Tracking Pixel
  const trackingPixel = `<img src="${BASE_URL}/api/track?tid=${trackId}" width="1" height="1" style="display:none;" />`;
  const htmlWithPixel = `${params.body}${trackingPixel}`;

  try {
    // 3. Send Email via Resend
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [params.to],
      subject: params.subject,
      html: htmlWithPixel,
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
