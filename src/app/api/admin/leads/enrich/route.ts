import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/actions/admin-guard';
import { enrichLeadWithProspeo } from '@/lib/server/prospeo-client';
import { adminFirestore } from '@/firebase/admin';

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
    const { leadId, domain, companyName, contactName } = body;

    if (!domain && !companyName) {
      return NextResponse.json(
        { ok: false, error: 'Domain or company name is required for email waterfall enrichment.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await enrichLeadWithProspeo({
      domain,
      companyName,
      contactName,
    });

    // If a saved leadId was provided and an email was found, update the lead in Firestore
    if (leadId && result.email && adminFirestore) {
      try {
        await adminFirestore.collection('discovered_leads').doc(leadId).update({
          email: result.email,
          emailStatus: result.emailStatus,
          decisionMaker: result.fullName || null,
          jobTitle: result.jobTitle || null,
          enrichedAt: new Date().toISOString(),
          ...(result.phone ? { phone: result.phone } : {}),
        });
      } catch (_) {}
    }

    return NextResponse.json(
      {
        ok: true,
        enrichment: result,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[api/admin/leads/enrich] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to enrich lead email waterfall.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

