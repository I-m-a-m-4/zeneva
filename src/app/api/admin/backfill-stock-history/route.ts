import { NextResponse } from 'next/server';
import { requireSuperAdmin, corsHeaders } from '../_guard';
import admin from 'firebase-admin';
import { adminFirestore } from '@/firebase/admin';

export async function POST(req: Request) {
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.res;

    try {
        const body = await req.json();
        const businessId = body.businessId;
        const dryRun = body.dryRun ?? true;

        if (!businessId) {
            return NextResponse.json({ error: 'Missing businessId' }, { status: 400, headers: corsHeaders });
        }

        const db = adminFirestore;
        if (!db) {
            return NextResponse.json({ error: 'Firestore admin not initialized' }, { status: 500, headers: corsHeaders });
        }

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
                
                // Determine if this receipt is a void/return or a sale
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
            const details = (data.details || '').toLowerCase();
            
            // Heuristics to find restocks/adjustments in audit logs
            if (details.includes('restocked') || details.includes('stock')) {
                // Try to extract a quantity if it says something like "+5" or "added 5"
                let quantity = 0;
                let type = 'adjustment';
                
                if (details.includes('restocked')) {
                    type = 'in';
                    const match = details.match(/(?:added|\+)\s*(\d+)/i);
                    if (match) quantity = parseInt(match[1], 10);
                } else if (details.match(/stock.*(?:changed|updated|from).*?(\d+).*?to.*?(\d+)/i)) {
                    // e.g. "Stock updated from 5 to 10"
                    const match = details.match(/stock.*(?:changed|updated|from).*?(\d+).*?to.*?(\d+)/i);
                    if (match) {
                        const from = parseInt(match[1], 10);
                        const to = parseInt(match[2], 10);
                        quantity = to - from;
                        type = quantity >= 0 ? 'in' : 'out';
                    }
                } else {
                    // Just log it as a generic adjustment if we can't parse it
                    quantity = 0;
                }

                transactions.push({
                    businessId,
                    productId: data.entityId,
                    productName: 'Historical Product', // Will try to enrich later if possible
                    type,
                    quantity: Math.abs(quantity), // store absolute value as per schema standard if out
                    date: data.createdAt || admin.firestore.Timestamp.now(),
                    notes: data.details,
                    referenceId: doc.id,
                    createdBy: data.userId || 'Unknown',
                });
                auditLogsCount++;
            }
        }

        if (!dryRun) {
            // Batch write to inventory_transactions
            const batches = [];
            let currentBatch = db.batch();
            let count = 0;

            for (const tx of transactions) {
                // Let's use a composite ID or hash to prevent duplicates if run multiple times
                // ID: {businessId}_{referenceId}_{productId}_{type}
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
        }

        return NextResponse.json({
            ok: true,
            dryRun,
            extracted: {
                fromReceipts: receiptsCount,
                fromAuditLogs: auditLogsCount,
                totalTransactions: transactions.length
            },
            sample: transactions.slice(0, 10)
        }, { headers: corsHeaders });

    } catch (err: any) {
        console.error('Backfill error:', err);
        return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
}
