
import { NextRequest, NextResponse } from 'next/server';

const DODO_API_KEY = process.env.DODO_SECRET_KEY;
const DODO_MODE = process.env.NEXT_PUBLIC_DODO_MODE === 'live' ? 'live' : 'test';
const DODO_API_URL = `https://${DODO_MODE}.dodopayments.com/checkouts`;

// Product IDs from Dodo Dashboard mapped by planId and cycleMonths
const DODO_PRODUCT_IDS: Record<string, Record<string, string>> = {
  'pro': {
    '1': process.env.DODO_PRO_PRODUCT_ID || 'pdt_0Ne8DxFd4qtNIJdum6kaB',
    '3': process.env.DODO_PRO_3M_PRODUCT_ID || 'pdt_0NkpBsjzk7VlSGUeFz7Dl',
    '6': process.env.DODO_PRO_6M_PRODUCT_ID || 'pdt_0NkpBzjP613uXSgyPeP6C',
    '12': process.env.DODO_PRO_1Y_PRODUCT_ID || 'pdt_0NkpC3pkoA6FLfvUDr9Yq',
  },
  'business': {
    '1': process.env.DODO_BUSINESS_PRODUCT_ID || 'pdt_0Ne8FzxfnfO0Q55dQ2QuK',
    '3': process.env.DODO_BUSINESS_3M_PRODUCT_ID || 'pdt_0NkpBVh9ldI3byXk8hTQW',
    '6': process.env.DODO_BUSINESS_6M_PRODUCT_ID || 'pdt_0NkpBe3yuk1XV4RsVtPfb',
    '12': process.env.DODO_BUSINESS_1Y_PRODUCT_ID || 'pdt_0NkpBlN8u6xuhe4pDa8BY',
  }
};

export async function POST(req: NextRequest) {
  try {
    const { planId, email, businessId, cycleMonths } = await req.json();
    console.log('Dodo Checkout Request:', { planId, email, businessId, cycleMonths });

    if (!DODO_API_KEY) {
      console.error('Dodo API key is missing from environment variables');
      return NextResponse.json({ error: 'Dodo API key not configured' }, { status: 500 });
    }

    const cycleKey = cycleMonths ? cycleMonths.toString() : '1';
    const planProducts = DODO_PRODUCT_IDS[planId];
    
    if (!planProducts) {
      console.error('Dodo Product mapping not found for plan:', planId);
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const productId = planProducts[cycleKey];
    console.log(`Target Product ID for plan ${planId} (${cycleKey} months):`, productId);

    if (!productId || productId.includes('placeholder')) {
      console.error(`Dodo Product ID not configured for plan: ${planId}, cycle: ${cycleKey}`);
      return NextResponse.json({ error: 'Dodo Product ID not configured for this plan cycle' }, { status: 400 });
    }

    const body = {
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        },
      ],
      customer: {
        email: email,
      },
      metadata: {
        businessId: businessId,
        planId: planId,
        cycleMonths: cycleMonths.toString(),
      },
      billing_currency: 'USD',
    };

    console.log('Dodo API Request Body:', JSON.stringify(body, null, 2));

    // Create Checkout Session
    const response = await fetch(DODO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('Dodo API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('Dodo API Error Response:', data);
      return NextResponse.json({ 
        error: data.message || 'Failed to create Dodo checkout session',
        details: data
      }, { status: response.status });
    }

    return NextResponse.json({ checkout_url: data.checkout_url });
  } catch (error: any) {
    console.error('Internal Dodo Checkout Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error.message 
    }, { status: 500 });
  }
}
