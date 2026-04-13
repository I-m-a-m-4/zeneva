import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';
import { sendEmail } from '@/lib/server/resend';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Admin Session
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!adminAuth) {
        return NextResponse.json({ success: false, message: 'Firebase Admin not initialized. Check env vars.' }, { status: 503 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    // You might want to check for a specific admin role or email here
    if (!decodedToken.email?.includes('admin') && decodedToken.email !== 'belloimam431@gmail.com' && decodedToken.email !== 'zenevapos@gmail.com') {
       // Optional: Add stricter admin check
    }

    // 2. Parse Body
    const body = await req.json();
    const { to, name, subject, html, businessId, type } = body;

    if (!to || !subject || !html) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // 3. Send Email
    const trackId = await sendEmail({
      to,
      name,
      subject,
      body: html,
      businessId,
      type
    });

    return NextResponse.json({ 
      success: true, 
      trackId, 
      message: 'Follow-up email sent successfully.' 
    });

  } catch (error: any) {
    console.error('Send Follow-Up Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
