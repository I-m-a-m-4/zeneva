import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminAuth, adminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

// Initialize Resend. In production, ensure RESEND_API_KEY is in your environment variables.
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

// Every value below is attacker-controlled from the client and lands inside an
// HTML document, so escape before interpolating. The invitation link is also
// parsed and protocol-checked, which blocks `javascript:` and attribute escapes.
const escapeHtml = (value: unknown) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
    try {
        // This sends mail from our verified domain with the server's key, so the
        // caller must be a signed-in admin of the business doing the inviting.
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

        if (!adminFirestore) {
            return NextResponse.json({ error: 'Database unavailable.' }, { status: 500 });
        }

        const callerSnap = await adminFirestore.collection('users').doc(decoded.uid).get();
        if (!callerSnap.exists) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const caller = callerSnap.data() || {};
        if (caller.status === 'suspended' || !['admin', 'owner', 'super-admin'].includes(caller.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const to_email = typeof body?.to_email === 'string' ? body.to_email.trim() : '';
        const to_name = typeof body?.to_name === 'string' ? body.to_name.trim().slice(0, 100) : '';
        const business_name = typeof body?.business_name === 'string' ? body.business_name.trim().slice(0, 100) : '';
        const inviter_name = typeof body?.inviter_name === 'string' ? body.inviter_name.trim().slice(0, 100) : '';
        const invitation_link = typeof body?.invitation_link === 'string' ? body.invitation_link.trim() : '';

        if (!EMAIL_PATTERN.test(to_email) || !invitation_link) {
            return NextResponse.json({ error: 'A valid recipient email and invitation link are required.' }, { status: 400 });
        }
        if (to_email.length > 320 || invitation_link.length > 2000) {
            return NextResponse.json({ error: 'Invitation payload is too large.' }, { status: 400 });
        }

        let invitationUrl: URL;
        try {
            invitationUrl = new URL(invitation_link);
        } catch {
            return NextResponse.json({ error: 'Invalid invitation link.' }, { status: 400 });
        }
        if (invitationUrl.protocol !== 'https:' && invitationUrl.protocol !== 'http:') {
            return NextResponse.json({ error: 'Invalid invitation link.' }, { status: 400 });
        }

        const safeBusinessName = escapeHtml(business_name);
        const safeToName = escapeHtml(to_name);
        const safeInviterName = escapeHtml(inviter_name);
        const safeInvitationLink = escapeHtml(invitationUrl.toString());

        const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>You've been invited to join ${safeBusinessName} on Zeneva</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #f9f9f9;
                    margin: 0;
                    padding: 0;
                    color: #333333;
                }
                .container {
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                }
                .header {
                    background-color: #1e293b;
                    padding: 40px 20px;
                    text-align: center;
                    border-bottom: 4px solid #f97316;
                }
                .header h1 {
                    color: #ffffff;
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                    letter-spacing: -0.5px;
                }
                .content {
                    padding: 40px 30px;
                    line-height: 1.6;
                }
                .content h2 {
                    font-size: 20px;
                    color: #111827;
                    margin-top: 0;
                }
                .content p {
                    color: #4b5563;
                    margin-bottom: 20px;
                }
                .button-container {
                    text-align: center;
                    margin: 30px 0;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #f97316;
                    color: #ffffff !important;
                    text-decoration: none;
                    font-weight: 600;
                    border-radius: 6px;
                }
                .button:hover {
                    background-color: #ea580c;
                }
                .footer {
                    background-color: #f3f4f6;
                    padding: 30px;
                    text-align: center;
                    font-size: 14px;
                    color: #6b7280;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Zeneva</h1>
                </div>
                <div class="content">
                    <h2>You've been invited!</h2>
                    <p>Hello ${safeToName},</p>
                    <p><strong>${safeInviterName}</strong> has invited you to join <strong>${safeBusinessName}</strong> on Zeneva.</p>
                    <p>Zeneva is a powerful Point of Sale and Inventory Management system. Join your team to start managing sales, tracking inventory, and growing the business together.</p>
                    <div class="button-container">
                        <a href="${safeInvitationLink}" class="button">Accept Invitation</a>
                    </div>
                    <p>If you have any questions, please contact ${safeInviterName} directly.</p>
                    <p>Best regards,<br>The Zeneva Team</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Zeneva. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const response = await resend.emails.send({
            from: 'Zeneva <hello@zeneva.space>',
            to: [to_email],
            subject: `You've been invited to join ${business_name.slice(0, 100)} on Zeneva`,
            html: htmlTemplate,
        });

        if (response.error) {
            console.error('Resend Error:', response.error);
            return NextResponse.json({ error: response.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: response.data?.id }, { status: 200 });
    } catch (error: any) {
        console.error('Invitation email error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
