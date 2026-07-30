import OpenAI from "openai";
import { storage } from "./storage";
import { fetchWeatherData } from "./weather-service";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// The model's ONLY job is to classify the intent and extract which spots the
// user is asking about. All display text is formatted by server code below.
const SYSTEM_PROMPT = `You are a surf data assistant. Respond ONLY with valid JSON matching this schema:

{
  "intent": "conditions" | "forecast" | "compare" | "other",
  "spots": ["exact spot name from context", ...],
  "otherAnswer": "only populate this when intent is 'other' — one plain sentence answering the question using only facts from the context. No opinions, no advice."
}

intent meanings:
- "conditions": user wants current conditions at one or more spots
- "forecast": user wants the multi-day forecast for one or more spots  
- "compare": user wants spots compared side-by-side
- "other": any question that doesn't fit above (e.g. "what is a period?", "when is high tide?")

spots: list only exact spot names from the context that are relevant to the user's question. If the user says "my spots" or "all spots", include all of them.
otherAnswer: ONLY for intent="other". Facts only, no opinions or advice.`;

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

function formatConditionsLine(spot: { name: string; conditions: any }): string {
  const c = spot.conditions;
  if (!c) return `${spot.name}: No data available.`;

  const parts: string[] = [];
  if (c.waveHeight != null && c.wavePeriod != null) {
    const dir = c.waveDirection ? ` ${c.waveDirection}` : '';
    parts.push(`Waves: ${parseFloat(c.waveHeight).toFixed(1)}ft at ${c.wavePeriod}s${dir}`);
  }
  if (c.windSpeed != null) {
    const dir = c.windDirection ? ` ${c.windDirection}` : '';
    const gusts = c.windGusts ? `, gusts ${Math.round(parseFloat(c.windGusts))}mph` : '';
    parts.push(`Wind: ${Math.round(parseFloat(c.windSpeed))}mph${dir}${gusts}`);
  }
  if (c.tideStatus != null) {
    const height = c.tideHeight != null ? ` at ${parseFloat(c.tideHeight).toFixed(1)}ft` : '';
    parts.push(`Tide: ${c.tideStatus}${height}`);
  }
  if (c.waterTemp != null) {
    parts.push(`Water: ${Math.round(parseFloat(c.waterTemp))}°F`);
  }

  let staleNote = '';
  if (c.lastUpdated) {
    const { label, stale } = relativeAge(c.lastUpdated);
    if (stale) staleNote = ` (data from ${label})`;
  }

  return `${spot.name}: ${parts.join('. ')}.${staleNote}`;
}

function formatForecastLines(spot: { name: string; forecast?: any[] }): string {
  if (!spot.forecast?.length) return `${spot.name}: No forecast available.`;
  const lines = spot.forecast.map((d: any) => {
    const h = d.waveHeight != null ? `${parseFloat(d.waveHeight).toFixed(1)}ft` : '?ft';
    const p = d.wavePeriod != null ? ` at ${d.wavePeriod}s` : '';
    return `  ${d.date}: ${h}${p}`;
  });
  return `${spot.name} forecast:\n${lines.join('\n')}`;
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
      if (isConditionsStale(conditions)) {
        try {
          const weatherData = await fetchWeatherData(
            parseFloat(loc.latitude),
            parseFloat(loc.longitude),
          );
          conditions = conditions
            ? await storage.updateSurfConditions(loc.id, weatherData)
            : await storage.createSurfConditions({ locationId: loc.id, ...weatherData });
          console.log(`🔄 Auto-refreshed conditions for ${loc.name}`);
        } catch (err) {
          console.warn(`⚠️  Auto-refresh failed for ${loc.name}:`, err);
        }
      }
      return { name: loc.name, city: loc.city, country: loc.country, conditions };
    }),
  );

  const conditionsContext = buildConditionsContext(spotsWithConditions);

  // Ask the model to classify intent + extract spot names — JSON only
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentHistory = history.filter(
    (m: any) => !m.createdAt || new Date(m.createdAt).getTime() > cutoff,
  );

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nAvailable spots:\n${conditionsContext}`,
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
    max_completion_tokens: 300,
    response_format: { type: 'json_object' },
  });

  let parsed: { intent: string; spots: string[]; otherAnswer?: string };
  try {
    parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
  } catch {
    return "Couldn't parse a response. Please try again.";
  }

  const { intent, spots: requestedSpots = [], otherAnswer } = parsed;

  // Match requested spot names back to our data (case-insensitive partial match)
  const matchedSpots = requestedSpots.length > 0
    ? spotsWithConditions.filter(s =>
        requestedSpots.some(r => s.name.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(s.name.toLowerCase()))
      )
    : spotsWithConditions;

  if (intent === 'conditions' || intent === 'compare') {
    if (matchedSpots.length === 0) return "No data available for the requested spot(s).";
    return matchedSpots.map(formatConditionsLine).join('\n');
  }

  if (intent === 'forecast') {
    if (matchedSpots.length === 0) return "No forecast data available for the requested spot(s).";
    return matchedSpots.map(formatForecastLines).join('\n\n');
  }

  // intent === 'other' — return the model's plain-text answer (facts only)
  return otherAnswer?.trim() || "No data available to answer that.";
}
