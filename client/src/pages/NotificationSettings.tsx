import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Clock, MapPin, ArrowLeft, Smartphone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Location, NotificationSettings as NotificationSettingsType } from "@/types/weather";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { pushNotifications } from "@/lib/push-notifications";

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
  const [selectedTime, setSelectedTime] = useState("08:00");
  const [selectedTimezone, setSelectedTimezone] = useState("America/New_York");
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  // Fetch current notification settings
  const { data: settings, isLoading: settingsLoading } = useQuery<NotificationSettingsType>({
    queryKey: ['/api/notification-settings'],
    retry: false,
  });

  // Fetch user's favorite locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/favorites'],
  });

  // Initialize push notifications on mount
  useEffect(() => {
    const initializePush = async () => {
      const supported = pushNotifications.isSupported();
      setPushSupported(supported);
      
      if (supported) {
        const permission = await pushNotifications.getPermissionStatus();
        setPushPermission(permission);
        
        const initialized = await pushNotifications.initialize();
        if (initialized) {
          const subscribed = await pushNotifications.isSubscribed();
          setPushSubscribed(subscribed);
        }
      }
    };
    
    initializePush();
  }, []);

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setPushEnabled(settings.pushEnabled || false);
      setSelectedTime(settings.notificationTime || "08:00");
      setSelectedTimezone(settings.timezone || "America/New_York");
      setSelectedLocation(settings.locationId || null);
    }
  }, [settings]);

  // Save notification settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: {
      pushEnabled: boolean;
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

  // Test push notification mutation
  const testPushMutation = useMutation({
    mutationFn: async () => {
      const result = await pushNotifications.sendTestNotification();
      if (!result) {
        throw new Error("Failed to send test push notification");
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Test Push Sent!",
        description: "You should see the test notification on this device.",
      });
    },
    onError: (error) => {
      console.error("Test push error:", error);
      toast({
        title: "Test Failed",
        description: "Failed to send test push notification. Make sure notifications are enabled.",
        variant: "destructive",
      });
    },
  });

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!pushSupported) {
        toast({
          title: "Not Supported",
          description: "Push notifications are not supported on this browser/device.",
          variant: "destructive",
        });
        return;
      }

      try {
        const subscriptionData = await pushNotifications.subscribe();
        if (subscriptionData) {
          setPushEnabled(true);
          setPushSubscribed(true);
          setPushPermission("granted");
        } else {
          toast({
            title: "Permission Denied",
            description: "Please allow notifications in your browser to enable push notifications.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Push subscription error:", error);
        toast({
          title: "Subscription Failed",
          description: "Failed to enable push notifications. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      try {
        await pushNotifications.unsubscribe();
        setPushEnabled(false);
        setPushSubscribed(false);
      } catch (error) {
        console.error("Push unsubscription error:", error);
      }
    }
  };

  const handleTestPush = () => {
    if (!pushEnabled || !pushSubscribed || !selectedLocation) {
      toast({
        title: "Complete Settings Required",
        description: "Please enable push notifications, select a location, then save settings before testing.",
        variant: "destructive",
      });
      return;
    }
    
    testPushMutation.mutate();
  };

  const handleSave = () => {
    if (pushEnabled && !selectedLocation) {
      toast({
        title: "Missing Location",
        description: "Location is required for notifications.",
        variant: "destructive",
      });
      return;
    }

    saveSettingsMutation.mutate({
      pushEnabled: pushEnabled && pushSubscribed,
      notificationTime: selectedTime,
      timezone: selectedTimezone,
      locationId: pushEnabled ? selectedLocation || undefined : undefined,
    });
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-[hsl(155,50%,8%)]">
        <Header />
        <div className="container mx-auto px-6 py-8 max-w-2xl">
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
    <div className="min-h-screen bg-[hsl(155,50%,8%)]">
      <Header />
      
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href="/profile">
            <Button
              variant="ghost"
              className="mb-4 text-emerald-400"
              data-testid="back-to-profile-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-emerald-400 mb-2 flex items-center">
            <Bell className="mr-3 h-6 w-6 text-emerald-400" />
            Notification Settings
          </h1>
          <p className="text-slate-300">
            Configure your daily surf condition notifications
          </p>
        </div>

        {/* Push Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-emerald-400">
              <Smartphone className="mr-2 h-5 w-5" />
              Push Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Push Enable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-300 text-base">Enable Browser Push Notifications</Label>
                <p className="text-sm text-slate-400">
                  {pushSupported 
                    ? "Get instant surf condition updates directly in your browser"
                    : "Push notifications are not supported on this browser"
                  }
                </p>
                {pushPermission === "denied" && (
                  <p className="text-xs text-red-400 mt-1">
                    Notifications blocked. Please allow in browser settings.
                  </p>
                )}
              </div>
              <Switch
                checked={pushEnabled}
                onCheckedChange={handlePushToggle}
                disabled={!pushSupported || pushPermission === "denied"}
                data-testid="push-toggle"
              />
            </div>

            {pushEnabled && (
              <div className="space-y-4 pt-4 border-t border-slate-700">
                {/* Push Status */}
                <div className="bg-slate-800 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${pushSubscribed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-sm text-slate-300">
                      {pushSubscribed ? "✅ Push notifications are active" : "⚠️ Push notifications pending setup"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {pushSubscribed 
                      ? "You'll receive push notifications when conditions change"
                      : "Please save settings to activate push notifications"
                    }
                  </p>
                </div>

                {/* Notification Time (shared with SMS) */}
                <div>
                  <Label className="text-slate-300 flex items-center mb-2">
                    <Clock className="mr-2 h-4 w-4 text-emerald-400" />
                    Notification Time
                  </Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
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
                  <p className="text-xs text-slate-400 mt-1">
                    Choose when you want to receive your daily surf conditions
                  </p>
                </div>

                {/* Location */}
                <div>
                  <Label className="text-slate-300 flex items-center mb-2">
                    <MapPin className="mr-2 h-4 w-4 text-emerald-400" />
                    Location for Conditions
                  </Label>
                  <Select value={selectedLocation?.toString()} onValueChange={(value) => setSelectedLocation(parseInt(value))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
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
                </div>

                {/* Timezone Selection */}
                <div>
                  <Label className="text-slate-300 flex items-center mb-2">
                    <Clock className="mr-2 h-4 w-4 text-emerald-400" />
                    Timezone
                  </Label>
                  <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="timezone-select">
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
                  <p className="text-xs text-slate-400 mt-1">
                    Choose your local timezone for accurate notification delivery
                  </p>
                </div>

                {/* Save Settings Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    data-testid="save-settings-button"
                  >
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>

                {/* Push Test Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleTestPush}
                    disabled={testPushMutation.isPending || !pushSubscribed || !selectedLocation}
                    variant="outline"
                    className="w-full border-emerald-600 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                    data-testid="test-push-button"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    {testPushMutation.isPending ? "Sending Test..." : "Send Test Push Notification"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <Footer />
    </div>
  );
}