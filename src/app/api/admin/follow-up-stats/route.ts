import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    // In a production environment, you would check for admin authorization here.
    
    if (!adminFirestore) {
        return NextResponse.json({ success: false, message: 'Firestore Admin not initialized. Check env vars.' }, { status: 503 });
    }

    const logsSnapshot = await adminFirestore.collection('follow_up_logs')
      .orderBy('sentAt', 'desc')
      .limit(50)
      .get();

    // Calculate Sent count (only those that actually succeeded)
    const successCountSnapshot = await adminFirestore.collection('follow_up_logs')
      .where('status', '==', 'sent')
      .get();
    const sentCount = successCountSnapshot.size;

    const logs = await Promise.all(logsSnapshot.docs.map(async (doc: any) => {
      const logData = doc.data();
      const sentAt = logData.sentAt?.toDate();
      let converted = false;

      if (sentAt && logData.businessId !== 'unknown') {
        // Check if there are any receipts for this business at all (simpler query, no index required)
        const receiptsSnapshot = await adminFirestore.collection('receipts')
          .where('businessId', '==', logData.businessId)
          .limit(1)
          .get();
        
        converted = !receiptsSnapshot.empty;
      }

      return {
        id: doc.id,
        ...logData,
        converted
      };
    }));

    return NextResponse.json({ success: true, logs, sentCount });

  } catch (error: any) {
    console.error('Fetch Follow-Up Stats Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
