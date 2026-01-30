
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { account_number, bank_code } = await request.json();

    if (!account_number || !bank_code) {
      return NextResponse.json({ status: false, message: 'Account number and bank code are required' }, { status: 400 });
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    
    // If no real API key is present, return a server configuration error.
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.includes('xxx')) {
        console.error('Paystack secret key is not configured in .env file.');
        return NextResponse.json({ status: false, message: 'Server payment configuration error. Paystack key is missing.' }, { status: 500 });
    }
    
    // --- REAL PAYSTACK API LOGIC ---
    const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();

    if (!response.ok || !data.status) {
        console.error('Paystack API resolution error:', data);
        return NextResponse.json({ status: false, message: data.message || 'Failed to resolve account with Paystack.' }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Internal server error during account resolution:', error);
    return NextResponse.json({ status: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}
