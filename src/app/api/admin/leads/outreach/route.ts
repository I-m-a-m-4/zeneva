import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/actions/admin-guard';
import { sendEmail } from '@/lib/server/resend';
import { generateRetailOutreachHtml } from '@/lib/server/retail-outreach-email';
import { adminFirestore } from '@/firebase/admin';
import { validateEmailWithZeroBounce } from '@/lib/server/zerobounce';

export const dynamic = 'force-dynamic';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function extractToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const tokenParam = req.nextUrl.searchParams.get('token');
  if (tokenParam) return tokenParam.trim();
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    try {
      await requireSuperAdmin(token);
    } catch (authErr: any) {
      return NextResponse.json(
        { ok: false, error: authErr.message || 'Unauthorized access. Super admin required.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { 
      mode = 'single', // 'single' | 'daily_batch'
      leadId,
      email,
      businessName,
      category = 'General Retail',
      recipientName,
      location = 'Nigeria',
      customSubject,
      customBody,
      batchLimit = 5,
    } = body;

    const db = adminFirestore;
    if (!db) {
      return NextResponse.json({ ok: false, error: 'Database unavailable.' }, { status: 500, headers: corsHeaders });
    }

    // Single Lead Outreach
    if (mode === 'single') {
      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { ok: false, error: 'A valid recipient email address is required.' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Pre-flight deliverability check via ZeroBounce to protect domain reputation
      const verification = await validateEmailWithZeroBounce(email);
      if (!verification.canSend) {
        if (leadId) {
          try {
            await db.collection('discovered_leads').doc(leadId).update({
              status: 'invalid_email',
              emailValidationStatus: verification.status,
              emailValidationReason: verification.reason,
              verifiedAt: new Date().toISOString(),
            });
          } catch (_) {}
        }

        return NextResponse.json(
          {
            ok: false,
            error: `Email deliverability blocked: ${verification.reason}`,
            validation: verification,
          },
          { status: 422, headers: corsHeaders }
        );
      }

      const generated = generateRetailOutreachHtml({
        businessName: businessName || 'Retail Partner',
        category,
        recipientEmail: email,
        recipientName,
        location,
      });

      const subject = customSubject || generated.subject;
      const htmlBody = customBody ? customBody : generated.html;

      const trackId = await sendEmail({
        to: email.trim(),
        name: recipientName || businessName || 'Retail Lead',
        subject,
        body: htmlBody,
        type: 'marketing',
        wrap: false, // We supply the complete responsive branded retail shell
        segment: `cold-lead-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        behaviorContext: {
          leadId: leadId || 'untracked',
          businessName,
          category,
          source: 'lead-studio',
        },
      });

      // Update lead in Firestore if saved
      if (leadId) {
        try {
          await db.collection('discovered_leads').doc(leadId).update({
            status: 'contacted',
            contactedAt: new Date().toISOString(),
            lastOutreachSubject: subject,
            lastTrackId: trackId,
            outreachCount: (adminFirestore as any).FieldValue?.increment?.(1) || 1,
          });
        } catch (_) {}
      }

      return NextResponse.json(
        {
          ok: true,
          trackId,
          recipient: email,
          subject,
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Daily Automated Batch Dispatch
    if (mode === 'daily_batch') {
      const maxToSend = Math.min(Math.max(Number(batchLimit) || 5, 1), 20); // Cap at 20 per batch for deliverability

      // Query saved leads with email that have not been contacted yet
      const snapshot = await db
        .collection('discovered_leads')
        .where('status', 'in', ['saved', 'queued', 'discovered'])
        .limit(maxToSend * 3)
        .get();

      const leadsWithEmail = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(l => l.email && l.email.includes('@') && l.status !== 'contacted')
        .slice(0, maxToSend);

      if (leadsWithEmail.length === 0) {
        return NextResponse.json(
          {
            ok: true,
            sentCount: 0,
            message: 'No pending leads with verified emails found in queue for daily dispatch.',
          },
          { status: 200, headers: corsHeaders }
        );
      }

      const results: { leadId: string; email: string; success: boolean; error?: string; skipped?: boolean }[] = [];

      for (const lead of leadsWithEmail) {
        try {
          // ZeroBounce pre-check in batch to prevent domain reputation damage
          const verification = await validateEmailWithZeroBounce(lead.email);
          if (!verification.canSend) {
            await db.collection('discovered_leads').doc(lead.id).update({
              status: 'invalid_email',
              emailValidationStatus: verification.status,
              emailValidationReason: verification.reason,
              verifiedAt: new Date().toISOString(),
            });

            results.push({
              leadId: lead.id,
              email: lead.email,
              success: false,
              skipped: true,
              error: `Skipped: ZeroBounce flagged as ${verification.status} (${verification.reason})`,
            });
            continue;
          }

          const generated = generateRetailOutreachHtml({
            businessName: lead.title || lead.companyName || 'Retail Partner',
            category: lead.category || 'General Retail',
            recipientEmail: lead.email,
            recipientName: lead.decisionMaker || lead.contactName,
            location: lead.location || 'Nigeria',
          });

          const trackId = await sendEmail({
            to: lead.email.trim(),
            name: lead.decisionMaker || lead.title || 'Retail Lead',
            subject: generated.subject,
            body: generated.html,
            type: 'marketing',
            wrap: false,
            segment: `daily-drip-${(lead.category || 'retail').toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            behaviorContext: {
              leadId: lead.id,
              businessName: lead.title,
              category: lead.category,
              dripBatch: true,
            },
          });

          await db.collection('discovered_leads').doc(lead.id).update({
            status: 'contacted',
            contactedAt: new Date().toISOString(),
            lastOutreachSubject: generated.subject,
            lastTrackId: trackId,
          });

          results.push({ leadId: lead.id, email: lead.email, success: true });
        } catch (err: any) {
          results.push({ leadId: lead.id, email: lead.email, success: false, error: err.message });
        }
      }

      const successful = results.filter(r => r.success).length;

      return NextResponse.json(
        {
          ok: true,
          sentCount: successful,
          totalAttempted: results.length,
          results,
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid outreach mode specified.' },
      { status: 400, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[api/admin/leads/outreach] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to dispatch outreach email.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

