/**
 * Weather forecasting via Open-Meteo (free, no API key).
 * https://open-meteo.com/en/docs
 *
 * Coordinates default to Austin, TX. Forecast horizon is ~16 days.
 */

const AUSTIN = { lat: 30.2672, lon: -97.7431, tz: "America/Chicago" } as const;

export interface DailyWeather {
  date: string; // YYYY-MM-DD
  highF: number;
  lowF: number;
  precipChance: number; // 0–100
  weatherCode: number;
  label: string;
  emoji: string;
}

export type WeatherUnavailableReason = 'past' | 'too-far' | 'api-error' | 'invalid-date';

export interface WeatherResult {
  date: string;
  forecast?: DailyWeather;
  /** Set when forecast is missing — tells the UI which message to show. */
  unavailable?: WeatherUnavailableReason;
}

/**
 * Map a WMO weathercode to a friendly label + emoji.
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */
function describeCode(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "Clear", emoji: "☀️" };
  if (code >= 1 && code <= 2) return { label: "Mostly sunny", emoji: "🌤️" };
  if (code === 3) return { label: "Cloudy", emoji: "☁️" };
  if (code === 45 || code === 48) return { label: "Foggy", emoji: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", emoji: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Rain", emoji: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snow", emoji: "🌨️" };
  if (code >= 80 && code <= 82) return { label: "Showers", emoji: "🌦️" };
  if (code >= 85 && code <= 86) return { label: "Snow showers", emoji: "🌨️" };
  if (code >= 95) return { label: "Thunderstorm", emoji: "⛈️" };
  return { label: "Unknown", emoji: "🌡️" };
}

/**
 * Fetch a single-day forecast for Austin. Returns `outOfRange` when the date
 * is past Open-Meteo's 16-day window (or in the past).
 *
 * Cached for 1h via Next's fetch revalidation — many bookings can share dates
 * without hammering the API.
 */
export async function getAustinForecast(date: string): Promise<WeatherResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { date, unavailable: 'invalid-date' };
  }

  // Compute "today" in Austin (Central) time, not UTC, so a late-night UTC
  // server doesn't think tomorrow already started.
  const todayCentral = new Date(
    new Date().toLocaleString('en-US', { timeZone: AUSTIN.tz })
  );
  const today = `${todayCentral.getFullYear()}-${String(todayCentral.getMonth() + 1).padStart(2, '0')}-${String(todayCentral.getDate()).padStart(2, '0')}`;

  const requested = new Date(date + 'T00:00:00Z');
  const todayDate = new Date(today + 'T00:00:00Z');
  const daysOut = Math.round(
    (requested.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysOut < 0) return { date, unavailable: 'past' };
  if (daysOut > 15) return { date, unavailable: 'too-far' };

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${AUSTIN.lat}&longitude=${AUSTIN.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
    `&temperature_unit=fahrenheit` +
    `&timezone=${encodeURIComponent(AUSTIN.tz)}` +
    `&start_date=${date}&end_date=${date}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    return { date, unavailable: 'api-error' };
  }

  const data = (await res.json()) as {
    daily?: {
      time?: string[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: (number | null)[];
      weathercode?: number[];
    };
  };

  const d = data.daily;
  if (
    !d?.time?.[0] ||
    d.temperature_2m_max?.[0] == null ||
    d.temperature_2m_min?.[0] == null ||
    d.weathercode?.[0] == null
  ) {
    return { date, unavailable: 'api-error' };
  }

  const code = d.weathercode[0];
  const precipChance = Math.round(d.precipitation_probability_max?.[0] ?? 0);
  let { label, emoji } = describeCode(code);

  // Open-Meteo's daily weathercode is the worst event of the day — a 30-min
  // afternoon storm with 10% rain chance still gets labeled "Thunderstorm".
  // Downgrade the label/emoji when the day is overwhelmingly likely to be dry.
  const SEVERE_CODES = new Set([
    51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
  ]);
  if (SEVERE_CODES.has(code) && precipChance < 30) {
    label = "Mostly sunny";
    emoji = "🌤️";
  }

  return {
    date,
    forecast: {
      date: d.time[0],
      highF: Math.round(d.temperature_2m_max[0]),
      lowF: Math.round(d.temperature_2m_min[0]),
      precipChance,
      weatherCode: code,
      label,
      emoji,
    },
  };
}
