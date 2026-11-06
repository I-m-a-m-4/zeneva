import { NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
    if (!adminAuth || !adminFirestore) {
        return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 503 });
    }

    try {
        const authorization = request.headers.get('authorization') || '';
        const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        let uid: string;
        try {
            const decoded = await adminAuth.verifyIdToken(token, true);
            uid = decoded.uid;
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
        }

        const callerDoc = await adminFirestore.collection('users').doc(uid).get();
        const caller = callerDoc.data();
        if (!caller || caller.status === 'suspended' || caller.role !== 'super-admin') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        console.log('Starting DB fix for Unknown user support threads...');
        const threadsSnapshot = await adminFirestore.collection('supportThreads').get();
        let updatedCount = 0;

        for (const doc of threadsSnapshot.docs) {
            const data = doc.data();
            if (!data.userName || data.userName === 'Unknown user') {
                const userId = data.userId;
                if (!userId) continue;

                // fetch user
                const userDoc = await adminFirestore.collection('users').doc(userId).get();
                const userData = userDoc.data();
                
                let newName = '';
                if (userData) {
                    newName = userData.name || userData.business?.name || '';
                }

                if (!newName) {
                    // Try to fetch currentBusiness or something
                    const businessesQuery = await adminFirestore.collection('businesses').where('ownerId', '==', userId).limit(1).get();
                    if (!businessesQuery.empty) {
                        newName = businessesQuery.docs[0].data().name;
                    }
                }

                if (newName && newName !== 'Unknown user') {
                    await doc.ref.update({ userName: newName });
                    updatedCount++;
                    console.log(`Updated thread ${doc.id} with new name: ${newName}`);
                }
            }
        }
        
        return NextResponse.json({ success: true, message: `Updated ${updatedCount} threads` });
    } catch (error) {
        console.error('Error fixing support names:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
