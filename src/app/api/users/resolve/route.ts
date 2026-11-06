import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // Resolving names by UID reads other users' profiles, so this is a
    // tenant-scoped endpoint: a verified caller, and their business must match
    // (or they must be the platform super-admin). No anonymous path.
    if (!adminAuth) {
      return NextResponse.json({ success: false, error: 'Server authentication is not configured' }, { status: 503 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let callerUid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(bearer, true);
      callerUid = decoded.uid;
    } catch {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

    const userDoc = await db.collection('users').doc(callerUid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const userData = userDoc.data() || {};
    if (userData.status === 'suspended' ||
        (userData.role !== 'super-admin' && userData.businessId !== businessId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
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

          // 1. Direct user profile lookup in Firestore
          const uDoc = await db.collection('users').doc(uid).get();
          if (uDoc.exists) {
            const data = uDoc.data();
            const name = data?.name || data?.displayName || data?.fullName || (data?.firstName ? `${data.firstName} ${data?.lastName || ''}`.trim() : null) || (data?.email ? data.email.split('@')[0] : null);
            if (name) {
              resolvedMap[uid] = name;
              return;
            }
          }

          // 2. Fallback: check business owner
          const bizDoc = await db.collection('businessInstances').doc(businessId).get();
          if (bizDoc.exists) {
            const bData = bizDoc.data();
            if (bData?.ownerId === uid) {
              resolvedMap[uid] = bData.ownerName || bData.name || 'Owner';
              return;
            }
          }

          // 3. Fallback: check receipts collection (root level) where this user was cashier
          const receiptSnap = await db
            .collection('receipts')
            .where('businessId', '==', businessId)
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

          // Also check by createdById
          const receiptSnap2 = await db
            .collection('receipts')
            .where('businessId', '==', businessId)
            .where('createdById', '==', uid)
            .limit(1)
            .get();

          if (!receiptSnap2.empty) {
            const rData = receiptSnap2.docs[0].data();
            if (rData?.cashierName) {
              resolvedMap[uid] = rData.cashierName;
              return;
            }
          }

          // 4. Fallback: check business audit logs where this user was actor
          const auditSnap = await db
            .collection('businessInstances')
            .doc(businessId)
            .collection('auditLogs')
            .where('actorId', '==', uid)
            .limit(1)
            .get();

          if (!auditSnap.empty) {
            const auditData = auditSnap.docs[0].data();
            if (auditData?.actorName || auditData?.userName) {
              resolvedMap[uid] = auditData.actorName || auditData.userName;
              return;
            }
          }

          // 5. Fallback: check inventory_transactions where cashierName was stamped
          const invSnap = await db
            .collection('inventory_transactions')
            .where('businessId', '==', businessId)
            .where('createdById', '==', uid)
            .limit(1)
            .get();

          if (!invSnap.empty) {
            const invData = invSnap.docs[0].data();
            if (invData?.cashierName) {
              resolvedMap[uid] = invData.cashierName;
              return;
            }
          }

          // 6. Fallback: check Firebase Auth user record
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

