# Supabase Setup

This project uses Supabase for authentication, database, and realtime updates.

There is **no payment processor**. Customers pay nothing up front: a request is
approved, the owners text to arrange a time, and the full amount is collected
on-site. The Square and PayPal integrations this document used to describe were
removed along with the deposit flow.

## 1. Create a Supabase project

1. Go to https://app.supabase.com and sign up or log in.
2. Create a new project.
3. Choose a project name like `aad-detailing`.
4. Choose a password and a region close to you.
5. Once the project is ready, open the project dashboard.

## 2. Enable authentication

There are no passwords. Customers sign in one of two ways:

1. In the Supabase dashboard, go to `Authentication` > `Providers`.
2. Enable **Google** and add your OAuth client ID and secret. This is the
   primary path.
3. Enable **Email** for magic links. `signInWithOtp` sends both a clickable
   link and a numeric code, so a customer can finish on a second device.
4. Save settings.

## 3. Create the database tables

1. In the Supabase dashboard, open `SQL Editor`.
2. Run `supabase-schema.sql` first: it creates profiles, vehicles, bookings,
   and admin roles.
3. Then run the incremental `supabase-*.sql` files at the repo root. They are
   additive and safe to re-run. `supabase-add-payment-tracking.sql` is the one
   that adds the on-site payment columns the admin page reads.

## 4. Get the Supabase environment values

1. In the dashboard, go to `Settings` > `API`.
2. Copy the `Project URL`.
3. Copy the `anon public` key.
4. Copy the `service_role` key.

Add them to `.env.local` for local work, and to the Vercel project settings for
deploys:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key bypasses Row Level Security. It is server-only and must
never reach the browser or be committed. This repository is public.

## 5. Other environment variables

See the env section of `PROJECT_CONTEXT.md` for the full list, including
`REVALIDATE_SECRET`, `CRON_SECRET`, and the Twilio and Resend keys used for
customer notifications.

## Note on `deposit_paid`

The `bookings` table still has `deposit_paid` and `deposit_amount` columns, but
`deposit_paid` no longer means the customer paid. It is set true at approval so
the booking keeps holding its slot, and both `/api/availability` and the
expire-approvals cron read it. Money actually collected is recorded separately
in `paid_at`, `paid_amount`, and `payment_method`.
