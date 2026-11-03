import { NextRequest, NextResponse } from 'next/server';
import { verifyAndApplySubscription } from '@/lib/server/subscription-service';

export const dynamic = 'force-dynamic';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const idToken = extractToken(req);
    const body = await req.json().catch(() => ({}));

    const { reference, planId, cycleId, currency, businessId } = body;

    if (!reference || typeof reference !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'A valid payment reference is required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await verifyAndApplySubscription({
      reference,
      planId,
      cycleId,
      currency,
      idToken,
      businessId,
      source: 'client-api',
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('[api/subscription/activate] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error processing subscription.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
