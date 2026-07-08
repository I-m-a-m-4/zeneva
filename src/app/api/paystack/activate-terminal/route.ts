import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { businessId, businessName, email, bankCode, accountNumber } = await request.json();

    if (!businessId || !businessName || !bankCode || !accountNumber) {
      return NextResponse.json({ message: 'All parameters (businessId, businessName, bankCode, accountNumber) are required.' }, { status: 400 });
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.includes('xxx')) {
      return NextResponse.json({ message: 'Paystack Secret Key is not configured in environment variables (.env).' }, { status: 500 });
    }

    const authHeader = `Bearer ${PAYSTACK_SECRET_KEY}`;

    // 1. Create or Retrieve Paystack Subaccount
    let subaccountCode = '';
    try {
      const subaccountResponse = await fetch('https://api.paystack.co/subaccount', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: businessName,
          bank_code: bankCode,
          account_number: accountNumber,
          percentage_charge: 0,
        }),
      });

      const subaccountData = await subaccountResponse.json();

      if (subaccountResponse.status === 409 || (subaccountData.message && subaccountData.message.includes('already exist'))) {
        // Retrieve existing subaccount
        const listResponse = await fetch(`https://api.paystack.co/subaccount?bank_code=${bankCode}&account_number=${accountNumber}`, {
          headers: { Authorization: authHeader },
        });
        const listData = await listResponse.json();
        if (listData.status && listData.data.length > 0) {
          subaccountCode = listData.data[0].subaccount_code;
        } else {
          return NextResponse.json({ message: 'A subaccount with these bank details already exists but could not be retrieved.' }, { status: 409 });
        }
      } else if (!subaccountResponse.ok || !subaccountData.status) {
        return NextResponse.json({ message: subaccountData.message || 'Failed to create Paystack subaccount.' }, { status: subaccountResponse.status });
      } else {
        subaccountCode = subaccountData.data.subaccount_code;
      }
    } catch (err: any) {
      console.error('Subaccount step failed:', err);
      return NextResponse.json({ message: `Subaccount creation failed: ${err.message}` }, { status: 500 });
    }

    // 2. Create Store Customer for DVA mapping
    let customerCode = '';
    const storeEmail = email || `terminal-${businessId.substring(0, 8)}@zeneva.space`;
    try {
      const customerResponse = await fetch('https://api.paystack.co/customer', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: storeEmail,
          first_name: businessName,
          last_name: 'Terminal Store',
        }),
      });

      const customerData = await customerResponse.json();
      
      // If customer already exists, use existing customer
      if (customerResponse.status === 400 && customerData.message && customerData.message.includes('exists')) {
        const fetchCustResponse = await fetch(`https://api.paystack.co/customer/${storeEmail}`, {
          headers: { Authorization: authHeader }
        });
        const fetchCustData = await fetchCustResponse.json();
        if (fetchCustData.status) {
          customerCode = fetchCustData.data.customer_code;
        }
      } else if (!customerResponse.ok || !customerData.status) {
        return NextResponse.json({ message: customerData.message || 'Failed to create Paystack customer.' }, { status: customerResponse.status });
      } else {
        customerCode = customerData.data.customer_code;
      }
    } catch (err: any) {
      console.error('Customer step failed:', err);
      return NextResponse.json({ message: `Customer creation failed: ${err.message}` }, { status: 500 });
    }

    // 3. Provision Dedicated Virtual Account (DVA) from Paystack
    try {
      const dvaResponse = await fetch('https://api.paystack.co/dedicated_account', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerCode,
          preferred_bank: 'wema-bank',
          subaccount: subaccountCode,
        }),
      });

      const dvaData = await dvaResponse.json();

      if (!dvaResponse.ok || !dvaData.status) {
        console.error('Paystack DVA generation failed:', dvaData);
        return NextResponse.json({ 
          message: dvaData.message || 'Paystack rejected virtual account generation. Ensure your Paystack merchant compliance documents are fully approved for Live DVA access.' 
        }, { status: dvaResponse.status || 400 });
      }

      const assignedAccount = dvaData.data.dedicated_account || dvaData.data;

      return NextResponse.json({
        status: 'success',
        bankName: assignedAccount.bank?.name || 'Wema Bank',
        accountNumber: assignedAccount.account_number,
        accountName: assignedAccount.account_name,
        subaccountCode: subaccountCode
      }, { status: 200 });

    } catch (err: any) {
      console.error('DVA step failed:', err);
      return NextResponse.json({ message: `Virtual account allocation failed: ${err.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Internal server error in activate-terminal:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
