import { NextResponse } from 'next/server';
import { adminFirestore } from '@/firebase/admin';
import admin from 'firebase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const businessId = body.businessId;

        if (!businessId) {
            return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });
        }

        if (!adminFirestore) {
             return NextResponse.json({ error: 'Admin DB not initialized' }, { status: 500 });
        }

        const db = adminFirestore;

        const transactions: any[] = [];
        let receiptsCount = 0;
        let auditLogsCount = 0;

        // 1. Process Receipts (Sales)
        const receiptsSnap = await db.collection('receipts').where('businessId', '==', businessId).get();
        for (const doc of receiptsSnap.docs) {
            const data = doc.data();
            const items = data.items || [];
            for (const item of items) {
                if (!item.productId) continue;
                
                const isReturn = data.status === 'voided';
                
                transactions.push({
                    businessId,
                    productId: item.productId,
                    productName: item.name || 'Unknown',
                    type: isReturn ? 'return' : 'out',
                    quantity: item.quantity || 0,
                    date: data.createdAt || data.date || admin.firestore.Timestamp.now(),
                    notes: data.receiptNumber 
                        ? (isReturn ? `Voided Sale (Receipt #${data.receiptNumber})` : `Sale (Receipt #${data.receiptNumber})`)
                        : (isReturn ? 'Voided Sale' : 'Sale'),
                    referenceId: doc.id,
                    createdBy: data.createdBy || 'Unknown'
                });
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
                transactions.push({
                    businessId,
                    productId: data.entityId,
                    productName: data.entityName || details.entityName || 'Historical Product',
                    type,
                    quantity: Math.abs(quantity),
                    date: data.createdAt || admin.firestore.Timestamp.now(),
                    notes: details.reason || action,
                    referenceId: doc.id,
                    createdBy: data.userName || data.userId || 'Unknown',
                });
                auditLogsCount++;
            }
        }

        const batches = [];
        let currentBatch = db.batch();
        let count = 0;

        for (const tx of transactions) {
            const txId = `${businessId}_${tx.referenceId}_${tx.productId}_${tx.type}`.replace(/[^a-zA-Z0-9_-]/g, '');
            const txRef = db.collection('inventory_transactions').doc(txId);
            
            currentBatch.set(txRef, tx, { merge: true });
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
