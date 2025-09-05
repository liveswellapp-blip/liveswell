import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, MessageSquare, Clock, MapPin, Send, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Location, NotificationSettings as NotificationSettingsType } from "@/types/weather";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";

// Generate time options for notification time
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01 ${timeString}`).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

// Common US timezone options
const timezoneOptions = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
];

export default function NotificationSettings() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedTime, setSelectedTime] = useState("08:00");
  const [selectedTimezone, setSelectedTimezone] = useState("America/New_York");
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [smsEnabled, setSmsEnabled] = useState(false);

  // Fetch current notification settings
  const { data: settings, isLoading: settingsLoading } = useQuery<NotificationSettingsType>({
    queryKey: ['/api/notification-settings'],
    retry: false,
  });

  // Fetch user's favorite locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/favorites'],
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setSmsEnabled(settings.smsEnabled);
      setPhoneNumber(settings.phoneNumber || "");
      setSelectedTime(settings.notificationTime || "08:00");
      setSelectedTimezone(settings.timezone || "America/New_York");
      setSelectedLocation(settings.locationId || null);
    }
  }, [settings]);

  // Save notification settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: {
      smsEnabled: boolean;
      phoneNumber?: string;
      notificationTime: string;
      timezone: string;
      locationId?: number;
    }) => {
      return await apiRequest("/api/notification-settings", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });
      toast({
        title: "Settings Saved",
        description: "Your notification settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
      console.error("Save settings error:", error);
    },
  });


  const handleSave = () => {
    if (smsEnabled && (!phoneNumber || !selectedLocation)) {
      toast({
        title: "Missing Information",
        description: "Phone number and location are required for SMS notifications.",
        variant: "destructive",
      });
      return;
    }

    // Format phone number (basic validation)
    let formattedPhone = phoneNumber;
    if (smsEnabled && phoneNumber) {
      // Remove non-digits
      formattedPhone = phoneNumber.replace(/\D/g, '');
      // Add +1 if it's a 10-digit US number
      if (formattedPhone.length === 10) {
        formattedPhone = '+1' + formattedPhone;
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = '+' + formattedPhone;
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }
    }

    saveSettingsMutation.mutate({
      smsEnabled,
      phoneNumber: smsEnabled ? formattedPhone : undefined,
      notificationTime: selectedTime,
      timezone: selectedTimezone,
      locationId: smsEnabled ? selectedLocation || undefined : undefined,
    });
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href="/profile">
            <Button
              variant="outline"
              size="sm"
              className="mb-4 border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white"
              data-testid="back-to-profile-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center">
            <Bell className="mr-3 h-6 w-6 text-emerald-400" />
            Notification Settings
          </h1>
          <p className="text-gray-400">
            Configure your daily surf condition notifications
          </p>
        </div>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-emerald-400" />
              SMS Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SMS Enable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white text-base">Enable Daily SMS</Label>
                <p className="text-sm text-gray-400">
                  Get daily surf condition updates via text message
                </p>
              </div>
              <Switch
                checked={smsEnabled}
                onCheckedChange={setSmsEnabled}
                data-testid="sms-toggle"
              />
            </div>

            {smsEnabled && (
              <div className="space-y-4 pt-4 border-t border-gray-700">
                {/* Phone Number Input */}
                <div>
                  <Label htmlFor="phone" className="text-white">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-2 bg-gray-800 border-gray-600 text-white"
                    data-testid="phone-input"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Enter your phone number with country code (e.g., +1 for US)
                  </p>
                </div>

                {/* Notification Time */}
                <div>
                  <Label className="text-white flex items-center mb-2">
                    <Clock className="mr-2 h-4 w-4 text-emerald-400" />
                    Notification Time
                  </Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="time-select">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timezone Selection */}
                <div>
                  <Label className="text-white flex items-center mb-2">
                    <Clock className="mr-2 h-4 w-4 text-emerald-400" />
                    Timezone
                  </Label>
                  <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="timezone-select">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezoneOptions.map((timezone) => (
                        <SelectItem key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    Choose your local timezone for accurate notification delivery
                  </p>
                </div>

                {/* Location Selection */}
                <div>
                  <Label className="text-white flex items-center mb-2">
                    <MapPin className="mr-2 h-4 w-4 text-emerald-400" />
                    Location for Conditions
                  </Label>
                  <Select value={selectedLocation?.toString()} onValueChange={(value) => setSelectedLocation(parseInt(value))}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="location-select">
                      <SelectValue placeholder="Select your surf spot" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}, {location.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    Choose the surf spot you want to receive conditions for
                  </p>
                </div>

                {/* Preview */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">
                    <strong>SMS Preview:</strong>
                  </p>
                  <div className="bg-gray-700 p-3 rounded text-sm text-white">
                    🌊 <strong>Live Conditions</strong> (2:43 PM)<br/>
                    Waves: 3.2ft @ 14s ENE<br/>
                    Wind: 8mph WNW<br/>
                    Water: 84°F<br/>
                    <br/>
                    🌅 <strong>Tides & Sun</strong><br/>
                    High: 6:45 AM (5.8ft), 7:12 PM (5.4ft)<br/>
                    Low: 1:23 PM (0.9ft)<br/>
                    Sunrise: 7:04 AM | Sunset: 6:31 PM
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 space-y-2">
              <Button
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="save-settings-button"
              >
                {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}