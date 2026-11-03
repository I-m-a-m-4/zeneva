import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/actions/admin-guard';
import { searchLeadsWithExa } from '@/lib/server/exa-client';

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
    const { query, category = 'General Retail', location = 'Nigeria', numResults = 10, persona } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { ok: false, error: 'A search query is required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const leads = await searchLeadsWithExa({
      query: query.trim(),
      category,
      location,
      numResults: Number(numResults) || 10,
      persona,
    });

    return NextResponse.json(
      {
        ok: true,
        leads,
        count: leads.length,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[api/admin/leads/search] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to search leads using Exa.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
