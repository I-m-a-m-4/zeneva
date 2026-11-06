import { NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/firebase/admin';
import admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        // This route reads a whole tenant's receipts and audit logs and writes
        // inventory_transactions with the Admin SDK, which bypasses Firestore
        // rules. Without a verified caller and a tenant check, any anonymous
        // request could name another business and both read and rewrite its
        // stock history.
        if (!adminAuth) {
            return NextResponse.json({ error: 'Server authentication is not configured' }, { status: 503 });
        }

        const authHeader = req.headers.get('authorization') || '';
        const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        if (!bearer) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let callerUid: string;
        try {
            // checkRevoked so a revoked session cannot keep replaying this.
            const decoded = await adminAuth.verifyIdToken(bearer, true);
            callerUid = decoded.uid;
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const businessId = typeof body?.businessId === 'string' ? body.businessId.trim() : '';

        if (!businessId) {
            return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
        }

        if (!adminFirestore) {
             return NextResponse.json({ error: 'Admin DB not initialized' }, { status: 500 });
        }

        const db = adminFirestore;

        // Tenant check: the caller must belong to this business, own it, or be
        // the platform super-admin. Same rule as the other tenant-scoped admin
        // routes (e.g. /api/users/resolve).
        const callerSnap = await db.collection('users').doc(callerUid).get();
        if (!callerSnap.exists) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const caller = callerSnap.data() || {};
        if (caller.status === 'suspended') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let allowed = caller.role === 'super-admin' || caller.businessId === businessId;
        if (!allowed) {
            const bizSnap = await db.collection('businessInstances').doc(businessId).get();
            allowed = bizSnap.exists && bizSnap.data()?.ownerId === callerUid;
        }
        if (!allowed) {
            // Deliberately identical to the other rejection paths so a caller
            // cannot probe which businesses exist.
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const transactions: any[] = [];
        let receiptsCount = 0;
        let auditLogsCount = 0;

        /*
         * Rows the POS already wrote for this tenant. Older builds generated a
         * random document id per journal row, so replaying the backfill used to
         * append a second row for the same sale - the product history then showed
         * the sale twice and the running balance drifted. Dedupe on what actually
         * identifies the movement (receipt, product, direction), not the doc id.
         */
        const existingSnap = await db.collection('inventory_transactions').where('businessId', '==', businessId).get();
        const existingKeys = new Set<string>();
        existingSnap.docs.forEach((existingDoc: admin.firestore.QueryDocumentSnapshot) => {
            const row = existingDoc.data() || {};
            if (!row.referenceId || !row.productId) return;
            existingKeys.add(`${row.referenceId}:${row.productId}:${row.type}`);
        });
        const movementKey = (tx: any) => `${tx.referenceId}:${tx.productId}:${tx.type}`;

        // 1. Process Receipts (Sales)
        const receiptsSnap = await db.collection('receipts').where('businessId', '==', businessId).get();
        for (const doc of receiptsSnap.docs) {
            const data = doc.data();
            const items = data.items || [];
            for (const item of items) {
                if (!item.productId) continue;
                
                const isReturn = data.status === 'voided';

                const tx = {
                    businessId,
                    productId: item.productId,
                    productName: item.name || 'Unknown',
                    type: isReturn ? 'return' : 'out',
                    quantity: item.quantity || 0,
                    date: data.createdAt || data.date || admin.firestore.Timestamp.now(),
                    // No separate write time survives on these older receipts;
                    // the business date is the only ordering key available.
                    recordedAt: data.createdAt || data.date || admin.firestore.Timestamp.now(),
                    notes: data.receiptNumber 
                        ? (isReturn ? `Voided Sale (Receipt #${data.receiptNumber})` : `Sale (Receipt #${data.receiptNumber})`)
                        : (isReturn ? 'Voided Sale' : 'Sale'),
                    referenceId: doc.id,
                    createdBy: data.createdBy || 'Unknown',
                    // Same deterministic id the queue uses, so a later sync of
                    // this receipt overwrites this row instead of duplicating it.
                    docId: `${isReturn ? 'void' : 'sale'}_${doc.id}_${item.productId}`
                };

                if (existingKeys.has(movementKey(tx))) continue;
                existingKeys.add(movementKey(tx));
                transactions.push(tx);
                receiptsCount++;
            }
        }

        // 2. Process Audit Logs (Restocks / Adjustments)
        const auditSnap = await db.collection('businessInstances').doc(businessId).collection('auditLogs')
            .where('entityType', '==', 'product')
            .get();

        for (const doc of auditSnap.docs) {
            const data = doc.data();
            const action = data.action;
            const details = data.details || {};
            
            let quantity = 0;
            let type = 'adjustment';
            
            if (action === 'product.stock_adjustment' || action === 'stock.adjusted') {
                if (details.adjustment !== undefined) {
                    quantity = details.adjustment;
                } else if (details.newStock !== undefined && details.oldStock !== undefined) {
                    quantity = details.newStock - details.oldStock;
                }
            } else if (action === 'product.update' && details.changes?.stock) {
                quantity = (details.changes.stock.to || 0) - (details.changes.stock.from || 0);
            }

            if (quantity !== 0) {
                type = quantity > 0 ? 'in' : 'out';
                const tx = {
                    businessId,
                    productId: data.entityId,
                    productName: data.entityName || details.entityName || 'Historical Product',
                    type,
                    quantity: Math.abs(quantity),
                    date: data.createdAt || admin.firestore.Timestamp.now(),
                    recordedAt: data.createdAt || admin.firestore.Timestamp.now(),
                    notes: details.reason || action,
                    referenceId: doc.id,
                    createdBy: data.userName || data.userId || 'Unknown',
                };

                if (tx.productId && existingKeys.has(movementKey(tx))) continue;
                if (tx.productId) existingKeys.add(movementKey(tx));
                transactions.push(tx);
                auditLogsCount++;
            }
        }

        const batches = [];
        let currentBatch = db.batch();
        let count = 0;

        for (const tx of transactions) {
            const { docId, ...row } = tx;
            const txId = docId || `${businessId}_${tx.referenceId}_${tx.productId}_${tx.type}`.replace(/[^a-zA-Z0-9_-]/g, '');
            const txRef = db.collection('inventory_transactions').doc(txId);
            
            currentBatch.set(txRef, row, { merge: true });
            count++;

            if (count === 400) {
                batches.push(currentBatch);
                currentBatch = db.batch();
                count = 0;
            }
        }

        if (count > 0) {
            batches.push(currentBatch);
        }

        for (const b of batches) {
            await b.commit();
        }

        return NextResponse.json({
            ok: true,
            totalSynced: transactions.length
        });

    } catch (err: any) {
        console.error('Backfill error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
