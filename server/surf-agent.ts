import OpenAI from "openai";
import { storage } from "./storage";
import { fetchWeatherData, fetchTideData, fetchAgentForecast, getQuotaExceededAt, type AgentForecastDay } from "./weather-service";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// The model's ONLY job is to classify the intent and extract which spots the
// user is asking about. All display text is formatted by server code below.
const SYSTEM_PROMPT = `You are a surf data assistant. Respond ONLY with valid JSON matching this schema:

{
  "intent": "conditions" | "forecast" | "compare" | "other" | "clarify",
  "spots": ["exact spot name from context", ...],
  "otherAnswer": "only populate this when intent is 'other' — a clear factual answer (up to 3 sentences) using surfing/oceanography knowledge. No opinions, no advice.",
  "clarifyQuestion": "only populate this when intent is 'clarify' — a short friendly question asking which spot the user means, listing their saved spots."
}

intent meanings:
- "conditions": user wants current conditions at one or more spots
- "forecast": user wants the multi-day forecast for one or more spots
- "compare": user wants spots compared side-by-side
- "other": a general surf/ocean knowledge question that doesn't require specific spot data (e.g. "what is a wave period?", "what does offshore mean?", "what's a good wave height for beginners?", "how do I read a swell chart?"). Answer from general surfing and oceanography knowledge — factual explanations are allowed even if the spot context doesn't cover the topic.
- "clarify": user's message relates to surf data but NO spot can be inferred from the message OR from the conversation history, and no context hint is available

spots rules — READ CAREFULLY:
1. If the user names a specific spot, include it.
2. If the user says "my spots", "all spots", or similar, include ALL spots from context.
3. **Follow-up inference**: If the user sends a follow-up like "how about tomorrow?", "what's the wind?", "is it good in the morning?", "what about Saturday?" — and the "Current context" line below shows a last-discussed spot — USE THAT SPOT. Do NOT return an empty spots array for follow-up questions when context is available.
4. If intent is "clarify", return an empty spots array.

otherAnswer: ONLY for intent="other". Facts and explanations from surfing/oceanography knowledge are fine. No opinions, no surf advice, no recommendations.
clarifyQuestion: ONLY for intent="clarify". Keep it short and friendly. List the user's saved spot names so they can pick one.`;

// ── Pure server-side formatters ───────────────────────────────────────────────

function relativeAge(isoString: string): { label: string; stale: boolean } {
  const ageMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.round(ageMs / 60_000);
  const stale = ageMs > 2 * 60 * 60 * 1000;
  if (minutes < 1) return { label: 'just now', stale };
  if (minutes < 60) return { label: `${minutes}min ago`, stale };
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return { label: mins > 0 ? `${hours}h ${mins}min ago` : `${hours}h ago`, stale };
}

function parseTimeToday(timeStr: string): Date {
  return new Date(`${new Date().toDateString()} ${timeStr}`);
}

function findNextTide(
  tideHigh: Array<{ time: string; height: string }> | undefined,
  tideLow: Array<{ time: string; height: string }> | undefined,
  tideStatus: string,
): { label: string; time: string; height: string } | null {
  const rising = tideStatus?.toLowerCase() === 'rising';
  const pool = rising ? tideHigh : tideLow;
  if (!pool?.length) return null;
  const now = Date.now();
  const future = pool.filter(t => {
    const dt = parseTimeToday(t.time);
    return !isNaN(dt.getTime()) && dt.getTime() > now;
  });
  const entry = future.length > 0 ? future[0] : pool[0];
  return { label: rising ? 'High Tide' : 'Low Tide', time: entry.time, height: entry.height };
}

