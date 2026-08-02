import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Bell, Plus, MapPin, Clock, Trash2, Pencil, Mail, MessageSquare, Smartphone,
  Waves, Wind, Droplets, AlertCircle, History, ChevronLeft, CheckCircle2, ShieldCheck, X,
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Location } from "@/types/weather";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { pushNotifications } from "@/lib/push-notifications";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ───────────────────────────────────────────────────────────────────
type AlertTypeId = "daily_report" | "swell" | "wind" | "tide";

interface AlertTriggerLog {
  id: number;
  alertId: number;
  firedAt: string;
  triggerReason: string;
  conditionSnapshot: any | null;
}

interface RecentActivityEntry extends AlertTriggerLog {
  alertType: string;
  locationName: string;
  locationCity: string;
  alertLabel: string | null;
}

interface UserAlert {
  id: number;
  userId: string;
  locationId: number;
  locationName: string;
  locationCity: string;
  label: string | null;
  alertType: string;
  deliveryChannels: string[];
  frequency: string;
  notificationTime: string;
  notificationTimeTwo: string | null;
  timezone: string;
  phoneNumber: string | null;
  phoneVerified: boolean;
  active: boolean;
  thresholds: any | null;
  lastFiredAt: string | null;
  cooldownHours: number;
  /** True when email was removed via the unsubscribe link (not intentionally disabled). */
  emailUnsubscribed?: boolean;
  /** True when SMS was removed because the user replied STOP to a text. */
  smsOptedOut?: boolean;
  createdAt: string;
}

interface AlertFormState {
  locationId: number | null;
  label: string;
  alertType: AlertTypeId;
  frequency: "once_daily" | "twice_daily";
  notificationTime: string;
  notificationTimeTwo: string;
  timezone: string;
  channels: { push: boolean; sms: boolean; email: boolean };
  phoneNumber: string;
  swellMinHeight: number;
  swellMinPeriod: number;
  windThreshold: number;
  windTriggerWhen: "above" | "below";
  windDirectionFilter: "any" | "onshore" | "offshore" | "sideshore";
  tideType: "high" | "low";
  tideWindowMinutes: number;
  cooldownHours: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const BLANK_FORM: AlertFormState = {
  locationId: null,
  label: "",
  alertType: "daily_report",
  frequency: "once_daily",
  notificationTime: "08:00",
  notificationTimeTwo: "18:00",
  timezone: "America/New_York",
  channels: { push: false, sms: false, email: false },
  phoneNumber: "",
  swellMinHeight: 4,
  swellMinPeriod: 0,
  windThreshold: 15,
  windTriggerWhen: "below",
  windDirectionFilter: "any",
  tideType: "high",
  tideWindowMinutes: 30,
  cooldownHours: 4,
};

const TIMEZONES = [
  { value: "America/New_York",    label: "Eastern (ET)" },
  { value: "America/Chicago",     label: "Central (CT)" },
  { value: "America/Denver",      label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage",   label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu",    label: "Hawaii (HST)" },
];

const ALERT_TYPES: { id: AlertTypeId; label: string; icon: any; color: string; desc: string; detail: string; bullets?: string[] }[] = [
  {
    id: "daily_report",
    label: "Daily Report",
    icon: Bell,
    color: "#f59e0b",
    desc: "Full conditions summary, delivered on schedule",
    detail: "You'll receive a full surf report for your chosen spot at the exact time(s) you set. Each report includes:",
    bullets: [
      "🌊 Live wave height, period & direction from the nearest NOAA buoy",
      "💨 Wind speed, gusts & onshore/offshore classification",
      "🌊 Tide stage with next high & low tide times",
      "🤖 AI-written surf summary in plain language",
      "☀️ Sunrise & sunset times",
    ],
  },
  {
    id: "swell",
    label: "Swell Alert",
    icon: Waves,
    color: "#10b981",
    desc: "Fires when waves hit your target height or period",
    detail: "Sends a one-time alert when buoy data crosses your threshold (e.g. waves above 4 ft with a 12 s period). A cooldown prevents repeat notifications.",
  },
  {
    id: "wind",
    label: "Wind Alert",
    icon: Wind,
    color: "#38bdf8",
    desc: "Fires when wind speed drops into your ideal range",
    detail: "Sends an alert when wind speed falls at or below your limit — useful for catching glassy early-morning windows before onshore winds fill in.",
  },
  {
    id: "tide",
    label: "Tide Alert",
    icon: Droplets,
    color: "#a78bfa",
    desc: "Fires when the tide reaches high or low",
    detail: "Sends an alert as the tide approaches its next high or low — handy for spots that only work at a specific tide stage.",
  },
];

function generateTimeOptions() {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const v = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      const label = new Date(`2000-01-01 ${v}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      times.push({ value: v, label });
    }
  }
  return times;
}
const TIME_OPTIONS = generateTimeOptions();

function formatTime(t: string) {
  return new Date(`2000-01-01 ${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CARD: React.CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };
const SEL: React.CSSProperties  = { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" };
const INPUT_CLS = "w-full h-9 rounded-xl px-3 text-[13px] text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500/40";

// ─── Channel badge ────────────────────────────────────────────────────────────
const BADGE_STYLE = {
  background: "rgba(100,116,139,0.1)",
  border: "1px solid rgba(100,116,139,0.18)",
  color: "#94a3b8",
} as const;

const BADGE_ERROR_STYLE = {
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.22)",
  color: "#f87171",
} as const;

function ChannelBadge({ ch, unverified }: { ch: string; unverified?: boolean }) {
  const map: Record<string, { icon: any; label: string }> = {
    push:  { icon: Smartphone,    label: "Push"  },
    sms:   { icon: MessageSquare, label: "SMS"   },
    email: { icon: Mail,          label: "Email" },
  };
  const cfg = map[ch];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
      style={unverified ? BADGE_ERROR_STYLE : BADGE_STYLE}>
      <Icon size={9} />
      {cfg.label}
      {unverified && <span className="ml-0.5">⚠</span>}
    </span>
  );
}

// ─── Alert type badge ─────────────────────────────────────────────────────────
function AlertTypeBadge({ alertType }: { alertType: string }) {
  const t = ALERT_TYPES.find(a => a.id === alertType) ?? ALERT_TYPES[0];
  const Icon = t.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
      style={BADGE_STYLE}>
      <Icon size={9} />
      {t.label}
    </span>
  );
}

// ─── Threshold summary ────────────────────────────────────────────────────────
function thresholdSummary(alert: UserAlert): string {
  const t = alert.thresholds as any;
  if (!t) return "";
  if (alert.alertType === "swell") {
    const period = t.minPeriod && t.minPeriod > 0 ? ` · ${t.minPeriod}+ sec` : "";
    return `Waves ≥ ${t.minWaveHeight}ft${period}`;
  }
  if (alert.alertType === "wind") {
    const dir = t.directionFilter && t.directionFilter !== "any" ? ` · ${t.directionFilter}` : "";
    return `Wind ${t.triggerWhen} ${t.threshold} mph${dir}`;
  }
  if (alert.alertType === "tide") {
    return `${t.windowMinutes} min before ${t.tideType === "high" ? "High" : "Low"} tide`;
  }
  return "";
}

// ─── Preview sentence ─────────────────────────────────────────────────────────
function previewSentence(form: AlertFormState, locationName: string): string {
  const loc = locationName || "your spot";
  if (form.alertType === "daily_report") {
    const freq = form.frequency === "twice_daily"
      ? `${formatTime(form.notificationTime)} & ${formatTime(form.notificationTimeTwo)}`
      : formatTime(form.notificationTime);
    return `Send me a surf report for ${loc} at ${freq}`;
  }
  if (form.alertType === "swell") {
    const period = form.swellMinPeriod > 0 ? `, with ${form.swellMinPeriod}+ sec period` : "";
    return `Alert me when waves at ${loc} reach ${form.swellMinHeight}ft or higher${period}`;
  }
  if (form.alertType === "wind") {
    const dir = form.windDirectionFilter !== "any" ? `, ${form.windDirectionFilter} wind only` : "";
    return `Alert me when wind at ${loc} is ${form.windTriggerWhen} ${form.windThreshold} mph${dir}`;
  }
  if (form.alertType === "tide") {
    return `Alert me ${form.tideWindowMinutes} min before ${form.tideType === "high" ? "High" : "Low"} tide at ${loc}`;
  }
  return "";
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ value, min, max, step = 1, onChange }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 font-bold hover:bg-white/10 transition-colors"
        style={CARD}>−</button>
      <span className="w-10 text-center text-[14px] font-bold text-white">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 font-bold hover:bg-white/10 transition-colors"
        style={CARD}>+</button>
    </div>
  );
}

