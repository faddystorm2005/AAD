import { SquareClient, SquareEnvironment } from 'square';

let squareClientInstance: SquareClient | null = null;

function getSquareClient(): SquareClient {
  if (squareClientInstance) return squareClientInstance;

  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'Missing SQUARE_ACCESS_TOKEN. Set it in .env.local (local) or in Vercel project settings → Environment Variables (deployed).'
    );
  }
  if (!process.env.SQUARE_APPLICATION_ID) {
    throw new Error(
      'Missing SQUARE_APPLICATION_ID. Set it in .env.local or Vercel environment variables.'
    );
  }

  squareClientInstance = new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
  return squareClientInstance;
}

let cachedLocationId: string | null = null;

async function getLocationId(): Promise<string> {
  if (cachedLocationId) return cachedLocationId;
  if (process.env.SQUARE_LOCATION_ID) {
    cachedLocationId = process.env.SQUARE_LOCATION_ID;
    return cachedLocationId;
  }

  const response = await getSquareClient().locations.list();
  const location =
    response.locations?.find((l) => l.status === 'ACTIVE') ?? response.locations?.[0];
  if (!location?.id) {
    throw new Error('No Square locations found for this account.');
  }
  cachedLocationId = location.id;
  return cachedLocationId;
}

export async function createPaymentLink(
  amountInCents: number,
  description: string,
  orderId: string,
  returnUrl: string
) {
  const client = getSquareClient();
  const locationId = await getLocationId();

  const response = await client.checkout.paymentLinks.create({
    idempotencyKey: `${orderId}-${Date.now()}`,
    description,
    quickPay: {
      name: description,
      priceMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD',
      },
      locationId,
    },
    checkoutOptions: {
      askForShippingAddress: false,
      redirectUrl: returnUrl,
    },
    paymentNote: orderId,
  });

  if (!response.paymentLink?.url) {
    throw new Error('Failed to create Square payment link');
  }

  return {
    success: true,
    url: response.paymentLink.url,
    id: response.paymentLink.id,
    orderId: response.paymentLink.orderId,
  };
}

export { getSquareClient };
