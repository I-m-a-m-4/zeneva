import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    // In a production environment, you would check for admin authorization here.
    
    const logsSnapshot = await adminFirestore.collection('follow_up_logs')
      .orderBy('sentAt', 'desc')
      .limit(50)
      .get();

    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, logs });

  } catch (error: any) {
    console.error('Fetch Follow-Up Stats Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
