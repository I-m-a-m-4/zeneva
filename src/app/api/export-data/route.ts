import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminAuth, adminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

// Initialize Resend. In production, ensure RESEND_API_KEY is in your environment variables.
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

// The export payload is a small profile object. Cap it so this endpoint cannot
// be used to push large attachments through the shared Resend quota.
const MAX_EXPORT_CHARS = 1_000_000;

export async function POST(req: Request) {
    try {
        // This endpoint sends mail from our verified domain with the server's
        // Resend key. Left open, it is an unauthenticated email relay: anyone
        // could send an arbitrary attachment to any address, from us. The
        // recipient must be the signed-in caller, never a value from the body.
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
        const data = body?.data;

        if (data === undefined || data === null || typeof data !== 'object') {
            return NextResponse.json({ error: 'Data is required.' }, { status: 400 });
        }

        // The address on the token is authoritative; the users document is the
        // fallback for tokens minted without the email claim.
        let email = decoded.email;
        if (!email) {
            const userSnap = adminFirestore
                ? await adminFirestore.collection('users').doc(decoded.uid).get()
                : null;
            email = userSnap?.exists ? userSnap.data()?.email : undefined;
        }

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'No email address is linked to this account.' }, { status: 400 });
        }

        const jsonString = JSON.stringify(data, null, 2);
        if (jsonString.length > MAX_EXPORT_CHARS) {
            return NextResponse.json({ error: 'Export payload is too large.' }, { status: 413 });
        }
        
        // Convert string to base64 for attachment
        const base64Data = Buffer.from(jsonString).toString('base64');
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Zeneva Data Export</title>
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
                .footer {
                    background-color: #f3f4f6;
                    padding: 30px;
                    text-align: center;
                    font-size: 14px;
                    color: #6b7280;
                }
                .socials {
                    margin-bottom: 20px;
                }
                .socials a {
                    display: inline-block;
                    margin: 0 10px;
                    color: #9ca3af;
                    text-decoration: none;
                    font-weight: 600;
                }
                .socials a:hover {
                    color: #f97316;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Zeneva</h1>
                </div>
                <div class="content">
                    <h2>Your Data Export is Ready</h2>
                    <p>Hello,</p>
                    <p>You recently requested an export of your personal and business data from Zeneva in accordance with GDPR data portability requirements.</p>
                    <p>We have securely attached your data to this email as a JSON file. This file contains your profile information, business configuration, and preferences as of <strong>${currentDate}</strong>.</p>
                    <p>If you did not request this export, please secure your account immediately or contact our support team.</p>
                    <p>Best regards,<br>The Zeneva Security Team</p>
                </div>
                <div class="footer">
                    <div class="socials">
                        <a href="https://twitter.com/zeneva_app">Twitter</a>
                        <a href="https://linkedin.com/company/zeneva">LinkedIn</a>
                        <a href="https://instagram.com/zeneva_hq">Instagram</a>
                    </div>
                    <p>&copy; ${new Date().getFullYear()} Zeneva. All rights reserved.</p>
                    <p>Lagos, Nigeria</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const response = await resend.emails.send({
            from: 'Zeneva Security <hello@zeneva.space>',
            to: [email],
            subject: 'Your Zeneva Data Export (GDPR)',
            html: htmlTemplate,
            attachments: [
                {
                    filename: 'zeneva-data-export.json',
                    content: base64Data,
                },
            ],
        });

        if (response.error) {
            console.error('Resend Error:', response.error);
            return NextResponse.json({ error: response.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: response.data?.id }, { status: 200 });
    } catch (error: any) {
        console.error('Data export error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
