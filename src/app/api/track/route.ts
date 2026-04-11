import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/firebase/admin';

const TRANSPARENT_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tid = searchParams.get('tid');

  if (tid) {
    try {
      const logRef = adminFirestore.collection('follow_up_logs').doc(tid);
      const logDoc = await logRef.get();

      if (logDoc.exists) {
        // Update the log with open tracking info
        await logRef.update({
          openedAt: new Date(),
          openCount: (logDoc.data()?.openCount || 0) + 1,
          lastIp: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
          status: 'opened'
        });
      }
    } catch (error) {
      console.error('Tracking Error:', error);
    }
  }

  return new NextResponse(TRANSPARENT_PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
