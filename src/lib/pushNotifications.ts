import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorMessage } from '@/lib/errors';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

function isConfigured(): boolean {
  return Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject);
}

if (isConfigured()) {
  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

async function sendToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<'ok' | 'expired' | 'error'> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return 'ok';
  } catch (err) {
    // web-push rejects with a WebPushError carrying the push service's HTTP
    // status. 404/410 mean the browser threw the subscription away, so the
    // caller prunes it rather than retrying.
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err
        ? (err as { statusCode?: unknown }).statusCode
        : undefined;
    if (statusCode === 404 || statusCode === 410) return 'expired';
    console.error('[push] send failed', errorMessage(err));
    return 'error';
  }
}

export async function sendPushToAllAdmins(payload: PushPayload): Promise<void> {
  if (!isConfigured()) {
    console.warn('[push] VAPID keys not configured - skipping admin push');
    return;
  }

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (error) {
    console.error('[push] could not read admin subscriptions', errorMessage(error));
    return;
  }

  // Nobody subscribed means nobody is being told a booking came in. That is a
  // silent failure with a real cost, and it is reachable on its own: expired
  // subscriptions are pruned below, so the last device going stale empties the
  // table and every later booking notifies no one, quietly.
  if (!subs?.length) {
    console.error(
      '[push] NO ADMIN DEVICES SUBSCRIBED. This booking alert reached nobody. ' +
        'An owner needs to open the admin on their phone and re-enable notifications.'
    );
    return;
  }

  const expiredIds: string[] = [];
  let delivered = 0;

  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendToSubscription(sub, payload);
      if (result === 'expired') expiredIds.push(sub.id);
      else if (result === 'ok') delivered += 1;
    })
  );

  if (expiredIds.length) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('id', expiredIds);
  }

  // The business has two owners, so "it worked" means more than one phone
  // buzzed. Log the counts either way: a run that delivers to one device out
  // of two looks identical to a healthy one otherwise.
  if (delivered === 0) {
    console.error(
      `[push] admin alert reached 0 of ${subs.length} device(s). ` +
        `${expiredIds.length} were expired and have been removed.`
    );
  } else {
    console.log(
      `[push] admin alert delivered to ${delivered} of ${subs.length} device(s)` +
        (expiredIds.length ? `, pruned ${expiredIds.length} expired` : '')
    );
  }
}

export async function sendPushToCustomer(bookingId: string, payload: PushPayload): Promise<void> {
  if (!isConfigured()) {
    console.warn('[push] VAPID keys not configured - skipping customer push');
    return;
  }

  const { data: subs, error } = await supabaseAdmin
    .from('customer_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('booking_id', bookingId);

  if (error || !subs?.length) return;

  const expiredIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendToSubscription(sub, payload);
      if (result === 'expired') expiredIds.push(sub.id);
    })
  );

  if (expiredIds.length) {
    await supabaseAdmin
      .from('customer_push_subscriptions')
      .delete()
      .in('id', expiredIds);
  }
}
