import { NextRequest, NextResponse } from "next/server";
import { getPhoenixForecast } from "@/lib/weather";

export const runtime = "nodejs";

/**
 * GET /api/weather?date=YYYY-MM-DD
 *
 * Public - no auth (just a forecast lookup). Cached at the upstream-fetch
 * layer for 1h via Next.js revalidation, so repeated lookups for the same
 * date hit the cache.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
  }

  const result = await getPhoenixForecast(date);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
