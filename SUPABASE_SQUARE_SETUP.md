# Supabase + Square Setup

This project uses Supabase for authentication, database, and realtime updates, and Square for the $30 deposit payment.

## 1. Create a Supabase project

1. Go to https://app.supabase.com and sign up or log in.
2. Create a new project.
3. Choose a project name like `aad-detailing`.
4. Choose a password and a region close to you.
5. Once the project is ready, open the project dashboard.

## 2. Enable email auth

1. In the Supabase dashboard, go to `Authentication` > `Settings`.
2. Under `Sign in methods`, enable `Email`.
3. Save settings.

## 3. Create the database tables

1. In the Supabase dashboard, open `SQL Editor`.
2. Copy the contents of `supabase-schema.sql`.
3. Paste it into the SQL Editor and run it.

This creates the core tables for users, vehicles, bookings, and admin roles.

## 4. Get the Supabase environment values

1. In the dashboard, go to `Settings` > `API`.
2. Copy the `Project URL`.
3. Copy the `anon public` key.
4. Copy the `service_role` key.

Add them to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 5. Create a Square account

1. Go to https://squareup.com/signup and sign up for a Square account.
2. Complete the business setup process.
3. In your Square dashboard, go to `Settings` > `Account & Settings` > `API Keys`.
4. Generate an `Access Token` and `Application ID`.
5. Set the environment to `Sandbox` for testing.

Add them to `.env.local`:

```env
SQUARE_ACCESS_TOKEN=your-access-token
SQUARE_APPLICATION_ID=your-application-id
SQUARE_ENVIRONMENT=sandbox
```

## 6. Use Square sandbox mode first

1. Keep Square in `Sandbox` mode while we build.
2. Use test card numbers from Square's documentation.
3. This is safe and does not charge real cards.

## 7. Next step after setup

After you have the keys in `.env.local`, I can help you build:

- user sign up / login pages
- vehicle save form
- booking form with service pricing
- Square deposit checkout flow
- admin dashboard with live booking status updates
