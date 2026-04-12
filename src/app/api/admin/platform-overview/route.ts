import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';
import { getCachedPlatformAnalytics } from '@/lib/server/analytics-cache';

export async function GET(req: NextRequest) {
  try {
    // Basic Auth Check
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!adminAuth) {
        return NextResponse.json({ success: false, message: 'Firebase Admin not initialized on server. Check env vars.' }, { status: 503 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken.email?.includes('admin') && decodedToken.email !== 'zenevapos@gmail.com' && decodedToken.email !== 'imamshaffy@gmail.com') {
       return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const stats = await getCachedPlatformAnalytics(forceRefresh);

    return NextResponse.json({ success: true, ...stats });

  } catch (error: any) {
    console.error('Platform Overview API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
