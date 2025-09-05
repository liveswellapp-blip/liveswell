import twilio from 'twilio';
import { storage } from './storage';
import type { Location } from '@shared/schema';

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
  tideHeight: string;
  tideStatus: string;
  uvIndex: number;
  sunrise: string;
  sunset: string;
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
      const { WeatherService } = await import('./weather');
      const weatherData = await WeatherService.getCurrentConditions(location.lat, location.lng);
      if (!weatherData) {
        console.error(`No conditions found for location ${locationId}`);
        return false;
      }

      // Format conditions for SMS
      const conditions = {
        waveHeight: `${weatherData.waveHeight}`,
        wavePeriod: weatherData.wavePeriod || 8,
        waveDirection: weatherData.waveDirection || 'W',
        windSpeed: `${weatherData.windSpeed}`,
        windDirection: weatherData.windDirection || 'W',
        waterTemp: `${Math.round(weatherData.waterTemp)}`,
        tideHeight: `${weatherData.tideHeight?.toFixed(1) || '2.0'}`,
        tideStatus: weatherData.tideStatus || 'rising',
        uvIndex: weatherData.uvIndex || 5,
        sunrise: weatherData.sunrise || '6:30 AM',
        sunset: weatherData.sunset || '6:30 PM',
      };

      // Format the SMS message
      const message = SMSService.formatConditionsMessage(location, conditions);

      // Send SMS via Twilio
      const result = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });

      console.log(`SMS sent successfully: ${result.sid} to ${phoneNumber}`);
      return true;

    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  static formatConditionsMessage(location: Location, conditions: SurfConditionsData): string {
    // Convert UV index to description
    const getUVDescription = (uvIndex: number): string => {
      if (uvIndex <= 2) return 'Low';
      if (uvIndex <= 5) return 'Med';
      if (uvIndex <= 7) return 'High';
      return 'Very High';
    };

    // Generate conditions assessment
    const getConditionsAssessment = (waveHeight: string, windSpeed: string): string => {
      const waveHeightNum = parseFloat(waveHeight);
      const windSpeedNum = parseFloat(windSpeed);
      
      if (waveHeightNum >= 3 && windSpeedNum <= 10) {
        return '🏄‍♂️ Good conditions for surfing!';
      } else if (waveHeightNum >= 2 && windSpeedNum <= 15) {
        return '🌊 Fair conditions - decent surf';
      } else if (waveHeightNum < 2) {
        return '😴 Small waves - better for beginners';
      } else if (windSpeedNum > 15) {
        return '💨 Windy conditions - may be choppy';
      } else {
        return '🌊 Check current conditions';
      }
    };

    const assessment = getConditionsAssessment(conditions.waveHeight, conditions.windSpeed);

    return `🌊 ${location.name} Surf Report

Waves: ${conditions.waveHeight}ft @ ${conditions.wavePeriod}s ${conditions.waveDirection}
Wind: ${conditions.windSpeed}mph ${conditions.windDirection}
Water: ${conditions.waterTemp}°F | Tide: ${conditions.tideHeight}ft ${conditions.tideStatus}
Sunrise: ${conditions.sunrise} | UV: ${conditions.uvIndex} (${getUVDescription(conditions.uvIndex)})

${assessment}`;
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