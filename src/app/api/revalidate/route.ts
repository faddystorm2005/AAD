import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

// Called by the Maus & Co. client portal after Alex saves an edit, so his
// changes appear on the live site within seconds instead of waiting out the
// normal cache window.
const SECRET = 'c34841be44a05e70ae3a1fff3cd114c1';

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || '';
  if (secret !== SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  // Next.js 16 requires a second argument. { expire: 0 } is the documented
  // pattern for webhooks that need edits visible on the very next request
  // (with 'max' the first visitor after an edit would still see stale content).
  revalidateTag('cms', { expire: 0 });
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, revalidated: true });
}
