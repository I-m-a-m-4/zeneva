import { NextResponse } from 'next/server';
import crypto from 'crypto';

// This is the secret you get from the Dodo Dashboard -> Developers -> Webhooks
const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headers = req.headers;

    const webhookId = headers.get('webhook-id');
    const webhookSignature = headers.get('webhook-signature');
    const webhookTimestamp = headers.get('webhook-timestamp');

    if (!webhookId || !webhookSignature || !webhookTimestamp) {
      return new NextResponse('Missing required webhook headers', { status: 400 });
    }

    if (!DODO_WEBHOOK_SECRET) {
      console.error('DODO_WEBHOOK_SECRET is not configured in .env.local');
      // We return 200 during initial setup so Dodo can verify the URL, 
      // but you MUST add the secret for actual security.
      return NextResponse.json({ received: true, warning: 'No secret configured' });
    }

    // Standard Webhooks Verification logic
    // The signature is an HMAC SHA256 of: webhook-id + '.' + webhook-timestamp + '.' + body
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
    
    // Webhook secrets from Standard Webhooks usually need to be decoded from base64 if they are in that format,
    // or used as-is if they are strings. Dodo's whsec_... is usually used as-is.
    const secret = DODO_WEBHOOK_SECRET.replace('whsec_', '');
    const secretBuffer = Buffer.from(secret, 'base64');
    
    const hmac = crypto.createHmac('sha256', secretBuffer);
    hmac.update(signedContent);
    const expectedSignature = hmac.digest('base64');

    // Standard Webhooks signature header can contain multiple signatures separated by space: "v1,SIGNATURE1 v1,SIGNATURE2"
    const passedSignatures = webhookSignature.split(' ');
    const isValid = passedSignatures.some(sig => {
      const [version, signature] = sig.split(',');
      return version === 'v1' && signature === expectedSignature;
    });

    if (!isValid) {
      console.error('Invalid Dodo Webhook signature');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('✅ Dodo Webhook Verified:', event.type);

    // --- Handle different event types ---
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.active':
      case 'subscription.updated':
        console.log(`Processing ${event.type} for business:`, event.data?.business_id);
        // TODO: Update business subscription status in Firestore
        // const { business_id, status, plan_id } = event.data;
        break;
        
      case 'payment.succeeded':
        console.log('Payment Succeeded:', event.data?.amount);
        // TODO: Record payment in audit logs or billing history
        break;
        
      case 'subscription.cancelled':
        console.log('Subscription Cancelled:', event.data?.business_id);
        // TODO: Handle cancellation
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Dodo Webhook Processing Error:', err.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
