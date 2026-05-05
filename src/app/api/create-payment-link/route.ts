import { NextRequest, NextResponse } from 'next/server';
import { createPaymentLink as createSquarePaymentLink } from '@/lib/squarePayment';
import { createPaymentLink as createPayPalPaymentLink } from '@/lib/paypalPayment';

export async function POST(req: NextRequest) {
  try {
    const { bookingId, amount, description, returnUrl } = await req.json();

    if (!bookingId || !amount || !description || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Respect PAYMENT_PROCESSOR env var. Defaults to 'paypal' (production default).
    const processor = (process.env.PAYMENT_PROCESSOR || 'paypal').toLowerCase();
    const createLink = processor === 'paypal' ? createPayPalPaymentLink : createSquarePaymentLink;

    // Convert dollars to cents for both processors.
    const amountInCents = Math.round(amount * 100);

    const result = await createLink(amountInCents, description, bookingId, returnUrl);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Payment link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment link' },
      { status: 500 }
    );
  }
}
