import OpenAI from "openai";
import { storage } from "./storage";
import { fetchWeatherData } from "./weather-service";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

function getWindType(lat: number, lon: number, windDir: string): string {
  const dir = windDir?.toUpperCase() ?? '';
  const isEastCoast = lon > -85;
  const isWestCoast = lon < -115;

  if (isWestCoast) {
    if (['E', 'ENE', 'NE', 'ESE', 'SE'].includes(dir)) return 'offshore';
    if (['W', 'WNW', 'NW', 'WSW', 'SW'].includes(dir)) return 'onshore';
    return 'sideshore';
  }
  if (isEastCoast) {
    if (['W', 'WNW', 'NW', 'WSW', 'SW'].includes(dir)) return 'offshore';
    if (['E', 'ENE', 'NE', 'ESE', 'SE'].includes(dir)) return 'onshore';
    return 'sideshore';
  }
  return 'variable';
}

/**
 * Generate a short notification-optimized AI summary.
 * Returns null on any failure so callers can fall back to template content.
 *
 * @param locationId  - DB location ID
 * @param context     - 'daily' | 'swell' | 'wind' | 'tide'
 * @param extra       - optional extra context string (e.g. trigger reason)
 */
export async function generateNotificationSummary(
  locationId: number,
  context: 'daily' | 'swell' | 'wind' | 'tide',
  extra?: string,
): Promise<string | null> {
  try {
    const location = await storage.getLocation(locationId);
    if (!location) return null;

    const weatherData = await fetchWeatherData(
      parseFloat(location.latitude),
      parseFloat(location.longitude),
    );
    if (!weatherData) return null;

    const windType = getWindType(
      parseFloat(location.latitude),
      parseFloat(location.longitude),
      String(weatherData.windDirection ?? ''),
    );

    const waveHeight = parseFloat(String(weatherData.waveHeight ?? 0)).toFixed(1);
    const wavePeriod = weatherData.wavePeriod ?? 8;
    const waveDir = weatherData.waveDirection ?? '';
    const windSpeed = Math.round(parseFloat(String(weatherData.windSpeed ?? 0)));
    const windDir = weatherData.windDirection ?? '';
    const tideStatus = weatherData.tideStatus ?? 'unknown';

    let userPrompt = '';

    if (context === 'daily') {
      userPrompt = `Write a single engaging sentence (max 20 words) for a daily surf notification at ${location.name}. Current conditions: ${waveHeight}ft waves @ ${wavePeriod}s from the ${waveDir}, ${windType} winds at ${windSpeed}mph from ${windDir}, tide is ${tideStatus}. Sound like a local surfer, not a weather report. Be specific and energetic.`;
    } else if (context === 'swell') {
      userPrompt = `Write a single punchy sentence (max 20 words) for a swell alert notification at ${location.name}. The swell threshold was just triggered: ${extra ?? `waves now ${waveHeight}ft @ ${wavePeriod}s`}. Winds are ${windType} at ${windSpeed}mph. Sound excited, like you're texting a friend about good surf.`;
    } else if (context === 'wind') {
      userPrompt = `Write a single punchy sentence (max 20 words) for a wind condition alert at ${location.name}. The wind threshold was just triggered: ${extra ?? `wind is ${windSpeed}mph`}. Waves are ${waveHeight}ft @ ${wavePeriod}s. Be direct and surf-specific.`;
    } else if (context === 'tide') {
      userPrompt = `Write a single punchy sentence (max 20 words) for a tide alert at ${location.name}. ${extra ?? `Tide event approaching`}. Waves are ${waveHeight}ft @ ${wavePeriod}s with ${windType} winds. Be direct about what this means for surf.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a surf forecaster texting a friend. Write one sentence only — no quotes, no emojis, no hashtags, no extra commentary. Just the sentence.',
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 60,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? '';
    return text.length > 5 ? text : null;
  } catch (err) {
    console.error('AI notification summary failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
