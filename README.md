This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Background jobs

Daily cron jobs configured in `vercel.json`. Each route is gated by an `Authorization: Bearer ${CRON_SECRET}` check, so Vercel runs them automatically and the same URL can be triggered manually with curl.

| Path | Schedule (UTC) | What it does |
|---|---|---|
| `/api/cron/cleanup-photos` | `0 8 * * *` (08:00 UTC daily) | Deletes uploaded customer photos older than the retention window. |
| `/api/cron/expire-approvals` | `0 9 * * *` (09:00 UTC daily) | Marks approved-but-unpaid bookings as declined once their 24h payment window has passed and frees the slot. |
| `/api/cron/review-requests` | `0 16 * * *` (16:00 UTC = 9 AM MST, Phoenix) | Two passes per run. **Initial:** emails customers a NextDoor recommendation link 24h to 14d after a detail is marked completed. **Follow-up:** softer second email 7 to 21 days after the initial landed, only if no follow-up was sent yet. One initial and at most one follow-up per booking, ever. |

Manual trigger (e.g., to verify a fresh deploy):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://www.__DOMAIN_TBD__/api/cron/review-requests
```

Most routes return a flat `{ ok: true, found, sent, failed }` summary. The review-requests route reports both passes separately:

```json
{
  "ok": true,
  "initial":  { "found": N, "sent": N, "failed": 0 },
  "followup": { "found": N, "sent": N, "failed": 0 }
}
```

If a required env var is missing, any of the routes exits early with `{ ok: false, reason: ... }`.

Updated May 8 2026
