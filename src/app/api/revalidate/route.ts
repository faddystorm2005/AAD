import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

// Called by the Maus & Co. client portal after Alex saves an edit, so his
// changes appear on the live site within seconds instead of waiting out the
// normal cache window.
//
// The shared secret lives in the REVALIDATE_SECRET env var, never in this
// file. An earlier version hardcoded it, which published it to the public
// GitHub repo and to every clone's git history. If REVALIDATE_SECRET is
// unset we fail closed rather than falling back to a default, so a
// misconfigured deploy refuses requests instead of accepting anything.
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    console.error('[revalidate] REVALIDATE_SECRET is not set, refusing request.');
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const secret = req.nextUrl.searchParams.get('secret') || '';
  if (secret !== expected) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  // Next.js 16 requires a second argument. { expire: 0 } is the documented
  // pattern for webhooks that need edits visible on the very next request
  // (with 'max' the first visitor after an edit would still see stale content).
  revalidateTag('cms', { expire: 0 });
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, revalidated: true });
}
