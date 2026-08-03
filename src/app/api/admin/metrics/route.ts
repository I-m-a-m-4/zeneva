import { NextResponse } from 'next/server';
import { adminFirestore } from '@/firebase/admin';
import { redis } from '@/lib/redis';

const CACHE_KEY = 'admin:dashboard_data:v2';
const CACHE_TTL = 300; // 5 minutes in seconds

export async function GET() {
    try {
        // 1. Check Redis Cache
        const cachedData = await redis.get(CACHE_KEY);
        if (cachedData) {
            console.log('Serving admin data from Redis cache');
            return NextResponse.json(cachedData);
        }

        console.log('Cache miss. Fetching admin data from Firestore...');
        const db = adminFirestore;

        // 2. Fetch all collections in parallel
        const [
            usersSnap,
            businessesSnap,
            productsSnap,
            receiptsSnap,
            purchasesSnap,
            downloadClicksSnap,
            applicationsSnap,
            grantsSnap
        ] = await Promise.all([
            db.collection('users').orderBy('name').get(),
            db.collection('businessInstances').get(),
            db.collection('products').get(),
            db.collection('receipts').get(),
            db.collection('purchases').get(),
            db.collection('download_clicks').get(),
            db.collection('job_applications').get(),
            db.collection('grants').get()
        ]);

        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const businesses = businessesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const applications = applicationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const grants = grantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const receipts = receiptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const purchases = purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const downloadClicks = downloadClicksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const payload = {
            users,
            businesses,
            products,
            applications,
            grants,
            receipts,
            purchases,
            downloadClicks
        };

        // 3. Save to Redis
        await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL });

        return NextResponse.json(payload);

    } catch (error) {
        console.error('Error fetching admin data:', error);
        return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 });
    }
}