function formatConditionsLine(spot: { name: string; conditions: any }): string {
  const c = spot.conditions;
  if (!c) return `${spot.name}\nNo data available.`;

  const lines: string[] = [`${spot.name}`];

  if (c.waveHeight != null && c.wavePeriod != null) {
    const dir = c.waveDirection ? `, ${c.waveDirection}` : '';
    lines.push(`Swell - ${parseFloat(c.waveHeight).toFixed(1)}ft at ${c.wavePeriod}s${dir}`);
  }
  if (c.windSpeed != null) {
    const dir = c.windDirection ? `, ${c.windDirection}` : '';
    lines.push(`Wind - ${Math.round(parseFloat(c.windSpeed))}mph${dir}`);
  }
  if (c.tideStatus != null) {
    const next = findNextTide(c.tideHigh, c.tideLow, c.tideStatus);
    if (next) {
      lines.push(`Tide - ${c.tideStatus} to ${next.label} at ${next.time} and ${parseFloat(next.height).toFixed(1)}ft`);
    } else {
      const height = c.tideHeight != null ? ` at ${parseFloat(c.tideHeight).toFixed(1)}ft` : '';
      lines.push(`Tide - ${c.tideStatus}${height}`);
    }
  }
  if (c.waterTemp != null) {
    lines.push(`Water Temp - ${Math.round(parseFloat(c.waterTemp))}°F`);
  }

  if (c.lastUpdated) {
    const { label, stale } = relativeAge(c.lastUpdated);
    if (stale) lines.push(`(data from ${label})`);
  }

  return lines.join('\n');
}

function formatForecastDay(d: AgentForecastDay): string {
  const rows: string[] = [];
  const wave = [d.waveHeight, d.wavePeriod, d.waveDirection].filter(Boolean).join(' · ');
  if (wave) { rows.push('Swell'); rows.push(wave); rows.push(''); }
  if (d.windSpeed) {
    const wind = [d.windSpeed, d.windDirection].filter(Boolean).join(' · ');
    rows.push('Wind'); rows.push(wind); rows.push('');
  }
  if (d.tides.length > 0) {
    rows.push('Tides');
    for (const t of d.tides) {
      rows.push(`${t.type === 'High' ? 'HT' : 'LT'} ${t.time} · ${t.height}ft`);
    }
  }
  return rows.join('\n').trimEnd();
}

function formatForecastLines(spot: { name: string; forecast?: AgentForecastDay[] }): string {
  if (!spot.forecast?.length) return `${spot.name}\nNo forecast available.`;
  const isSingleDay = spot.forecast.length === 1;
  if (isSingleDay) {
    const d = spot.forecast[0];
    return `${spot.name} Forecast - ${d.date}\n\n${formatForecastDay(d)}`;
  }
  const sections = spot.forecast.map((d) => `${d.date}\n${formatForecastDay(d)}`);
  return `${spot.name} Forecast\n\n${sections.join('\n\n')}`;
}

// ── Context builder (used by the LLM for intent/spot detection) ───────────────

function buildConditionsContext(spots: SpotData[]): string {
  if (spots.length === 0) return "User has no saved surf spots.";
  const lines = spots.map(s => {
    const c = s.conditions;
    if (!c) return `- ${s.name}: No conditions data`;
    const age = c.lastUpdated ? relativeAge(c.lastUpdated) : null;
    const stale = age?.stale ? ' [STALE]' : '';
    return `- ${s.name}: ${parseFloat(c.waveHeight ?? 0).toFixed(1)}ft @ ${c.wavePeriod ?? '?'}s ${c.waveDirection ?? ''} | wind ${Math.round(parseFloat(c.windSpeed ?? 0))}mph ${c.windDirection ?? ''} | tide ${c.tideStatus ?? '?'} ${c.tideHeight ? parseFloat(c.tideHeight).toFixed(1) + 'ft' : ''} | water ${c.waterTemp ? Math.round(parseFloat(c.waterTemp)) + '°F' : '?'}${stale}`;
  });
  return lines.join('\n');
}

/**
 * Scan the last few assistant messages in history to find which spot names
 * from the saved spots list were most recently discussed.
 * Returns an array of matched spot names (in order of recency).
 */
