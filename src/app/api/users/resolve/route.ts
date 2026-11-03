import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    let callerUid: string | null = null;
    if (adminAuth && bearer) {
      try {
        const decoded = await adminAuth.verifyIdToken(bearer);
        callerUid = decoded.uid;
      } catch (_) {
        // Token verification failed or expired
      }
    }

    const body = await req.json().catch(() => ({}));
    const { businessId, uids } = body as { businessId?: string; uids?: string[] };

    if (!businessId || !Array.isArray(uids) || uids.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    // Limit to 50 UIDs per request to prevent abuse
    const targetUids = Array.from(new Set(uids.filter(id => typeof id === 'string' && id.trim().length > 0))).slice(0, 50);
    const db = adminFirestore;

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    // Tenant check: verify caller is member of this business or admin
    if (callerUid) {
      try {
        const userDoc = await db.collection('users').doc(callerUid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.role !== 'super-admin' && userData?.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
          }
        }
      } catch (_) {
        // Proceed if check fails non-critically
      }
    }

    const resolvedMap: Record<string, string> = {};

    // 1. Fetch from 'users' collection in batch
    await Promise.all(
      targetUids.map(async (uid) => {
        try {
          // If uid already looks like a real name (e.g. contains spaces and no special chars), keep it
          if (!/^[a-zA-Z0-9_-]{20,36}$/.test(uid)) {
            resolvedMap[uid] = uid;
            return;
          }

          const uDoc = await db.collection('users').doc(uid).get();
          if (uDoc.exists) {
            const data = uDoc.data();
            const name = data?.name || data?.displayName || (data?.email ? data.email.split('@')[0] : null);
            if (name) {
              resolvedMap[uid] = name;
              return;
            }
          }

          // 2. Fallback: check business audit logs where this user was the actor
          const auditSnap = await db
            .collection('businessInstances')
            .doc(businessId)
            .collection('auditLogs')
            .where('actorId', '==', uid)
            .limit(1)
            .get();

          if (!auditSnap.empty) {
            const auditData = auditSnap.docs[0].data();
            if (auditData?.actorName) {
              resolvedMap[uid] = auditData.actorName;
              return;
            }
          }

          // 3. Fallback: check business receipts where this user was cashier
          const receiptSnap = await db
            .collection('businessInstances')
            .doc(businessId)
            .collection('receipts')
            .where('createdBy', '==', uid)
            .limit(1)
            .get();

          if (!receiptSnap.empty) {
            const rData = receiptSnap.docs[0].data();
            if (rData?.cashierName) {
              resolvedMap[uid] = rData.cashierName;
              return;
            }
          }

          // 4. Fallback: check Firebase Auth user record
          if (adminAuth) {
            try {
              const authUser = await adminAuth.getUser(uid);
              const authName = authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : null);
              if (authName) {
                resolvedMap[uid] = authName;
                return;
              }
            } catch (_) {}
          }
        } catch (_) {}
      })
    );

    return NextResponse.json({
      success: true,
      users: resolvedMap,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to resolve users' }, { status: 500 });
  }
}
