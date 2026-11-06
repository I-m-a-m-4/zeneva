import { NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/firebase/admin';
import { sendEmail } from '@/lib/server/resend';

export const dynamic = 'force-dynamic';

// These values end up inside the HTML body, so escape them rather than trust
// the client. The recipient is always the address on the verified token.
const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function POST(req: Request) {
  try {
    // This sends from our verified domain with the server's Resend key. The
    // caller is the account that just signed up; the body cannot choose the
    // recipient.
    if (!adminAuth) {
      return NextResponse.json({ error: 'Server authentication is not configured.' }, { status: 503 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(bearer, true);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim().slice(0, 100) : '';
    const businessName = typeof body?.businessName === 'string' ? body.businessName.trim().slice(0, 100) : '';

    let email = decoded.email;
    if (!email && adminFirestore) {
      const userSnap = await adminFirestore.collection('users').doc(decoded.uid).get();
      email = userSnap.exists ? userSnap.data()?.email : undefined;
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'No email address is linked to this account.' }, { status: 400 });
    }

    const name = escapeHtml(firstName || email.split('@')[0]);
    const bName = escapeHtml(businessName || 'your business');

    const bodyHtml = `
      <h2 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 16px; text-align: center;">
        Start with one product.
      </h2>
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://res.cloudinary.com/dd1czj85j/image/upload/v1789026565/zeneva/zeneva_email_3d_first_sale_1789026565531.jpg" alt="Welcome to Zeneva" width="280" height="280" style="display: block; border-radius: 24px; width: 100%; max-width: 280px; height: auto; margin: 0 auto;" />
      </div>
      <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; text-align: center;">
        Hi ${name}, ${bName} is ready for your first catalog item. Add an item, snap a barcode, or record a quick sale in under 30 seconds.
      </p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://zeneva.space/dashboard" style="background-color: #ea580c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: bold; display: inline-block;">
          Add your first product
        </a>
      </div>
    `;

    await sendEmail({
      to: email,
      name: name,
      subject: 'Welcome to Zeneva! Your store is ready.',
      body: bodyHtml,
      type: 'marketing',
      wrap: true
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to send welcome email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
