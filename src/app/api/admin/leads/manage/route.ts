import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/actions/admin-guard';
import { adminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

// GET: List saved leads from admin_leads
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    await requireSuperAdmin(token);

    if (!adminFirestore) {
      return NextResponse.json({ ok: false, error: 'Database uninitialized' }, { status: 500, headers: corsHeaders });
    }

    const snapshot = await adminFirestore
      .collection('admin_leads')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const leads = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ ok: true, leads }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// POST: Save or bookmark a new lead
export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    await requireSuperAdmin(token);

    if (!adminFirestore) {
      return NextResponse.json({ ok: false, error: 'Database uninitialized' }, { status: 500, headers: corsHeaders });
    }

    const lead = await req.json();
    if (!lead || !lead.title) {
      return NextResponse.json({ ok: false, error: 'Invalid lead payload' }, { status: 400, headers: corsHeaders });
    }

    const leadRef = adminFirestore.collection('admin_leads').doc();
    await leadRef.set({
      ...lead,
      status: lead.status || 'new',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: leadRef.id }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// PUT: Update lead status or notes
export async function PUT(req: NextRequest) {
  try {
    const token = extractToken(req);
    await requireSuperAdmin(token);

    if (!adminFirestore) {
      return NextResponse.json({ ok: false, error: 'Database uninitialized' }, { status: 500, headers: corsHeaders });
    }

    const { id, status, notes } = await req.json();
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing lead ID' }, { status: 400, headers: corsHeaders });
    }

    const leadRef = adminFirestore.collection('admin_leads').doc(id);
    const updates: any = { updatedAt: FieldValue.serverTimestamp() };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    await leadRef.update(updates);
    return NextResponse.json({ ok: true, updated: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
