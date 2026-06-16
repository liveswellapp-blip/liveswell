import twilio from 'twilio';
import { storage } from './storage';
import type { Location } from '@shared/schema';
import { fetchWeatherData } from './weather-service';
import { generateNotificationSummary } from './ai-service';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('Twilio credentials not configured - SMS notifications will be disabled');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

interface SurfConditionsData {
  waveHeight: string;
  wavePeriod: number;
  waveDirection: string;
  windSpeed: string;
  windDirection: string;
  waterTemp: string;
  tideHigh: Array<{ time: string; height: string }>;
  tideLow: Array<{ time: string; height: string }>;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  dataTimestamp: string;
}

export class SMSService {
  static async sendDailyConditions(userId: string, phoneNumber: string, locationId: number): Promise<boolean> {
    if (!client || !twilioPhoneNumber) {
      console.error('Twilio not configured - cannot send SMS');
      return false;
    }

    try {
      // Fetch location details
      const location = await storage.getLocation(locationId);
      if (!location) {
        console.error(`Location ${locationId} not found`);
        return false;
      }

      // Fetch current conditions - use the weather service to get real-time data
      const weatherData = await fetchWeatherData(parseFloat(location.latitude), parseFloat(location.longitude));
      if (!weatherData) {
        console.error(`No conditions found for location ${locationId}`);
        return false;
      }

      // Format conditions for SMS
      const now = new Date();
      const timestamp = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      const conditions = {
        waveHeight: `${weatherData.waveHeight}`,
        wavePeriod: weatherData.wavePeriod || 8,
        waveDirection: weatherData.waveDirection || 'W',
        windSpeed: `${weatherData.windSpeed}`,
        windDirection: weatherData.windDirection || 'W',
        waterTemp: `${Math.round(weatherData.waterTemp)}`,
        tideHigh: weatherData.tideHigh || [
          { time: '5:30 AM', height: '5.4' },
          { time: '6:15 PM', height: '4.8' }
        ],
        tideLow: weatherData.tideLow || [
          { time: '11:45 AM', height: '0.8' },
          { time: '11:30 PM', height: '1.2' }
        ],
        uvIndex: weatherData.uvIndex || 5,
        sunrise: weatherData.sunrise || '6:30 AM',
        sunset: weatherData.sunset || '6:30 PM',
        dataTimestamp: timestamp,
      };

      // Try AI summary (non-blocking — falls back gracefully)
      let aiSentence: string | null = null;
      try {
        aiSentence = await Promise.race([
          generateNotificationSummary(locationId, 'daily'),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
      } catch { /* fall through */ }

      // Format the SMS message
      const message = SMSService.formatConditionsMessage(location, conditions, aiSentence);

      // Send SMS via Twilio
      const result = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`SMS sent successfully: ${result.sid} to ${phoneNumber}`);
      console.log(`Message status: ${result.status}`);
      console.log(`Message direction: ${result.direction}`);
      console.log(`From: ${result.from}, To: ${result.to}`);
      console.log(`Error code: ${result.errorCode || 'none'}`);
      console.log(`Error message: ${result.errorMessage || 'none'}`);
      
      // Check delivery status after a few seconds
      setTimeout(async () => {
        try {
          const message = await client.messages(result.sid).fetch();
          console.log(`📱 Delivery status update for ${result.sid}:`);
          console.log(`Final status: ${message.status}`);
          console.log(`Price: ${message.price} ${message.priceUnit}`);
          if (message.errorCode) {
            console.log(`Delivery error: ${message.errorCode} - ${message.errorMessage}`);
          }
        } catch (error) {
          console.log(`Could not fetch delivery status: ${error}`);
        }
      }, 10000); // Check after 10 seconds
      
      return true;

    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  static formatConditionsMessage(location: Location, conditions: SurfConditionsData, aiSentence?: string | null): string {
    // Convert UV index to description
    const getUVDescription = (uvIndex: number): string => {
      if (uvIndex <= 2) return 'Low';
      if (uvIndex <= 5) return 'Med';
      if (uvIndex <= 7) return 'High';
      return 'Very High';
    };

    // Format high tides
    const highTides = conditions.tideHigh.map(tide => `${tide.time} (${tide.height}ft)`).join(', ');
    
    // Format low tides
    const lowTides = conditions.tideLow.map(tide => `${tide.time} (${tide.height}ft)`).join(', ');

    const aiLine = aiSentence ? `\n${aiSentence}\n` : '';

    return `🌊 ${location.name} Surf Report${aiLine}
Live Conditions (${conditions.dataTimestamp}):
Waves: ${conditions.waveHeight}ft @ ${conditions.wavePeriod}s ${conditions.waveDirection}
Wind: ${conditions.windSpeed}mph ${conditions.windDirection}
Water: ${conditions.waterTemp}°F

Tides & Sun:
High: ${highTides}
Low: ${lowTides}
Sunrise: ${conditions.sunrise} | Sunset: ${conditions.sunset} | UV: ${conditions.uvIndex} (${getUVDescription(conditions.uvIndex)})`;
  }

  static async sendConditionAlert(
    phoneNumber: string,
    locationName: string,
    triggerReason: string,
    locationId: number,
  ): Promise<boolean> {
    if (!client || !twilioPhoneNumber) {
      console.error('Twilio not configured — cannot send condition alert SMS');
      return false;
    }

    try {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const message = `🚨 LiveSwell Alert

${triggerReason} at ${locationName}
Triggered: ${timestamp}

Open the app for full conditions.`;

      const result = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`📱 Condition alert SMS sent: ${result.sid} to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('Error sending condition alert SMS:', error);
      return false;
    }
  }

  static async testSMSConfiguration(): Promise<boolean> {
    if (!client) {
      console.log('Twilio not configured');
      return false;
    }

    try {
      // Test by fetching account info
      const account = await client.api.accounts(accountSid!).fetch();
      console.log(`Twilio account verified: ${account.friendlyName}`);
      return true;
    } catch (error) {
      console.error('Twilio configuration test failed:', error);
      return false;
    }
  }
}