
import { NextResponse } from 'next/server';

export async function GET() {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.includes('xxx')) {
        return NextResponse.json({ message: 'Paystack secret key is not configured.' }, { status: 500 });
    }

    try {
        const response = await fetch('https://api.paystack.co/bank?currency=NGN', {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Paystack API error fetching banks:', errorData);
            return NextResponse.json({ message: 'Failed to fetch banks from Paystack' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data.data, { status: 200 }); // Return the array of banks directly if possible, or the whole object. Let's return the data array.
    } catch (error) {
        console.error('Error fetching banks:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
