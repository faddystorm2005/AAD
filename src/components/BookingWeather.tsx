"use client";

import { useEffect, useState } from "react";
import type { WeatherResult } from "@/lib/weather";

interface Props {
  /** YYYY-MM-DD or any date string parseable by new Date(). */
  date: string;
  /** Compact = single line chip. Default = small badge with high/low + chance. */
  compact?: boolean;
}

function toIsoDate(input: string): string | null {
  // Already YYYY-MM-DD?
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  // Use the date in Phoenix time to avoid off-by-one for late-night UTC values.
  const central = new Date(d.toLocaleString("en-US", { timeZone: "America/Phoenix" }));
  const yyyy = central.getFullYear();
  const mm = String(central.getMonth() + 1).padStart(2, "0");
  const dd = String(central.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const cache = new Map<string, Promise<WeatherResult>>();

function fetchOnce(date: string): Promise<WeatherResult> {
  const hit = cache.get(date);
  if (hit) return hit;
  const p: Promise<WeatherResult> = fetch(`/api/weather?date=${date}`)
    .then(async (r) => {
      if (!r.ok) return { date, unavailable: 'api-error' as const };
      return (await r.json()) as WeatherResult;
    })
    .catch(() => ({ date, unavailable: 'api-error' as const }));
  cache.set(date, p);
  return p;
}

export default function BookingWeather({ date, compact = false }: Props) {
  const iso = toIsoDate(date);
  const [data, setData] = useState<WeatherResult | null>(null);

  useEffect(() => {
    if (!iso) return;
    let cancelled = false;
    fetchOnce(iso).then((r) => {
      if (!cancelled) setData(r);
    });
    return () => {
      cancelled = true;
    };
  }, [iso]);

  if (!iso || !data) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-300">
        <span className="h-2 w-2 animate-pulse-soft rounded-full bg-gray-600" />
        Weather…
      </span>
    );
  }

  if (!data.forecast) {
    if (data.unavailable === 'past') return null; // Don't clutter past bookings.
    if (data.unavailable === 'too-far') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-300">
          🗓️ Forecast appears closer to the date
        </span>
      );
    }
    if (data.unavailable === 'api-error') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-300">
          🌡️ Weather unavailable
        </span>
      );
    }
    return null;
  }

  const f = data.forecast;
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-gray-300"
        title={`${f.label}, high ${f.highF}°/low ${f.lowF}°, ${f.precipChance}% chance of precipitation`}
      >
        <span aria-hidden>{f.emoji}</span>
        <span className="font-medium">{f.highF}°</span>
        {f.precipChance >= 30 && (
          <span className="text-blue-300">· {f.precipChance}% rain</span>
        )}
      </span>
    );
  }

  const isWet = f.precipChance >= 40;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
        isWet
          ? "border-blue-700/60 bg-blue-900/30 text-blue-100"
          : "border-gray-600 bg-gray-800/60 text-gray-200"
      }`}
      title={`${f.label} in Phoenix`}
    >
      <span aria-hidden className="text-sm leading-none">
        {f.emoji}
      </span>
      <span className="font-medium">
        {f.highF}° / {f.lowF}°
      </span>
      <span className="text-gray-300">·</span>
      <span>{f.label}</span>
      {f.precipChance >= 20 && (
        <>
          <span className="text-gray-300">·</span>
          <span className={isWet ? "text-blue-200" : "text-gray-300"}>
            {f.precipChance}% rain
          </span>
        </>
      )}
    </span>
  );
}
