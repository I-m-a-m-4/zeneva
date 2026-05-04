
import { NextRequest, NextResponse } from 'next/server';

const DODO_API_KEY = process.env.DODO_SECRET_KEY;
const DODO_API_URL = 'https://api.dodopayments.com/v1';

// Replace these with your actual Dodo Product IDs from the dashboard
const DODO_PRODUCT_IDS: Record<string, string> = {
  'pro': process.env.DODO_PRO_PRODUCT_ID || 'pdp_pro_placeholder',
  'business': process.env.DODO_BUSINESS_PRODUCT_ID || 'pdp_business_placeholder',
};

export async function POST(req: NextRequest) {
  try {
    const { planId, email, businessId, cycleMonths } = await req.json();

    if (!DODO_API_KEY) {
      return NextResponse.json({ error: 'Dodo API key not configured' }, { status: 500 });
    }

    const productId = DODO_PRODUCT_IDS[planId];
    if (!productId || productId.includes('placeholder')) {
      return NextResponse.json({ error: 'Dodo Product ID not configured for this plan' }, { status: 400 });
    }

    // Create Checkout Session
    const response = await fetch(`${DODO_API_URL}/checkout-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
          cycleMonths: cycleMonths,
        },
        // Optional: Redirect URLs
        return_url: `https://zeneva.space/settings?subscription=success`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Dodo API Error:', data);
      return NextResponse.json({ error: data.message || 'Failed to create Dodo checkout session' }, { status: response.status });
    }

    return NextResponse.json({ checkout_url: data.checkout_url });
  } catch (error) {
    console.error('Dodo Checkout Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
