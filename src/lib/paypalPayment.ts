/**
 * PayPal payment integration — mirrors the surface of squarePayment.ts so
 * /api/admin/approve can swap between the two via the PAYMENT_PROCESSOR
 * env var without other code changes.
 *
 * Uses the new @paypal/paypal-server-sdk (NOT the deprecated
 * checkout-server-sdk). Flow:
 *   1. Create an Order with intent=CAPTURE        ← THIS FILE
 *   2. PayPal returns the order with a HATEOAS `approve` link
 *   3. Customer clicks that link → approves on PayPal → status=APPROVED
 *   4. PayPal redirects back to returnUrl
 *   5. Customer-facing /booking-confirmation page polls
 *      /api/paypal/check-capture every 5s
 *   6. check-capture sees APPROVED → calls POST /v2/checkout/orders/{id}/capture
 *      → status=COMPLETED → flips deposit_paid + status to confirmed
 *
 * !!! GOTCHA — DO NOT REMOVE THIS COMMENT !!!
 * intent=CAPTURE does NOT auto-capture for server-side flows. The PayPal
 * v2 Orders API leaves the order at status=APPROVED after buyer approval
 * and requires the merchant to explicitly POST to /capture. This is
 * different from the JavaScript Smart Buttons flow which does auto-capture.
 * The capture call lives in src/app/api/paypal/check-capture/route.ts.
 *
 * Webhooks (/api/paypal/webhook) are wired up as a backup but the polling
 * is the source of truth — sandbox webhook delivery has been unreliable
 * and the simulator can't validate against sandbox webhook IDs (cert/env
 * mismatch by PayPal's design).
 */

import {
  Client,
  Environment,
  OrdersController,
  CheckoutPaymentIntent,
  OrderApplicationContextUserAction,
} from '@paypal/paypal-server-sdk';

let paypalClientInstance: Client | null = null;
let ordersControllerInstance: OrdersController | null = null;

function getPayPalClient(): Client {
  if (paypalClientInstance) return paypalClientInstance;

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId) {
    throw new Error(
      'Missing PAYPAL_CLIENT_ID. Set it in .env.local (local) or in Vercel project settings → Environment Variables (deployed).'
    );
  }
  if (!clientSecret) {
    throw new Error(
      'Missing PAYPAL_CLIENT_SECRET. Set it in .env.local or Vercel environment variables.'
    );
  }

  paypalClientInstance = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: clientId,
      oAuthClientSecret: clientSecret,
    },
    environment:
      process.env.PAYPAL_ENVIRONMENT === 'production'
        ? Environment.Production
        : Environment.Sandbox,
    timeout: 0,
  });
  return paypalClientInstance;
}

function getOrdersController(): OrdersController {
  if (ordersControllerInstance) return ordersControllerInstance;
  ordersControllerInstance = new OrdersController(getPayPalClient());
  return ordersControllerInstance;
}

/**
 * Create a PayPal payment link for a deposit. Returns the same shape as
 * the Square version so the caller doesn't care which processor is used.
 *
 * @param amountInCents  Amount in cents (e.g., 3000 for $30)
 * @param description    Shown on PayPal checkout
 * @param orderId        Internal booking UUID — stamped on referenceId so
 *                       the webhook can correlate the payment back
 * @param returnUrl      Where PayPal sends the customer after payment
 */
export async function createPaymentLink(
  amountInCents: number,
  description: string,
  orderId: string,
  returnUrl: string
) {
  const controller = getOrdersController();

  // Convert cents → dollars string with two decimals (PayPal expects "30.00").
  const value = (amountInCents / 100).toFixed(2);

  // Cancel URL: same destination, just flagged so the page can show a
  // "you cancelled — try again" hint if we add one later.
  const cancelUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}cancelled=true`;

  let response;
  try {
    response = await controller.createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            referenceId: orderId,
            // customId surfaces directly on PAYMENT.CAPTURE.* webhook events
            // as `resource.custom_id`, so the webhook handler can grab the
            // booking UUID without a round-trip to fetch the parent order.
            customId: orderId,
            description,
            amount: {
              currencyCode: 'USD',
              value,
            },
          },
        ],
        applicationContext: {
          returnUrl,
          cancelUrl,
          userAction: OrderApplicationContextUserAction.PayNow,
          brandName: 'Austin Auto Detail',
          shippingPreference:
            // No shipping for a service booking. Use the enum-equivalent string.
            'NO_SHIPPING' as never,
        },
      },
      prefer: 'return=representation',
    });
  } catch (err: any) {
    // PayPal SDK errors put the real detail on .result, .body, or .response —
    // not always .message. Surface everything we can find for debugging.
    const detail =
      err?.message ||
      (err?.result && JSON.stringify(err.result)) ||
      (err?.body && (typeof err.body === 'string' ? err.body : JSON.stringify(err.body))) ||
      err?.response?.body ||
      'unknown error (check Vercel logs)';
    const status = err?.statusCode ? ` [HTTP ${err.statusCode}]` : '';
    console.error('[paypal] createOrder failed', {
      status: err?.statusCode,
      message: err?.message,
      result: err?.result,
      body: err?.body,
    });
    throw new Error(`PayPal createOrder failed${status}: ${detail}`);
  }

  const order = response.result;
  if (!order?.id) {
    throw new Error('PayPal order created but no ID returned');
  }

  // Find the HATEOAS approve link — that's the customer-facing payment URL.
  const approveLink = order.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action');
  if (!approveLink?.href) {
    throw new Error('PayPal order created but no approve link returned');
  }

  return {
    success: true as const,
    url: approveLink.href,
    id: order.id,
    orderId: order.id,
  };
}

export { getPayPalClient };