function extractLastDiscussedSpots(
  history: AgentMessage[],
  spotNames: string[],
  lookback = 6,
): string[] {
  if (spotNames.length === 0 || history.length === 0) return [];

  // Walk backwards through recent assistant messages
  const recent = history.slice(-lookback).reverse();
  for (const msg of recent) {
    if (msg.role !== 'assistant') continue;
    const content = msg.content.toLowerCase();
    const found = spotNames.filter(name =>
      content.includes(name.toLowerCase())
    );
    if (found.length > 0) return found;
  }
  return [];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpotData {
  name: string;
  city: string;
  country: string;
  conditions: any;
  forecast?: any[];
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

function isConditionsStale(conditions: any): boolean {
  if (!conditions?.lastUpdated) return true;
  return Date.now() - new Date(conditions.lastUpdated).getTime() > STALE_THRESHOLD_MS;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runSurfAgent(
  userId: string,
  userMessage: string,
  history: AgentMessage[],
): Promise<string> {
  const favoriteLocations = await storage.getUserFavorites(userId);

  // Auto-refresh stale conditions before answering
  const spotsWithConditions: SpotData[] = await Promise.all(
    favoriteLocations.map(async (loc) => {
      let conditions = await storage.getSurfConditions(loc.id);
      let tideArrays: { tideHigh?: any[]; tideLow?: any[] } = {};

      if (isConditionsStale(conditions)) {
        try {
          const weatherData = await fetchWeatherData(
            parseFloat(loc.latitude),
            parseFloat(loc.longitude),
          );
          // Skip DB write when quota is exhausted — fabricated demo data must not
          // overwrite stored real conditions.  Use existing (stale) conditions instead.
          if ((weatherData as any).quotaExceeded || getQuotaExceededAt()) {
            console.warn(`⚠️  Skipping auto-refresh DB write for ${loc.name} — OpenWeather quota exceeded; using last known conditions`);
            // tideArrays stays empty; the else branch below will fetch tide data from NOAA
          } else {
            conditions = conditions
              ? await storage.updateSurfConditions(loc.id, weatherData)
              : await storage.createSurfConditions({ locationId: loc.id, ...weatherData });
            // Capture tide schedule from fresh weather data (not persisted in DB)
            tideArrays = { tideHigh: weatherData.tideHigh, tideLow: weatherData.tideLow };
            console.log(`🔄 Auto-refreshed conditions for ${loc.name}`);
          }
        } catch (err) {
          console.warn(`⚠️  Auto-refresh failed for ${loc.name}:`, err);
        }
      } else {
        // Conditions are fresh but DB doesn't store tide schedule — fetch it now
        try {
          const tideData = await fetchTideData(
            parseFloat(loc.latitude),
            parseFloat(loc.longitude),
          );
          tideArrays = { tideHigh: tideData.tideHigh, tideLow: tideData.tideLow };
        } catch {
          // non-fatal: tide times will fall back to the simple Rising/Falling label
        }
      }

      return {
        name: loc.name,
        city: loc.city,
        country: loc.country,
        conditions: conditions ? { ...conditions, ...tideArrays } : conditions,
      };
    }),
  );

  const conditionsContext = buildConditionsContext(spotsWithConditions);
  const spotNames = spotsWithConditions.map(s => s.name);

  // Determine the last discussed spots from history — used as a context hint
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentHistory = history.filter(
    (m: any) => !m.createdAt || new Date(m.createdAt).getTime() > cutoff,
  );

  const lastDiscussedSpots = extractLastDiscussedSpots(recentHistory, spotNames);

  // Build a context hint line to help the model with follow-up inference
  const contextHint = lastDiscussedSpots.length > 0
    ? `\nCurrent context: last discussed spot(s): ${lastDiscussedSpots.join(', ')}`
    : '';

  // Ask the model to classify intent + extract spot names — JSON only
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nAvailable spots:\n${conditionsContext}${contextHint}`,
    },
    ...recentHistory.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0,
    max_completion_tokens: 500,
    response_format: { type: 'json_object' },
  });

  let parsed: { intent: string; spots: string[]; otherAnswer?: string; clarifyQuestion?: string };
  try {
    parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
  } catch {
    return "Couldn't parse a response. Please try again.";
  }

  const { intent, spots: requestedSpots = [], otherAnswer, clarifyQuestion } = parsed;

  // ── Spot resolution with smarter fallback ────────────────────────────────────
  let matchedSpots: SpotData[];

  if (requestedSpots.length > 0) {
    // Model named spots explicitly — match them
    matchedSpots = spotsWithConditions.filter(s =>
      requestedSpots.some(r =>
        s.name.toLowerCase().includes(r.toLowerCase()) ||
        r.toLowerCase().includes(s.name.toLowerCase())
      )
    );
  } else if (intent === 'other' || intent === 'clarify') {
    // These intents don't need spot data
    matchedSpots = [];
  } else {
    // Follow-up message with no explicit spot — use last discussed spots from history
    if (lastDiscussedSpots.length > 0) {
      matchedSpots = spotsWithConditions.filter(s =>
        lastDiscussedSpots.some(n =>
          s.name.toLowerCase() === n.toLowerCase()
        )
      );
    } else {
      // No prior context at all — the model should have returned "clarify";
      // but if it didn't, treat it as clarify here
      matchedSpots = [];
    }
  }

  // ── Intent handlers ───────────────────────────────────────────────────────────

  if (intent === 'clarify') {
    // Return the model's clarifying question, or a sensible default
    if (clarifyQuestion?.trim()) return clarifyQuestion.trim();
    const spotList = spotNames.length > 0 ? spotNames.join(', ') : 'none saved yet';
    return `Which spot are you asking about? Your saved spots are: ${spotList}.`;
  }

  if (intent === 'conditions' || intent === 'compare') {
    if (matchedSpots.length === 0) {
      // No spots resolved and no prior context — ask for clarification
      const spotList = spotNames.length > 0 ? spotNames.join(', ') : 'none saved yet';
      return `Which spot are you asking about? Your saved spots are: ${spotList}.`;
    }
    return matchedSpots.map(formatConditionsLine).join('\n\n');
  }

  if (intent === 'forecast') {
    if (matchedSpots.length === 0) {
      const spotList = spotNames.length > 0 ? spotNames.join(', ') : 'none saved yet';
      return `Which spot are you asking about? Your saved spots are: ${spotList}.`;
    }

    // Determine which days the user actually wants based on their message
    const msgLower = userMessage.toLowerCase();
    const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    let dayFilter: ((d: AgentForecastDay) => boolean) | null = null;

    if (/\btomorrows?\b/.test(msgLower)) {
      dayFilter = (d) => d.date === 'Tomorrow';
    } else {
      // Check for a specific day name e.g. "Wednesday"
      const namedDay = DAY_NAMES.find(day => msgLower.includes(day));
      if (namedDay) {
        dayFilter = (d) => d.date.toLowerCase().startsWith(namedDay.slice(0, 3));
      }
    }
    // No dayFilter → return all 5 days (user asked for the full forecast / this week / etc.)

    // Fetch forecast data for matched spots after intent is known (avoids latency on conditions queries)
    const forecastSpots = await Promise.all(
      matchedSpots.map(async (s) => {
        const loc = favoriteLocations.find(l => l.name === s.name);
        if (!loc) return { ...s, forecast: [] as AgentForecastDay[] };
        try {
          const all = await fetchAgentForecast(parseFloat(loc.latitude), parseFloat(loc.longitude));
          const forecast = dayFilter ? all.filter(dayFilter) : all;
          return { ...s, forecast };
        } catch (err) {
          console.warn(`⚠️  Forecast fetch failed for ${s.name}:`, err);
          return { ...s, forecast: [] as AgentForecastDay[] };
        }
      }),
    );
    return forecastSpots.map(formatForecastLines).join('\n\n');
  }

  // intent === 'other' — return the model's educational/factual answer
  if (otherAnswer?.trim()) return otherAnswer.trim();
  return "I don't have enough context to answer that. Try asking about a specific spot or a surf concept.";
}
