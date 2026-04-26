import { NextRequest, NextResponse } from 'next/server';
import { createPaymentLink } from '@/lib/squarePayment';

export async function POST(req: NextRequest) {
  try {
    const { bookingId, amount, description, returnUrl } = await req.json();

    if (!bookingId || !amount || !description || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert dollars to cents for Square
    const amountInCents = Math.round(amount * 100);

    const result = await createPaymentLink(
      amountInCents,
      description,
      bookingId,
      returnUrl
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Payment link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment link' },
      { status: 500 }
    );
  }
}
