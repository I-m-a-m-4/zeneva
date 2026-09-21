import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend. In production, ensure RESEND_API_KEY is in your environment variables.
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export async function POST(req: Request) {
    try {
        const { to_email, to_name, business_name, inviter_name, invitation_link } = await req.json();

        if (!to_email || !invitation_link) {
            return NextResponse.json({ error: 'Email and invitation link are required.' }, { status: 400 });
        }

        const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>You've been invited to join ${business_name} on Zeneva</title>
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
                    <p>Hello ${to_name},</p>
                    <p><strong>${inviter_name}</strong> has invited you to join <strong>${business_name}</strong> on Zeneva.</p>
                    <p>Zeneva is a powerful Point of Sale and Inventory Management system. Join your team to start managing sales, tracking inventory, and growing the business together.</p>
                    <div class="button-container">
                        <a href="${invitation_link}" class="button">Accept Invitation</a>
                    </div>
                    <p>If you have any questions, please contact ${inviter_name} directly.</p>
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
            subject: `You've been invited to join ${business_name} on Zeneva`,
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
