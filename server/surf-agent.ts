import OpenAI from "openai";
import { storage } from "./storage";
import { fetchWeatherData } from "./weather-service";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are the Live Swell Agent. You report surf conditions data. Do not editorialize, hype, or give opinions on whether conditions are good or bad — just state the numbers and facts plainly.

Rules:
- Report data as-is: wave height, period, direction, wind speed/direction, tide, water temp. No adjectives like "epic", "firing", "pumping", "solid", "fun".
- No recommendations or advice ("you should go", "dawn patrol would be worth it", etc.).
- Keep every response under 80 words. Be terse.
- Use plain text only — no bullet points, no markdown, no headers.
- If data is marked STALE (older than 2 hours), note the age so the user knows.
- If a spot's entry says "No conditions data available", say "No data available for [spot name]." Do not guess or estimate.`;

function relativeAge(isoString: string): { label: string; stale: boolean } {
  const ageMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.round(ageMs / 60_000);
  const stale = ageMs > 2 * 60 * 60 * 1000; // > 2 hours

  let label: string;
  if (minutes < 1) {
    label = 'just now';
  } else if (minutes < 60) {
    label = `${minutes} min ago`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    label = mins > 0 ? `${hours}h ${mins}min ago` : `${hours}h ago`;
  }
  return { label, stale };
}

function buildConditionsContext(spots: Array<{
  name: string;
  city: string;
  country: string;
  conditions?: any;
}>): string {
  if (spots.length === 0) return "The user has no saved surf spots yet.";

  const lines = spots.map(s => {
    const c = s.conditions;
    if (!c) return `- ${s.name} (${s.city}): No conditions data available`;

    const waveHeight = c.waveHeight ? `${parseFloat(c.waveHeight).toFixed(1)}ft` : '?ft';
    const wavePeriod = c.wavePeriod ? `${c.wavePeriod}s` : '?s';
    const waveDir = c.waveDirection ?? '?';
    const windSpeed = c.windSpeed ? `${Math.round(parseFloat(c.windSpeed))}mph` : '?mph';
    const windDir = c.windDirection ?? '?';
    const windGusts = c.windGusts ? ` (gusts ${Math.round(parseFloat(c.windGusts))}mph)` : '';
    const tide = c.tideStatus ?? 'unknown';
    const tideHeight = c.tideHeight ? ` ${parseFloat(c.tideHeight).toFixed(1)}ft` : '';
    const waterTemp = c.waterTemp ? ` ${parseFloat(c.waterTemp).toFixed(0)}°F water` : '';

    let updatedLabel: string;
    let staleFlag = '';
    if (c.lastUpdated) {
      const { label, stale } = relativeAge(c.lastUpdated);
      updatedLabel = `updated ${label}`;
      if (stale) staleFlag = ' [STALE]';
    } else {
      updatedLabel = 'no update time';
      staleFlag = ' [STALE]';
    }

    return `- ${s.name} (${s.city}, ${s.country}): ${waveHeight} @ ${wavePeriod} from ${waveDir} | wind ${windSpeed}${windGusts} from ${windDir} | tide ${tide}${tideHeight}${waterTemp} | ${updatedLabel}${staleFlag}`;
  });

  return `User's saved surf spots (current conditions):\n${lines.join('\n')}`;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Returns true if conditions are missing or older than the stale threshold. */
function isConditionsStale(conditions: any): boolean {
  if (!conditions || !conditions.lastUpdated) return true;
  return Date.now() - new Date(conditions.lastUpdated).getTime() > STALE_THRESHOLD_MS;
}

export async function runSurfAgent(
  userId: string,
  userMessage: string,
  history: AgentMessage[],
): Promise<string> {
  // Fetch user's saved spots
  const favoriteLocations = await storage.getUserFavorites(userId);

  // Auto-refresh any spot whose conditions are stale (>2h old or missing)
  // before building the context, so the agent always answers with fresh data.
  const spotsWithConditions = await Promise.all(
    favoriteLocations.map(async (loc) => {
      let conditions = await storage.getSurfConditions(loc.id);

      if (isConditionsStale(conditions)) {
        try {
          const weatherData = await fetchWeatherData(
            parseFloat(loc.latitude),
            parseFloat(loc.longitude),
          );
          if (conditions) {
            conditions = await storage.updateSurfConditions(loc.id, weatherData);
          } else {
            conditions = await storage.createSurfConditions({ locationId: loc.id, ...weatherData });
          }
          console.log(`🔄 Auto-refreshed stale conditions for ${loc.name}`);
        } catch (err) {
          console.warn(`⚠️  Auto-refresh failed for ${loc.name}:`, err);
          // Fall through — use the stale/missing conditions; the STALE flag in
          // the context will inform the model and the user.
        }
      }

      return {
        name: loc.name,
        city: loc.city,
        country: loc.country,
        conditions,
      };
    }),
  );

  const conditionsContext = buildConditionsContext(spotsWithConditions);

  // Filter history to last 24 hours
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentHistory = history.filter(
    (m: any) => !m.createdAt || new Date(m.createdAt).getTime() > cutoff,
  );

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nCurrent surf conditions context:\n${conditionsContext}`,
    },
    // Include recent conversation history
    ...recentHistory.slice(-20).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.75,
    max_completion_tokens: 350,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "Sorry, I couldn't generate a response. Try again.";
}
