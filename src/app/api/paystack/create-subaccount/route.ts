
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { business_name, bank_code, account_number } = await request.json();

    if (!business_name || !bank_code || !account_number) {
      return NextResponse.json({ message: 'Business name, bank code, and account number are required' }, { status: 400 });
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.includes('xxx')) {
        return NextResponse.json({ message: 'Paystack secret key is not configured.' }, { status: 500 });
    }
    
    const response = await fetch('https://api.paystack.co/subaccount', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name,
        bank_code,
        account_number,
        percentage_charge: 0, // Zeneva takes 0%
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
        console.error('Paystack subaccount creation error:', data);
        // Paystack's API for idempotent subaccount creation returns a 409 Conflict.
        // We can treat this as a success for our use case by fetching the existing subaccount.
        if (response.status === 409 && data.message.includes('already exist')) {
             try {
                const listSubaccountsUrl = new URL('https://api.paystack.co/subaccount');
                listSubaccountsUrl.searchParams.append('bank_code', bank_code);
                listSubaccountsUrl.searchParams.append('account_number', account_number);
                
                const existingSubaccountResponse = await fetch(listSubaccountsUrl.toString(), {
                    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
                });
                const existingData = await existingSubaccountResponse.json();
                
                if (existingData.status && existingData.data.length > 0) {
                    return NextResponse.json({ subaccount_code: existingData.data[0].subaccount_code }, { status: 200 });
                }
             } catch (fetchError) {
                 console.error("Error fetching existing subaccount:", fetchError);
                 return NextResponse.json({ message: 'A subaccount with these details exists, but we could not retrieve it. Please contact support.'}, { status: 500 });
             }
        }
        // If it's not a 409 error or we failed to retrieve the existing one, return the original error.
        return NextResponse.json({ message: data.message || 'Failed to create Paystack subaccount.' }, { status: response.status });
    }
    
    return NextResponse.json({ subaccount_code: data.data.subaccount_code }, { status: 201 });

  } catch (error) {
    console.error('Internal server error creating subaccount:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
