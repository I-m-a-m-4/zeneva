import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { businessId, bvn, email, customerCode } = await req.json();

    if (!bvn || bvn.length !== 11) {
      return NextResponse.json({ message: 'Valid 11-digit BVN is required.' }, { status: 400 });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY is missing');
      return NextResponse.json({ message: 'Payment gateway configuration error.' }, { status: 500 });
    }

    const authHeader = `Bearer ${paystackSecretKey}`;
    
    // We need either customerCode or email to identify the Paystack customer
    const identifier = customerCode || email;
    if (!identifier) {
      return NextResponse.json({ message: 'Customer identifier (email or code) is missing. Have you activated your terminal yet?' }, { status: 400 });
    }

    // 1. Submit BVN to Paystack Customer Validation API
    const verifyResponse = await fetch(`https://api.paystack.co/customer/${identifier}/identification`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country: 'NG',
        type: 'bvn',
        value: bvn,
        bvn: bvn,
      }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.status) {
      console.error('Paystack customer verification failed:', verifyData);
      
      // Paystack sometimes returns specific BVN errors
      const errorMessage = verifyData.message || 'Failed to verify BVN with Paystack.';
      return NextResponse.json({ message: errorMessage }, { status: verifyResponse.status || 400 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Customer verified successfully.'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Internal server error in verify-customer:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
