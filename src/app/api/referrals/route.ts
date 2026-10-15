import { NextRequest, NextResponse } from 'next/server';
import {
  getReferralProgramDetails,
  validateReferralCode,
  applyReferralCode,
  qualifyReferralOnSale,
  claimReferralDirect,
  advanceReferralPhase
} from '@/actions/referral';

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

export async function GET(req: NextRequest) {
  try {
    const idToken = extractToken(req);
    if (!idToken) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized: missing authentication token' },
        { status: 401, headers: corsHeaders }
      );
    }

    const origin = req.headers.get('origin') || undefined;
    const result = await getReferralProgramDetails({ idToken, origin });
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[api/referrals] GET error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to retrieve referral details' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const idToken = extractToken(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { ok: false, error: 'Action parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === 'validate') {
      const result = await validateReferralCode(body.code || '');
      return NextResponse.json(result, { headers: corsHeaders });
    }

    // All actions below require authentication
    if (!idToken) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized: missing authentication token' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (action === 'apply') {
      const result = await applyReferralCode({ idToken, code: body.code || '' });
      return NextResponse.json(result, { headers: corsHeaders });
    }

    if (action === 'claim') {
      const result = await claimReferralDirect({ idToken, code: body.code || '' });
      return NextResponse.json(result, { headers: corsHeaders });
    }

    if (action === 'qualify') {
      const result = await qualifyReferralOnSale({ idToken });
      return NextResponse.json(result, { headers: corsHeaders });
    }

    if (action === 'advance') {
      const result = await advanceReferralPhase({
        idToken,
        refereeBusinessId: body.refereeBusinessId,
        phase: body.phase
      });
      return NextResponse.json(result, { headers: corsHeaders });
    }

    return NextResponse.json(
      { ok: false, error: `Unsupported action: ${action}` },
      { status: 400, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[api/referrals] POST error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to execute referral action' },
      { status: 500, headers: corsHeaders }
    );
  }
}
