import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Clock, MapPin, ArrowLeft, Smartphone, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Location, NotificationSettings as NotificationSettingsType } from "@/types/weather";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { pushNotifications } from "@/lib/push-notifications";

const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const displayTime = new Date(`2000-01-01 ${timeString}`).toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit", hour12: true,
      });
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

const timezoneOptions = [
  { value: "America/New_York",    label: "Eastern Time (ET)" },
  { value: "America/Chicago",     label: "Central Time (CT)" },
  { value: "America/Denver",      label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage",   label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu",    label: "Hawaii Time (HST)" },
];

const CARD = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };
const SEL  = { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" } as React.CSSProperties;

function FieldLabel({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon size={12} className="text-emerald-400" />
      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
  );
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const [selectedTime, setSelectedTime] = useState("08:00");
  const [selectedTimezone, setSelectedTimezone] = useState("America/New_York");
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  const { data: settings, isLoading: settingsLoading } = useQuery<NotificationSettingsType>({
    queryKey: ["/api/notification-settings"],
    retry: false,
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/favorites"],
  });

  useEffect(() => {
    const init = async () => {
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
    init();
  }, []);

  useEffect(() => {
    if (settings) {
      setPushEnabled(settings.pushEnabled || false);
      setSelectedTime(settings.notificationTime || "08:00");
      setSelectedTimezone(settings.timezone || "America/New_York");
      setSelectedLocation(settings.locationId || null);
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { pushEnabled: boolean; notificationTime: string; timezone: string; locationId?: number }) =>
      await apiRequest("/api/notification-settings", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({ title: "Settings Saved", description: "Notification settings updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  const testPushMutation = useMutation({
    mutationFn: async () => {
      const result = await pushNotifications.sendTestNotification();
      if (!result) throw new Error("Failed to send test");
      return result;
    },
    onSuccess: () => toast({ title: "Test Push Sent!", description: "Check your browser notifications." }),
    onError: () => toast({ title: "Test Failed", description: "Enable notifications and save first.", variant: "destructive" }),
  });

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!pushSupported) {
        toast({ title: "Not Supported", description: "Push notifications aren't supported on this browser.", variant: "destructive" });
        return;
      }
      try {
        const sub = await pushNotifications.subscribe();
        if (sub) {
          setPushEnabled(true); setPushSubscribed(true); setPushPermission("granted");
        } else {
          toast({ title: "Permission Denied", description: "Allow notifications in your browser settings.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Subscription Failed", description: "Please try again.", variant: "destructive" });
      }
    } else {
      try { await pushNotifications.unsubscribe(); } catch {}
      setPushEnabled(false); setPushSubscribed(false);
    }
  };

  const handleSave = () => {
    if (pushEnabled && !selectedLocation) {
      toast({ title: "Missing Location", description: "Select a spot to receive notifications for.", variant: "destructive" });
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
      <div className="min-h-screen flex flex-col" style={{ background: "#030a14" }}>
        <Header />
        <div className="flex-1 px-4 pt-8 max-w-2xl mx-auto w-full space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl h-24 animate-pulse" style={CARD} />
          ))}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "#030a14" }}>
      <Header />

      {/* ── Slim header ── */}
      <div className="px-5 pt-8 pb-6" style={{ background: "linear-gradient(180deg,#041a2e 0%,#030a14 100%)" }}>
        <Link href="/profile">
          <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-[12px] mb-5 transition-colors">
            <ArrowLeft size={14} />
            Back to Profile
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <Bell size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl leading-tight">Notifications</h1>
            <p className="text-slate-500 text-[11px] mt-0.5">Configure your daily surf alerts</p>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 pt-4 max-w-2xl mx-auto w-full space-y-4">

        {/* Push toggle card */}
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-400" style={{ boxShadow: "0 0 6px #fbbf24" }} />
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">Push Notifications</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Smartphone size={14} className="text-slate-400 flex-shrink-0" />
                <p className="text-[13px] font-semibold text-slate-200">Browser Push Notifications</p>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 ml-5">
                {pushSupported
                  ? "Get instant surf condition updates directly in your browser"
                  : "Push notifications are not supported on this browser"}
              </p>
              {pushPermission === "denied" && (
                <p className="text-[11px] text-red-400 mt-1 ml-5">Blocked — allow in browser settings to enable</p>
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
            <div className="mt-4 pt-4 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {/* Status pill */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
                style={{ background: pushSubscribed ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${pushSubscribed ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}` }}>
                {pushSubscribed
                  ? <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                  : <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />}
                <span className="text-[12px] font-medium" style={{ color: pushSubscribed ? "#34d399" : "#fbbf24" }}>
                  {pushSubscribed ? "Push notifications are active" : "Save settings to activate notifications"}
                </span>
              </div>

              {/* Time picker */}
              <div className="mb-3">
                <FieldLabel icon={Clock} label="Notification Time" />
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-600 mt-1">When you want your daily surf report</p>
              </div>

              {/* Location picker */}
              <div className="mb-3">
                <FieldLabel icon={MapPin} label="Location for Conditions" />
                <Select
                  value={selectedLocation?.toString()}
                  onValueChange={v => setSelectedLocation(parseInt(v))}>
                  <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL}>
                    <SelectValue placeholder="Select your surf spot" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map(loc => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}, {loc.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Timezone picker */}
              <div className="mb-4">
                <FieldLabel icon={Clock} label="Timezone" />
                <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                  <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL} data-testid="timezone-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-600 mt-1">For accurate notification delivery times</p>
              </div>

              {/* Test button */}
              <button
                onClick={() => testPushMutation.mutate()}
                disabled={testPushMutation.isPending || !pushSubscribed || !selectedLocation}
                className="w-full h-9 rounded-xl text-[12px] font-semibold transition-opacity disabled:opacity-40"
                style={{ border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", background: "rgba(16,185,129,0.06)" }}
                data-testid="test-push-button">
                <Bell size={12} className="inline mr-1.5" />
                {testPushMutation.isPending ? "Sending…" : "Send Test Notification"}
              </button>
            </div>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          className="w-full h-11 rounded-2xl text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#b45309,#d97706)" }}
          data-testid="save-settings-button">
          {saveSettingsMutation.isPending ? "Saving…" : "Save Settings"}
        </button>

      </main>

      <Footer />
    </div>
  );
}
