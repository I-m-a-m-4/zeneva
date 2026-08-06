export const dynamic = process.env.IS_TAURI ? 'force-static' : 'force-dynamic';
import { NextResponse } from 'next/server';
import { adminFirestore } from '@/firebase/admin';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.includes('xxx')) {
      console.error('Paystack Secret Key is not configured.');
      return new NextResponse('Webhook configuration error', { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('Missing x-paystack-signature header.');
      return new NextResponse('Missing signature', { status: 400 });
    }

    // Secure Signature Verification (HMAC SHA512)
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      console.error('Signature verification failed. Potential spoofing attempt.');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    console.log(`âœ… Paystack Webhook Received & Verified: ${event}`);

    if (event === 'charge.success') {
      const subaccountCode = data.subaccount?.subaccount_code;
      const amountInNaira = data.amount / 100;
      const reference = data.reference;
      const customerEmail = data.customer?.email || '';

      // 1. Locate Business Instance by Subaccount Code
      let businessDoc: any = null;
      let businessId = '';

      if (subaccountCode) {
        const businessQuery = await adminFirestore
          .collection('businessInstances')
          .where('settings.paystackSubaccountCode', '==', subaccountCode)
          .limit(1)
          .get();

        if (!businessQuery.empty) {
          businessDoc = businessQuery.docs[0];
          businessId = businessDoc.id;
        }
      }

      // Fallback matching using store customer email if subaccount query failed
      if (!businessId && customerEmail.startsWith('terminal-')) {
        const extractedPrefix = customerEmail.replace('terminal-', '').split('@')[0];
        // Query businesses starting with that ID prefix
        const businessQuery = await adminFirestore
          .collection('businessInstances')
          .get();
          
        const matchingDoc = businessQuery.docs.find(doc => doc.id.substring(0, 8) === extractedPrefix);
        if (matchingDoc) {
          businessDoc = matchingDoc;
          businessId = matchingDoc.id;
        }
      }

      if (!businessId) {
        console.error(`Could not locate business for subaccount ${subaccountCode} or email ${customerEmail}`);
        return new NextResponse('Business not found', { status: 404 });
      }

      const businessData = businessDoc.data();
      const businessName = businessData.name || 'Your Store';

      console.log(`Processing payout for business: ${businessName} (${businessId})`);

      // 2. Locate Active Cashier / Employees for this Business
      const employeesSnapshot = await adminFirestore
        .collection('users')
        .where('businessId', '==', businessId)
        .where('role', 'in', ['owner', 'admin', 'manager', 'operator', 'cashier'])
        .get();

      // 3. Dispatch Live Notifications to Employee Feeds
      if (!employeesSnapshot.empty) {
        const notificationPromises = employeesSnapshot.docs.map((doc: any) => {
          return adminFirestore
            .collection('users')
            .doc(doc.id)
            .collection('notifications')
            .add({
              title: 'Payment Received â‚¦' + amountInNaira.toLocaleString(),
              body: `â‚¦${amountInNaira.toLocaleString()} successfully received via Bank Transfer.`,
              createdAt: new Date(),
              read: false,
              type: 'payment',
              amount: amountInNaira,
              reference: reference,
              bankName: data.authorization?.bank || 'Wema Bank',
              accountNumber: data.authorization?.account_number || 'N/A'
            });
        });
        await Promise.all(notificationPromises);
      }

      // 4. POS Automated Checkout Reconciliation
      // Find a pending receipt for this business with same payment total to auto-mark as paid
      const receiptsQuery = await adminFirestore
        .collection('receipts')
        .where('businessId', '==', businessId)
        .where('paymentMethod', '==', 'Bank Transfer')
        .where('status', '==', 'pending')
        .where('total', '==', amountInNaira)
        .limit(1)
        .get();

      if (!receiptsQuery.empty) {
        const receiptDoc = receiptsQuery.docs[0];
        await adminFirestore.collection('receipts').doc(receiptDoc.id).update({
          status: 'paid',
          updatedAt: new Date(),
          paymentReference: reference
        });
        console.log(`Successfully reconciled receipt #${receiptDoc.data().receiptNumber} to Paid`);
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });

  } catch (error: any) {
    console.error('Webhook processing failure:', error);
    return new NextResponse(`Internal webhook error: ${error.message}`, { status: 500 });
  }
}

