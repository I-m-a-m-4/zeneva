
import { NextResponse } from 'next/server';
import { adminFirestore } from '@/firebase/admin';
import { sendNotificationToUser } from '@/lib/server/notifications';

export async function POST(request: Request) {
  try {
    const { reference, expectedAmount, businessId } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.includes('xxx')) {
      console.error("Paystack secret key is not configured in .env file.");
      return NextResponse.json({ error: 'Server payment configuration error.' }, { status: 500 });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Paystack API verification error:', errorData);
      return NextResponse.json({ status: 'error', message: 'Failed to verify transaction with Paystack.' }, { status: response.status });
    }

    const data = await response.json();

    // Check if the API call was successful and the transaction status from Paystack is 'success'
    if (data.status && data.data.status === 'success') {

      // Security Check: Verify amount if provided
      if (expectedAmount && data.data.amount !== expectedAmount) {
        console.error(`Payment amount mismatch. Expected: ${expectedAmount}, Actual: ${data.data.amount}`);
        return NextResponse.json({
          status: 'failed',
          message: 'Payment amount mismatch. Please contact support.'
        }, { status: 400 });
      }

      // Trigger Notification to Merchant
      if (businessId) {
        try {
          // 1. Find users associated with this business (Owner/Admin)
          const employeesSnapshot = await adminFirestore.collection('users')
            .where('businessId', '==', businessId)
            .where('role', 'in', ['owner', 'admin', 'manager'])
            .get();

          if (!employeesSnapshot.empty) {
            const notificationPromises = employeesSnapshot.docs.map((doc: any) => {
              const tokenData = doc.data();
              // Note: sending to user ID, not directly to token here, helper handles token lookup
              return sendNotificationToUser(doc.id, {
                title: 'New Online Order! 🛍️',
                body: `Received payment of ${data.data.currency} ${(data.data.amount / 100).toLocaleString()}`,
                url: '/dashboard/online-orders'
              });
            });
            await Promise.all(notificationPromises);
          }
        } catch (notifyError) {
          console.error("Failed to send notification:", notifyError);
        }
      }

      // We only return the necessary, safe-to-use data to the client.
      return NextResponse.json({
        status: 'success',
        message: 'Transaction verified successfully.',
        data: {
          amount: data.data.amount,
          currency: data.data.currency,
          status: data.data.status,
          reference: data.data.reference,
        }
      }, { status: 200 });
    } else {
      return NextResponse.json({ status: 'failed', message: data.data.gateway_response || 'Transaction not successful' }, { status: 402 });
    }
  } catch (error) {
    console.error('Internal server error during payment verification:', error);
    return NextResponse.json({ error: 'An internal server error occurred during verification.' }, { status: 500 });
  }
}