// ─── Trigger History Panel ────────────────────────────────────────────────────
function TriggerHistoryPanel({ alertId }: { alertId: number }) {
  const { data: log = [], isLoading } = useQuery<AlertTriggerLog[]>({
    queryKey: ["/api/user-alerts", alertId, "history"],
    queryFn: () => fetch(`/api/user-alerts/${alertId}/history`).then(r => r.json()),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-1.5 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[1, 2].map(i => (
          <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }

  if (log.length === 0) {
    return (
      <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <History size={11} className="text-slate-600" />
        <span className="text-[11px] text-slate-600">No triggers yet</span>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      {log.map(entry => (
        <div key={entry.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg"
          style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.08)" }}>
          <AlertCircle size={10} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-300 leading-snug">{entry.triggerReason}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{relativeTime(entry.firedAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, onToggle, onEdit, onDelete }: {
  alert: UserAlert;
  onToggle: (active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const isCondition = alert.alertType !== "daily_report";
  const scheduleText = isCondition
    ? thresholdSummary(alert)
    : alert.frequency === "twice_daily" && alert.notificationTimeTwo
      ? `${formatTime(alert.notificationTime)} & ${formatTime(alert.notificationTimeTwo)} · Twice daily`
      : `${formatTime(alert.notificationTime)} · Once daily`;

  const needsVerification =
    alert.active &&
    alert.deliveryChannels?.includes("sms") &&
    !!alert.phoneNumber &&
    !alert.phoneVerified;

  const smsAutoRemoved =
    !alert.deliveryChannels?.includes("sms") &&
    !!alert.phoneNumber &&
    !alert.phoneVerified;

  const emailUnsubscribed =
    !!alert.emailUnsubscribed && !alert.deliveryChannels?.includes("email");

  const cardStyle = needsVerification
    ? { background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.3)" }
    : smsAutoRemoved
      ? { background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", opacity: alert.active ? 1 : 0.55 }
      : { ...CARD, opacity: alert.active ? 1 : 0.55 };

  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{
              background: alert.active ? "#10b981" : "#475569",
              boxShadow: alert.active ? "0 0 6px #10b981" : "none"
            }} />
            <span className="text-[14px] font-bold text-white truncate">
              {alert.label || alert.locationName}
            </span>
          </div>
          {alert.label && (
            <div className="flex items-center gap-1 ml-3.5 mb-1">
              <MapPin size={10} className="text-slate-500" />
              <span className="text-[11px] text-slate-500">{alert.locationName}, {alert.locationCity}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-3.5 mb-1.5 flex-wrap">
            <AlertTypeBadge alertType={alert.alertType} />
            {scheduleText && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                style={{ background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.18)", color: "#94a3b8" }}>
                {isCondition ? <Waves size={9} /> : <Clock size={9} />}
                {scheduleText}
              </span>
            )}
            {(alert.deliveryChannels ?? []).map(ch => (
              <ChannelBadge
                key={ch}
                ch={ch}
                unverified={ch === "sms" && !!alert.phoneNumber && !alert.phoneVerified}
              />
            ))}
          </div>
          {isCondition && alert.lastFiredAt && (
            <div className="flex items-center gap-1 ml-3.5 mb-1.5">
              <AlertCircle size={10} className="text-amber-500" />
              <span className="text-[11px] text-amber-400">Triggered {relativeTime(alert.lastFiredAt)}</span>
            </div>
          )}
          {alert.deliveryChannels?.includes("sms") && alert.phoneNumber && !alert.phoneVerified && (
            <div className="flex items-center gap-1.5 ml-3.5 mt-1 px-2 py-1 rounded-lg"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={10} className="text-red-400 shrink-0" />
              <span className="text-[10px] text-red-400">Phone not verified — SMS paused. Edit alert to verify.</span>
            </div>
          )}
          {smsAutoRemoved && (
            <div className="flex items-center gap-1.5 ml-3.5 mt-1 px-2 py-1 rounded-lg"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={10} className="text-red-400 shrink-0" />
              <span className="text-[10px] text-red-400">SMS removed — phone number was never verified. Edit alert to re-add SMS.</span>
            </div>
          )}
          {emailUnsubscribed && (
            <div className="flex items-center gap-1.5 ml-3.5 mt-1 px-2 py-1 rounded-lg"
              style={{ background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.25)" }}>
              <Mail size={10} className="text-slate-400 shrink-0" />
              <span className="text-[10px] text-slate-400">Email paused — unsubscribed. Edit alert to re-enable.</span>
            </div>
          )}
          {!!alert.smsOptedOut && (
            <div className="flex items-center gap-1.5 ml-3.5 mt-1 px-2 py-1 rounded-lg"
              style={{ background: "rgba(20,184,166,0.07)", border: "1px solid rgba(20,184,166,0.22)" }}>
              <MessageSquare size={10} className="text-teal-400 shrink-0" />
              <span className="text-[10px] text-teal-400">SMS paused — you replied STOP. Use the banner above to re-enable.</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Switch checked={alert.active} onCheckedChange={onToggle} />
          <div className="flex items-center gap-1">
            {isCondition && (
              <button onClick={() => setHistoryOpen(o => !o)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                title="Trigger history">
                <History size={12} className={historyOpen ? "text-amber-400" : "text-slate-400"} />
              </button>
            )}
            <button onClick={onEdit} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
              <Pencil size={12} className="text-slate-400" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10">
              <Trash2 size={12} className="text-red-400" />
            </button>
          </div>
        </div>
      </div>
      {isCondition && historyOpen && <TriggerHistoryPanel alertId={alert.id} />}
    </div>
  );
}

// ─── Alert Form Dialog ────────────────────────────────────────────────────────
function AlertFormDialog({ open, onClose, onSaveSuccess, initialData, editId, userEmail, favorites, initialPhoneVerified, initialEmailUnsubscribed, existingAlerts }: {
  open: boolean;
  onClose: () => void;
  onSaveSuccess?: (alertId: number) => void;
  initialData?: Partial<AlertFormState>;
  editId?: number;
  userEmail?: string | null;
  favorites: Location[];
  initialPhoneVerified?: boolean;
  /** True when the alert's email was removed via the unsubscribe link. */
  initialEmailUnsubscribed?: boolean;
  existingAlerts: UserAlert[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<AlertFormState>({ ...BLANK_FORM, ...initialData });

  // Phone verification state
  const [phoneVerifiedLocal, setPhoneVerifiedLocal] = useState(initialPhoneVerified ?? false);
  const [verifyStep, setVerifyStep] = useState<"idle" | "code_sent" | "verified">(
    initialPhoneVerified ? "verified" : "idle"
  );
  const [verifyCode, setVerifyCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isConfirmingCode, setIsConfirmingCode] = useState(false);
  const prevPhone = useRef(initialData?.phoneNumber ?? "");

  const handlePhoneChange = (val: string) => {
    patch("phoneNumber", val);
    if (val !== prevPhone.current) {
      prevPhone.current = val;
      setPhoneVerifiedLocal(false);
      setVerifyStep("idle");
      setVerifyCode("");
    }
  };

  const handlePhoneBlur = () => {
    const normalized = normalizePhoneNumber(form.phoneNumber);
    if (normalized !== form.phoneNumber) {
      patch("phoneNumber", normalized);
      if (normalized !== prevPhone.current) {
        prevPhone.current = normalized;
        setPhoneVerifiedLocal(false);
        setVerifyStep("idle");
        setVerifyCode("");
      }
    }
  };

  /** Convert common US phone formats to E.164 before sending to the server. */
  const normalizePhoneNumber = (raw: string): string => {
    const s = raw.trim();
    if (s.startsWith("+")) return s; // already E.164 or international — pass through
    const digits = s.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return s; // unknown format — let the server validate
  };

  const handleSendCode = async () => {
    const raw = form.phoneNumber.trim();
    if (!raw) {
      toast({ title: "Enter a phone number first", variant: "destructive" });
      return;
    }
    const phone = normalizePhoneNumber(raw);
    setIsSendingCode(true);
    try {
      await apiRequest("/api/alerts/verify-phone/send", { method: "POST", body: { phoneNumber: phone } });
      setVerifyStep("code_sent");
      toast({ title: "Code sent", description: "Check your phone for a 6-digit code." });
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.startsWith("429:")) {
        try {
          const body = JSON.parse(msg.slice(4).trim());
          const waitMinutes = body.waitSeconds ? Math.ceil(body.waitSeconds / 60) : 10;
          toast({
            title: "Too many attempts",
            description: `Please wait ${waitMinutes} minute${waitMinutes !== 1 ? "s" : ""} before requesting another code.`,
            variant: "destructive",
          });
        } catch {
          toast({ title: "Too many attempts", description: "Please wait a few minutes before requesting another code.", variant: "destructive" });
        }
      } else if (msg.includes("503") || msg.toLowerCase().includes("unavailable")) {
        toast({ title: "SMS service unavailable", description: "Our SMS provider is temporarily down. Please try again in a few minutes.", variant: "destructive" });
      } else {
        toast({ title: "Couldn't send code", description: "Check that your phone number is correct and try again.", variant: "destructive" });
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!verifyCode.trim()) return;
    setIsConfirmingCode(true);
    try {
      await apiRequest("/api/alerts/verify-phone/confirm", {
        method: "POST",
        body: { phoneNumber: normalizePhoneNumber(form.phoneNumber.trim()), code: verifyCode.trim() },
      });
      setPhoneVerifiedLocal(true);
      setVerifyStep("verified");
      toast({ title: "Phone verified!", description: "SMS alerts are ready to go." });
    } catch {
      toast({ title: "Incorrect code", description: "Try again or resend.", variant: "destructive" });
    } finally {
      setIsConfirmingCode(false);
    }
  };

  const patch = (k: keyof AlertFormState, v: any) => setForm(f => ({ ...f, [k]: v }));
  const patchCh = (ch: keyof typeof BLANK_FORM.channels, v: boolean) =>
    setForm(f => ({ ...f, channels: { ...f.channels, [ch]: v } }));

  const selectedLocation = favorites.find(l => l.id === form.locationId);

  // Detect if the selected spot already has a condition alert (excluding the alert being edited)
  const conditionConflict = form.alertType !== "daily_report" && form.locationId != null
    ? existingAlerts.find(
        a => a.locationId === form.locationId && a.alertType !== "daily_report" && a.id !== editId
      ) ?? null
    : null;

  const handlePushToggle = async (val: boolean) => {
    if (val) {
      if (!pushNotifications.isSupported()) {
        toast({ title: "Not supported", description: "Push isn't available on this browser.", variant: "destructive" });
        return;
      }
      const sub = await pushNotifications.subscribe();
      if (!sub) {
        toast({ title: "Permission denied", description: "Allow notifications in browser settings.", variant: "destructive" });
        return;
      }
    }
    patchCh("push", val);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/user-alerts", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] });
      toast({ title: "Alert created", description: "Your alert is now active." });
      onClose();
    },
    onError: (err: any) => {
      if (String(err?.message ?? "").startsWith("409")) {
        toast({ title: "Spot already has a condition alert", description: "Edit your existing condition alert for this spot instead.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to create alert.", variant: "destructive" });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/user-alerts/${editId}`, { method: "PUT", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] });
      toast({ title: "Alert updated" });
      if (editId != null) onSaveSuccess?.(editId);
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to update alert.", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!form.locationId) {
      toast({ title: "Pick a spot", description: "Select a surf spot for this alert.", variant: "destructive" });
      return;
    }
    if (conditionConflict) {
      toast({ title: "Spot already has a condition alert", description: "Edit your existing condition alert for this spot instead.", variant: "destructive" });
      return;
    }
    const channels = Object.entries(form.channels).filter(([, v]) => v).map(([k]) => k);
    if (channels.length === 0) {
      toast({ title: "Choose delivery", description: "Enable at least one delivery channel.", variant: "destructive" });
      return;
    }
    if (channels.includes("sms") && !form.phoneNumber.trim()) {
      toast({ title: "Phone required", description: "Enter your phone number for SMS alerts.", variant: "destructive" });
      return;
    }
    if (channels.includes("sms") && form.phoneNumber.trim() && !phoneVerifiedLocal) {
      toast({ title: "Verify your number", description: "Tap the Verify button to confirm your phone before saving.", variant: "destructive" });
      return;
    }

    const thresholds =
      form.alertType === "swell"
        ? { minWaveHeight: form.swellMinHeight, ...(form.swellMinPeriod > 0 ? { minPeriod: form.swellMinPeriod } : {}) }
        : form.alertType === "wind"
          ? { threshold: form.windThreshold, triggerWhen: form.windTriggerWhen, directionFilter: form.windDirectionFilter }
          : form.alertType === "tide"
            ? { tideType: form.tideType, windowMinutes: form.tideWindowMinutes }
            : null;

    const payload = {
      locationId: form.locationId,
      label: form.label.trim() || null,
      alertType: form.alertType,
      frequency: form.alertType === "daily_report" ? form.frequency : "once_daily",
      notificationTime: form.alertType === "daily_report" ? form.notificationTime : "00:00",
      notificationTimeTwo: form.alertType === "daily_report" && form.frequency === "twice_daily" ? form.notificationTimeTwo : null,
      timezone: form.alertType === "daily_report" ? form.timezone : "UTC",
      deliveryChannels: channels,
      phoneNumber: channels.includes("sms") ? form.phoneNumber.trim() : null,
      active: true,
      thresholds,
      cooldownHours: form.alertType !== "daily_report" ? form.cooldownHours : 4,
    };

    editId ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const preview = previewSentence(form, selectedLocation?.name ?? "");
  const isMobile = useIsMobile();

  const formBody = (
        <div className="space-y-4 pt-1">
          {/* Alert type selector */}
          <div>
            <label className="text-[11px] text-slate-400 mb-2 block">Alert type</label>
            <div className="grid grid-cols-2 gap-2">
              {ALERT_TYPES.map(t => {
                const Icon = t.icon;
                const active = form.alertType === t.id;
                return (
                  <button key={t.id} onClick={() => patch("alertType", t.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: active ? `${t.color}15` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? `${t.color}40` : "rgba(255,255,255,0.06)"}`,
                    }}>
                    <Icon size={14} style={{ color: active ? t.color : "#64748b" }} />
                    <div>
                      <div className="text-[12px] font-semibold" style={{ color: active ? t.color : "#94a3b8" }}>{t.label}</div>
                      <div className="text-[10px] text-slate-500">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detail callout for selected type */}
            {(() => {
              const selected = ALERT_TYPES.find(t => t.id === form.alertType);
              if (!selected) return null;
              return (
                <div className="mt-2 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed"
                  style={{ background: `${selected.color}0d`, border: `1px solid ${selected.color}25` }}>
                  <p className="text-slate-300">{selected.detail}</p>
                  {selected.bullets && (
                    <ul className="mt-2 space-y-1">
                      {selected.bullets.map((b, i) => (
                        <li key={i} className="text-slate-400">{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Location */}
          <div>
            <label className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1.5">
              <MapPin size={11} className="text-emerald-400" /> Surf spot
            </label>
            <Select value={form.locationId?.toString()} onValueChange={v => patch("locationId", parseInt(v))}>
              <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL}>
                <SelectValue placeholder="Choose a saved spot…" />
              </SelectTrigger>
              <SelectContent>
                {favorites.map(loc => (
                  <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}, {loc.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {favorites.length === 0 && (
              <p className="text-[10px] text-amber-400 mt-1">Save some spots as favorites first.</p>
            )}
            {conditionConflict && (
              <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-400 leading-snug">
                  This spot already has a condition alert ({ALERT_TYPES.find(t => t.id === conditionConflict.alertType)?.label ?? conditionConflict.alertType}).
                  Edit that alert to update its settings, or delete it first to create a new one.
                </p>
              </div>
            )}
          </div>

          {/* Label */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 block">Label (optional)</label>
            <input className={INPUT_CLS} style={SEL}
              placeholder="e.g. Dawn patrol check"
              value={form.label}
              onChange={e => patch("label", e.target.value)}
            />
          </div>

          {/* ── Daily report schedule ── */}
          {form.alertType === "daily_report" && (
            <>
              <div>
                <label className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <Clock size={11} className="text-emerald-400" /> Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["once_daily", "twice_daily"] as const).map(f => (
                    <button key={f} onClick={() => patch("frequency", f)}
                      className="h-9 rounded-xl text-[12px] font-semibold transition-all"
                      style={{
                        background: form.frequency === f ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.frequency === f ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: form.frequency === f ? "#34d399" : "#94a3b8",
                      }}>
                      {f === "once_daily" ? "Once daily" : "Twice daily"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1.5 block">
                    {form.frequency === "twice_daily" ? "First time" : "Time"}
                  </label>
                  <Select value={form.notificationTime} onValueChange={v => patch("notificationTime", v)}>
                    <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL}><SelectValue /></SelectTrigger>
                    <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.frequency === "twice_daily" && (
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1.5 block">Second time</label>
                    <Select value={form.notificationTimeTwo} onValueChange={v => patch("notificationTimeTwo", v)}>
                      <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL}><SelectValue /></SelectTrigger>
                      <SelectContent>{TIME_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Timezone</label>
                <Select value={form.timezone} onValueChange={v => patch("timezone", v)}>
                  <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL}><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* ── Swell thresholds ── */}
          {form.alertType === "swell" && (
            <div className="space-y-4 p-3 rounded-xl" style={CARD}>
              <div>
                <label className="text-[11px] text-slate-400 mb-2 block">Min wave height (ft)</label>
                <div className="flex items-center gap-3">
                  <Stepper value={form.swellMinHeight} min={1} max={20} onChange={v => patch("swellMinHeight", v)} />
                  <span className="text-[13px] text-emerald-400 font-bold">{form.swellMinHeight}ft+</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-2 block">
                  Min wave period (sec) <span className="text-slate-600">— 0 to skip</span>
                </label>
                <div className="flex items-center gap-3">
                  <Stepper value={form.swellMinPeriod} min={0} max={25} onChange={v => patch("swellMinPeriod", v)} />
                  <span className="text-[13px] font-bold" style={{ color: form.swellMinPeriod > 0 ? "#10b981" : "#475569" }}>
                    {form.swellMinPeriod > 0 ? `${form.swellMinPeriod}s+` : "off"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Wind thresholds ── */}
          {form.alertType === "wind" && (
            <div className="space-y-4 p-3 rounded-xl" style={CARD}>
              <div>
                <label className="text-[11px] text-slate-400 mb-2 block">Wind speed threshold (mph)</label>
                <div className="flex items-center gap-3">
                  <Stepper value={form.windThreshold} min={1} max={60} step={5} onChange={v => patch("windThreshold", v)} />
                  <span className="text-[13px] text-sky-400 font-bold">{form.windThreshold} mph</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-2 block">Trigger when wind is</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["below", "above"] as const).map(w => (
                    <button key={w} onClick={() => patch("windTriggerWhen", w)}
                      className="h-9 rounded-xl text-[12px] font-semibold transition-all"
                      style={{
                        background: form.windTriggerWhen === w ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.windTriggerWhen === w ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: form.windTriggerWhen === w ? "#38bdf8" : "#94a3b8",
                      }}>
                      {w === "below" ? `≤ ${form.windThreshold} mph` : `≥ ${form.windThreshold} mph`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-2 block">Direction filter</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["any", "onshore", "offshore", "sideshore"] as const).map(d => (
                    <button key={d} onClick={() => patch("windDirectionFilter", d)}
                      className="h-8 rounded-xl text-[11px] font-semibold capitalize transition-all"
                      style={{
                        background: form.windDirectionFilter === d ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.windDirectionFilter === d ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.06)"}`,
                        color: form.windDirectionFilter === d ? "#38bdf8" : "#64748b",
                      }}>
                      {d === "any" ? "Any direction" : d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tide thresholds ── */}
          {form.alertType === "tide" && (
            <div className="space-y-4 p-3 rounded-xl" style={CARD}>
              <div>
                <label className="text-[11px] text-slate-400 mb-2 block">Tide type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["high", "low"] as const).map(t => (
                    <button key={t} onClick={() => patch("tideType", t)}
                      className="h-9 rounded-xl text-[12px] font-semibold transition-all"
                      style={{
                        background: form.tideType === t ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.tideType === t ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: form.tideType === t ? "#a78bfa" : "#94a3b8",
                      }}>
                      {t === "high" ? "🌊 High tide" : "⬇️ Low tide"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-2 block">Notify how many minutes before?</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 30, 60, 120].map(m => (
                    <button key={m} onClick={() => patch("tideWindowMinutes", m)}
                      className="h-9 rounded-xl text-[11px] font-semibold transition-all"
                      style={{
                        background: form.tideWindowMinutes === m ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.tideWindowMinutes === m ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: form.tideWindowMinutes === m ? "#a78bfa" : "#94a3b8",
                      }}>
                      {m < 60 ? `${m}m` : `${m / 60}h`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cooldown (condition alerts only) */}
          {form.alertType !== "daily_report" && (
            <div>
              <label className="text-[11px] text-slate-400 mb-2 block">Cooldown between triggers (hours)</label>
              <div className="flex items-center gap-3">
                <Stepper value={form.cooldownHours} min={1} max={24} onChange={v => patch("cooldownHours", v)} />
                <span className="text-[12px] text-slate-400">{form.cooldownHours}h between alerts</span>
              </div>
            </div>
          )}

          {/* Delivery channels */}
          <div>
            <label className="text-[11px] text-slate-400 mb-2 block">Deliver via</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={CARD}>
                <div className="flex items-center gap-2">
                  <Smartphone size={13} className="text-violet-400" />
                  <span className="text-[13px] text-slate-200">Push notification</span>
                </div>
                <Switch checked={form.channels.push} onCheckedChange={handlePushToggle} />
              </div>
              <div className="rounded-xl overflow-hidden" style={CARD}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={13} className="text-emerald-400" />
                    <span className="text-[13px] text-slate-200">SMS text message</span>
                  </div>
                  <Switch checked={form.channels.sms} onCheckedChange={v => patchCh("sms", v)} />
                </div>
                {form.channels.sms && (
                  <div className="px-3 pb-3 pt-0.5 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    {/* Phone number + Verify / Verified row */}
                    {verifyStep === "verified" ? (
                      /* Verified state: locked display + Change link */
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 flex items-center gap-2 px-3 h-9 rounded-xl text-[13px] text-emerald-300"
                          style={{ ...SEL, opacity: 0.7 }}>
                          <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                          <span className="truncate">{form.phoneNumber}</span>
                        </div>
                        <button
                          onClick={() => {
                            setVerifyStep("idle");
                            setPhoneVerifiedLocal(false);
                            setVerifyCode("");
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition-opacity hover:opacity-80"
                          style={{ background: "rgba(100,116,139,0.15)", border: "1px solid rgba(100,116,139,0.3)", color: "#94a3b8" }}>
                          Change
                        </button>
                      </div>
                    ) : (
                      /* Unverified / editing state: editable input + Verify button */
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          className={INPUT_CLS}
                          style={{ ...SEL, flex: 1 }}
                          placeholder="+15551234567"
                          value={form.phoneNumber}
                          onChange={e => handlePhoneChange(e.target.value)}
                          onBlur={handlePhoneBlur}
                          type="tel"
                        />
                        <button
                          onClick={handleSendCode}
                          disabled={isSendingCode || !form.phoneNumber.trim()}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition-opacity hover:opacity-80 disabled:opacity-40"
                          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#34d399" }}>
                          {isSendingCode ? "Sending…" : verifyStep === "code_sent" ? "Resend" : "Verify"}
                        </button>
                      </div>
                    )}

                    {/* Code entry (shown after code is sent) */}
                    {verifyStep === "code_sent" && (
                      <div className="rounded-xl p-2.5 space-y-2"
                        style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                        <p className="text-[11px] text-slate-400">Enter the 6-digit code sent to your phone:</p>
                        <div className="flex items-center gap-2">
                          <input
                            className={INPUT_CLS}
                            style={{ ...SEL, flex: 1, letterSpacing: "0.2em", fontSize: "16px", textAlign: "center" }}
                            placeholder="123456"
                            value={verifyCode}
                            onChange={e => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                            inputMode="numeric"
                          />
                          <button
                            onClick={handleConfirmCode}
                            disabled={isConfirmingCode || verifyCode.length < 6}
                            className="px-3 py-2 rounded-xl text-[12px] font-bold shrink-0 transition-opacity hover:opacity-80 disabled:opacity-40 text-white"
                            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
                            {isConfirmingCode ? "…" : "Confirm"}
                          </button>
                        </div>
                      </div>
                    )}

                    {verifyStep === "verified" && (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
                        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                        <CheckCircle2 size={11} className="text-emerald-400" />
                        <span className="text-[11px] text-emerald-400">Verified. SMS alerts will fire to this number.</span>
                      </div>
                    )}

                    {verifyStep === "idle" && form.phoneNumber.trim() && (
                      <p className="text-[10px] text-slate-500">Use E.164 format, e.g. +15551234567. Tap Verify to confirm your number.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-xl overflow-hidden" style={CARD}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className={form.channels.email ? "text-sky-400" : initialEmailUnsubscribed ? "text-slate-500" : "text-sky-400"} />
                    <div>
                      <span className="text-[13px] text-slate-200">Email</span>
                      {!form.channels.email && initialEmailUnsubscribed && (
                        <span className="ml-2 text-[10px] text-slate-500 font-medium">paused — unsubscribed</span>
                      )}
                    </div>
                  </div>
                  <Switch checked={form.channels.email} onCheckedChange={v => patchCh("email", v)} />
                </div>
                {!form.channels.email && initialEmailUnsubscribed && (
                  <div className="px-3 pb-2.5 pt-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[11px] text-slate-500 mt-1">
                      You unsubscribed from email alerts for this alert. Toggle the switch above to re-enable.
                    </p>
                  </div>
                )}
                {form.channels.email && userEmail && (
                  <div className="px-3 pb-2.5 pt-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[11px] text-slate-400 mt-1">Sending to <span className="text-sky-400">{userEmail}</span></p>
                  </div>
                )}
                {form.channels.email && !userEmail && (
                  <div className="px-3 pb-2.5 pt-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[11px] text-amber-400 mt-1">No email on your account. Add one in Profile.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plain-English preview */}
          {preview && form.locationId && (
            <div className="px-3 py-2.5 rounded-xl" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p className="text-[11px] text-emerald-400 font-medium">"{preview}"</p>
            </div>
          )}

          {/* Save button */}
          <button onClick={handleSave} disabled={isPending}
            className="w-full h-11 rounded-2xl text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
            {isPending ? "Saving…" : editId ? "Save Changes" : "Create Alert"}
          </button>
        </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => { if (!v) onClose(); }} shouldScaleBackground={false}>
        <DrawerContent
          className="outline-none"
          style={{
            background: "#0d1b2e",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e2e8f0",
            maxHeight: "92dvh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DrawerHeader className="px-4 pt-3 pb-0 shrink-0">
            <DrawerTitle className="text-white text-base font-bold text-left">
              {editId ? "Edit Alert" : "Add Alert"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-8 pt-2 flex-1">
            {formBody}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background: "#0d1b2e", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }}>
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold">
            {editId ? "Edit Alert" : "Add Alert"}
          </DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}

const LS_KEY = "liveswell_dismissed_verification_ids";
const LS_KEY_SMS_REMOVED = "liveswell_dismissed_sms_removed_ids";
const LS_KEY_EMAIL_UNSUB = "liveswell_dismissed_email_unsub_ids";
const LS_KEY_SMS_OPT_OUT = "liveswell_dismissed_sms_opt_out";

function loadDismissedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<number>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {}
}

function loadDismissedSmsRemovedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_KEY_SMS_REMOVED);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveDismissedSmsRemovedIds(ids: Set<number>) {
  try {
    localStorage.setItem(LS_KEY_SMS_REMOVED, JSON.stringify([...ids]));
  } catch {}
}

function loadDismissedEmailUnsubIds(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_KEY_EMAIL_UNSUB);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveDismissedEmailUnsubIds(ids: Set<number>) {
  try {
    localStorage.setItem(LS_KEY_EMAIL_UNSUB, JSON.stringify([...ids]));
  } catch {}
}

function loadDismissedSmsOptOutBanner(): boolean {
  try {
    return localStorage.getItem(LS_KEY_SMS_OPT_OUT) === "true";
  } catch {
    return false;
  }
}

function saveDismissedSmsOptOutBanner(dismissed: boolean) {
  try {
    localStorage.setItem(LS_KEY_SMS_OPT_OUT, dismissed ? "true" : "false");
  } catch {}
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotificationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAlert, setEditAlert] = useState<UserAlert | null>(null);
  const [dismissedVerificationIds, setDismissedVerificationIds] = useState<Set<number>>(loadDismissedIds);
  const [dismissedSmsRemovedIds, setDismissedSmsRemovedIds] = useState<Set<number>>(loadDismissedSmsRemovedIds);
  const [dismissedEmailUnsubIds, setDismissedEmailUnsubIds] = useState<Set<number>>(loadDismissedEmailUnsubIds);
  const [dismissedSmsOptOutBanner, setDismissedSmsOptOutBanner] = useState<boolean>(loadDismissedSmsOptOutBanner);

  const { data: alerts = [], isLoading } = useQuery<UserAlert[]>({
    queryKey: ["/api/user-alerts"],
    retry: false,
  });

  const { data: favorites = [] } = useQuery<Location[]>({
    queryKey: ["/api/favorites"],
  });

  const { data: recentActivity = [], isLoading: activityLoading } = useQuery<RecentActivityEntry[]>({
    queryKey: ["/api/user-alerts/recent-activity"],
    queryFn: () => fetch("/api/user-alerts/recent-activity").then(r => r.json()),
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest(`/api/user-alerts/${id}/toggle`, { method: "PATCH", body: { active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] }),
    onError: () => toast({ title: "Error", description: "Failed to update alert.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/user-alerts/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] });
      const nextVerif = new Set(dismissedVerificationIds);
      if (nextVerif.delete(id)) {
        setDismissedVerificationIds(nextVerif);
        saveDismissedIds(nextVerif);
      }
      const nextSms = new Set(dismissedSmsRemovedIds);
      if (nextSms.delete(id)) {
        setDismissedSmsRemovedIds(nextSms);
        saveDismissedSmsRemovedIds(nextSms);
      }
      toast({ title: "Alert deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete alert.", variant: "destructive" }),
  });

  const openCreate = () => { setEditAlert(null); setDialogOpen(true); };
  const openEdit = (a: UserAlert) => { setEditAlert(a); setDialogOpen(true); };

  const userEmail = (user as any)?.email ?? null;

  const editInitial: Partial<AlertFormState> | undefined = editAlert ? {
    locationId: editAlert.locationId,
    label: editAlert.label ?? "",
    alertType: (editAlert.alertType ?? "daily_report") as AlertTypeId,
    frequency: editAlert.frequency as "once_daily" | "twice_daily",
    notificationTime: editAlert.notificationTime,
    notificationTimeTwo: editAlert.notificationTimeTwo ?? "18:00",
    timezone: editAlert.timezone,
    channels: {
      push:  editAlert.deliveryChannels?.includes("push")  ?? false,
      sms:   editAlert.deliveryChannels?.includes("sms")   ?? false,
      email: editAlert.deliveryChannels?.includes("email") ?? false,
    },
    phoneNumber: editAlert.phoneNumber ?? "",
    swellMinHeight: (editAlert.thresholds as any)?.minWaveHeight ?? 4,
    swellMinPeriod: (editAlert.thresholds as any)?.minPeriod ?? 0,
    windThreshold: (editAlert.thresholds as any)?.threshold ?? 15,
    windTriggerWhen: (editAlert.thresholds as any)?.triggerWhen ?? "below",
    windDirectionFilter: (editAlert.thresholds as any)?.directionFilter ?? "any",
    tideType: (editAlert.thresholds as any)?.tideType ?? "high",
    tideWindowMinutes: (editAlert.thresholds as any)?.windowMinutes ?? 30,
    cooldownHours: editAlert.cooldownHours ?? 4,
  } : undefined;

  const reenableSmsMutation = useMutation({
    mutationFn: () => apiRequest("/api/user-alerts/reenable-sms", { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] });
      setDismissedSmsOptOutBanner(false);
      saveDismissedSmsOptOutBanner(false);
      toast({
        title: "SMS re-enabled",
        description: data?.message ?? "SMS alerts have been restored.",
      });
    },
    onError: () => toast({ title: "Error", description: "Failed to re-enable SMS alerts.", variant: "destructive" }),
  });

  const conditionAlerts = alerts.filter(a => a.alertType !== "daily_report");
  const dailyAlerts = alerts.filter(a => a.alertType === "daily_report");
  const unverifiedActiveAlerts = alerts.filter(
    a => a.active && a.deliveryChannels?.includes("sms") && !!a.phoneNumber && !a.phoneVerified
  );
  const smsRemovedAlerts = alerts.filter(
    a => !a.deliveryChannels?.includes("sms") && !!a.phoneNumber && !a.phoneVerified
  );

  const smsOptedOutAlerts = alerts.filter(a => !!a.smsOptedOut);

  const showSmsOptOutBanner =
    smsOptedOutAlerts.length > 0 && !dismissedSmsOptOutBanner;

  const handleDismissSmsOptOutBanner = () => {
    setDismissedSmsOptOutBanner(true);
    saveDismissedSmsOptOutBanner(true);
  };

  const emailUnsubscribedAlerts = alerts.filter(
    a => !!a.emailUnsubscribed && !a.deliveryChannels?.includes("email")
  );

  const showEmailUnsubscribedBanner =
    emailUnsubscribedAlerts.length > 0 &&
    emailUnsubscribedAlerts.some(a => !dismissedEmailUnsubIds.has(a.id));

  const handleDismissEmailUnsubBanner = () => {
    const next = new Set(dismissedEmailUnsubIds);
    emailUnsubscribedAlerts.forEach(a => next.add(a.id));
    setDismissedEmailUnsubIds(next);
    saveDismissedEmailUnsubIds(next);
  };

  const showVerificationBanner =
    unverifiedActiveAlerts.length > 0 &&
    unverifiedActiveAlerts.some(a => !dismissedVerificationIds.has(a.id));

  const handleDismissVerificationBanner = () => {
    const next = new Set(dismissedVerificationIds);
    unverifiedActiveAlerts.forEach(a => next.add(a.id));
    setDismissedVerificationIds(next);
    saveDismissedIds(next);
  };

  const showSmsRemovedBanner =
    smsRemovedAlerts.length > 0 &&
    smsRemovedAlerts.some(a => !dismissedSmsRemovedIds.has(a.id));

  const handleDismissSmsRemovedBanner = () => {
    const next = new Set(dismissedSmsRemovedIds);
    smsRemovedAlerts.forEach(a => next.add(a.id));
    setDismissedSmsRemovedIds(next);
    saveDismissedSmsRemovedIds(next);
  };

  const handleAlertSaveSuccess = (alertId: number) => {
    const nextVerif = new Set(dismissedVerificationIds);
    nextVerif.delete(alertId);
    setDismissedVerificationIds(nextVerif);
    saveDismissedIds(nextVerif);

    const nextSms = new Set(dismissedSmsRemovedIds);
    nextSms.delete(alertId);
    setDismissedSmsRemovedIds(nextSms);
    saveDismissedSmsRemovedIds(nextSms);

    const nextEmailUnsub = new Set(dismissedEmailUnsubIds);
    nextEmailUnsub.delete(alertId);
    setDismissedEmailUnsubIds(nextEmailUnsub);
    saveDismissedEmailUnsubIds(nextEmailUnsub);
  };

  return (
    <div className="min-h-screen flex flex-col pb-6" style={{ background: "#030a14" }}>
      <Header />

      <div className="px-5 pt-6 pb-4" style={{ background: "linear-gradient(180deg,#041a2e 0%,#030a14 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-[12px] mb-4 transition-colors"
          >
            <ChevronLeft size={14} />
            Profile
          </button>
          <div className="mb-4">
            <h1 className="text-white font-black text-xl leading-tight">Alerts</h1>
            <p className="text-slate-500 text-[12px]">Scheduled reports & condition triggers</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[13px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
            <Plus size={14} />
            Add Alert
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 max-w-2xl mx-auto w-full space-y-6">
        {showSmsOptOutBanner && (
          <div className="rounded-2xl p-4 flex items-start gap-3 mt-4"
            style={{ background: "rgba(20,184,166,0.07)", border: "1px solid rgba(20,184,166,0.28)" }}>
            <MessageSquare size={16} className="text-teal-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-teal-300">
                {smsOptedOutAlerts.length === 1
                  ? "SMS paused on 1 alert — you replied STOP"
                  : `SMS paused on ${smsOptedOutAlerts.length} alerts — you replied STOP`}
              </p>
              <p className="text-[12px] text-teal-500/80 mt-0.5">
                Your alerts are still active but won't send texts. Tap below to restore SMS delivery.
              </p>
              <button
                onClick={() => reenableSmsMutation.mutate()}
                disabled={reenableSmsMutation.isPending}
                className="mt-2 text-[12px] font-semibold text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2 disabled:opacity-50"
              >
                {reenableSmsMutation.isPending ? "Restoring…" : "Re-enable SMS →"}
              </button>
            </div>
            <button
              onClick={handleDismissSmsOptOutBanner}
              className="shrink-0 p-1 rounded-lg text-teal-500 hover:text-teal-300 hover:bg-teal-400/10 transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {showEmailUnsubscribedBanner && (
          <div className="rounded-2xl p-4 flex items-start gap-3 mt-4"
            style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.25)" }}>
            <Mail size={16} className="text-sky-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-sky-300">
                {emailUnsubscribedAlerts.length === 1
                  ? "Email paused on 1 alert — you unsubscribed"
                  : `Email paused on ${emailUnsubscribedAlerts.length} alerts — you unsubscribed`}
              </p>
              <p className="text-[12px] text-sky-500/80 mt-0.5">
                If this was accidental, edit the alert and re-enable the Email toggle.
              </p>
              {emailUnsubscribedAlerts.length === 1 && (
                <button
                  onClick={() => openEdit(emailUnsubscribedAlerts[0])}
                  className="mt-2 text-[12px] font-semibold text-sky-400 hover:text-sky-300 transition-colors underline underline-offset-2"
                >
                  Re-enable email →
                </button>
              )}
            </div>
            <button
              onClick={handleDismissEmailUnsubBanner}
              className="shrink-0 p-1 rounded-lg text-sky-500 hover:text-sky-300 hover:bg-sky-400/10 transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {showSmsRemovedBanner && (
          <div className="rounded-2xl p-4 flex items-start gap-3 mt-4"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-red-300">
                {smsRemovedAlerts.length === 1
                  ? "SMS removed from 1 alert — phone was never verified"
                  : `SMS removed from ${smsRemovedAlerts.length} alerts — phone was never verified`}
              </p>
              <p className="text-[12px] text-red-500/80 mt-0.5">
                The 24-hour verification window passed. Edit an alert to re-add SMS and verify your number.
              </p>
              {smsRemovedAlerts.length === 1 && (
                <button
                  onClick={() => openEdit(smsRemovedAlerts[0])}
                  className="mt-2 text-[12px] font-semibold text-red-400 hover:text-red-300 transition-colors underline underline-offset-2"
                >
                  Re-add SMS →
                </button>
              )}
            </div>
            <button
              onClick={handleDismissSmsRemovedBanner}
              className="shrink-0 p-1 rounded-lg text-red-500 hover:text-red-300 hover:bg-red-400/10 transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {showVerificationBanner && (
          <div className="rounded-2xl p-4 flex items-start gap-3 mt-4"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-amber-300">
                {unverifiedActiveAlerts.length === 1
                  ? "1 active alert needs phone verification"
                  : `${unverifiedActiveAlerts.length} active alerts need phone verification`}
              </p>
              <p className="text-[12px] text-amber-500/80 mt-0.5">
                SMS messages won't be sent until you verify your number. Tap an alert below to verify.
              </p>
              {unverifiedActiveAlerts.length === 1 && (
                <button
                  onClick={() => openEdit(unverifiedActiveAlerts[0])}
                  className="mt-2 text-[12px] font-semibold text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
                >
                  Verify now →
                </button>
              )}
            </div>
            <button
              onClick={handleDismissVerificationBanner}
              className="shrink-0 p-1 rounded-lg text-amber-500 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2].map(i => (
              <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-[14px]">No alerts yet</p>
            <p className="text-slate-600 text-[12px] mt-1">Daily reports or real-time condition triggers</p>
            <button onClick={openCreate}
              className="mt-5 px-6 py-2.5 rounded-2xl text-[13px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
              Create your first alert
            </button>
          </div>
        ) : (
          <>
            {conditionAlerts.length > 0 && (
              <section className="pt-2">
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Waves size={11} /> Condition Triggers
                </h2>
                <div className="space-y-3">
                  {conditionAlerts.map(a => (
                    <AlertCard key={a.id} alert={a}
                      onToggle={active => toggleMutation.mutate({ id: a.id, active })}
                      onEdit={() => openEdit(a)}
                      onDelete={() => deleteMutation.mutate(a.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {dailyAlerts.length > 0 && (
              <section className={conditionAlerts.length === 0 ? "pt-2" : ""}>
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Daily Reports
                </h2>
                <div className="space-y-3">
                  {dailyAlerts.map(a => (
                    <AlertCard key={a.id} alert={a}
                      onToggle={active => toggleMutation.mutate({ id: a.id, active })}
                      onEdit={() => openEdit(a)}
                      onDelete={() => deleteMutation.mutate(a.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Recent Activity
              </h2>
              {activityLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="rounded-xl px-4 py-5 flex items-center gap-3" style={CARD}>
                  <History size={16} className="text-slate-600 shrink-0" />
                  <p className="text-[12px] text-slate-600">No alerts have fired yet — this list will fill up once your alerts trigger.</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden" style={CARD}>
                  {recentActivity.map((entry, idx) => {
                    const typeInfo = ALERT_TYPES.find(t => t.id === entry.alertType) ?? ALERT_TYPES[0];
                    const TypeIcon = typeInfo.icon;
                    const displayName = entry.alertLabel || entry.locationName;
                    return (
                      <div key={entry.id}
                        className="flex items-start gap-3 px-4 py-3"
                        style={idx < recentActivity.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.05)" } : {}}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${typeInfo.color}18`, border: `1px solid ${typeInfo.color}28` }}>
                          <TypeIcon size={11} style={{ color: typeInfo.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[12px] font-semibold text-white truncate">{displayName}</span>
                            <span className="text-[10px] text-slate-500 shrink-0">{entry.locationCity}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">{entry.triggerReason}</p>
                        </div>
                        <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">{relativeTime(entry.firedAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <AlertFormDialog
        key={`${dialogOpen ? "open" : "closed"}-${editAlert?.id ?? "new"}`}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaveSuccess={handleAlertSaveSuccess}
        initialData={editInitial}
        editId={editAlert?.id}
        userEmail={userEmail}
        favorites={favorites}
        initialPhoneVerified={editAlert?.phoneVerified ?? false}
        initialEmailUnsubscribed={editAlert?.emailUnsubscribed ?? false}
        existingAlerts={alerts}
      />

      <Footer />
    </div>
  );
}
