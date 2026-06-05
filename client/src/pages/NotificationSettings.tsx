import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Plus, MapPin, Clock, Trash2, Pencil, Mail, MessageSquare, Smartphone, ChevronRight,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Location } from "@/types/weather";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { pushNotifications } from "@/lib/push-notifications";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ───────────────────────────────────────────────────────────────────
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
  active: boolean;
  createdAt: string;
}

interface AlertFormState {
  locationId: number | null;
  label: string;
  frequency: "once_daily" | "twice_daily";
  notificationTime: string;
  notificationTimeTwo: string;
  timezone: string;
  channels: { push: boolean; sms: boolean; email: boolean };
  phoneNumber: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const BLANK_FORM: AlertFormState = {
  locationId: null,
  label: "",
  frequency: "once_daily",
  notificationTime: "08:00",
  notificationTimeTwo: "18:00",
  timezone: "America/New_York",
  channels: { push: false, sms: false, email: false },
  phoneNumber: "",
};

const TIMEZONES = [
  { value: "America/New_York",    label: "Eastern (ET)" },
  { value: "America/Chicago",     label: "Central (CT)" },
  { value: "America/Denver",      label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage",   label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu",    label: "Hawaii (HST)" },
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

const CARD: React.CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };
const SEL: React.CSSProperties  = { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" };
const INPUT_CLS = "w-full h-9 rounded-xl px-3 text-[13px] text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500/40";

// ─── Channel badge ────────────────────────────────────────────────────────────
function ChannelBadge({ ch }: { ch: string }) {
  const map: Record<string, { icon: any; label: string; color: string }> = {
    push:  { icon: Smartphone,    label: "Push",  color: "#a78bfa" },
    sms:   { icon: MessageSquare, label: "SMS",   color: "#34d399" },
    email: { icon: Mail,          label: "Email", color: "#38bdf8" },
  };
  const cfg = map[ch];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
      style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, color: cfg.color }}>
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────
function AlertCard({
  alert,
  onToggle,
  onEdit,
  onDelete,
}: {
  alert: UserAlert;
  onToggle: (active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const scheduleText =
    alert.frequency === "twice_daily" && alert.notificationTimeTwo
      ? `${formatTime(alert.notificationTime)} & ${formatTime(alert.notificationTimeTwo)} · Twice daily`
      : `${formatTime(alert.notificationTime)} · Once daily`;

  return (
    <div className="rounded-2xl p-4" style={{ ...CARD, opacity: alert.active ? 1 : 0.55 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: alert.active ? "#10b981" : "#475569", boxShadow: alert.active ? "0 0 6px #10b981" : "none" }} />
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
          <div className="flex items-center gap-1 ml-3.5 mb-2">
            <Clock size={10} className="text-slate-500" />
            <span className="text-[11px] text-slate-400">{scheduleText}</span>
          </div>
          <div className="flex flex-wrap gap-1 ml-3.5">
            {(alert.deliveryChannels ?? []).map(ch => <ChannelBadge key={ch} ch={ch} />)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Switch checked={alert.active} onCheckedChange={onToggle} />
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
              <Pencil size={12} className="text-slate-400" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10">
              <Trash2 size={12} className="text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Alert Form Dialog ────────────────────────────────────────────────────────
function AlertFormDialog({
  open,
  onClose,
  initialData,
  editId,
  userEmail,
  favorites,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<AlertFormState>;
  editId?: number;
  userEmail?: string | null;
  favorites: Location[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<AlertFormState>({ ...BLANK_FORM, ...initialData });

  const patch = (k: keyof AlertFormState, v: any) => setForm(f => ({ ...f, [k]: v }));
  const patchCh = (ch: keyof typeof BLANK_FORM.channels, v: boolean) =>
    setForm(f => ({ ...f, channels: { ...f.channels, [ch]: v } }));

  const handlePushToggle = async (val: boolean) => {
    if (val) {
      const supported = pushNotifications.isSupported();
      if (!supported) {
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
      toast({ title: "Alert created", description: "You'll be notified as scheduled." });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to create alert.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/user-alerts/${editId}`, { method: "PUT", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] });
      toast({ title: "Alert updated" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to update alert.", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!form.locationId) {
      toast({ title: "Pick a spot", description: "Select a surf spot for this alert.", variant: "destructive" });
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
    const payload = {
      locationId: form.locationId,
      label: form.label.trim() || null,
      alertType: "daily_report",
      frequency: form.frequency,
      notificationTime: form.notificationTime,
      notificationTimeTwo: form.frequency === "twice_daily" ? form.notificationTimeTwo : null,
      timezone: form.timezone,
      deliveryChannels: channels,
      phoneNumber: channels.includes("sms") ? form.phoneNumber.trim() : null,
      active: true,
    };
    editId ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background: "#0d1b2e", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }}>
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold">
            {editId ? "Edit Alert" : "Add Alert"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
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
          </div>

          {/* Label */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 block">Label (optional)</label>
            <input
              className={INPUT_CLS}
              style={SEL}
              placeholder="e.g. Morning session check"
              value={form.label}
              onChange={e => patch("label", e.target.value)}
            />
          </div>

          {/* Frequency */}
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

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 mb-1.5 block">
                {form.frequency === "twice_daily" ? "First time" : "Time"}
              </label>
              <Select value={form.notificationTime} onValueChange={v => patch("notificationTime", v)}>
                <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.frequency === "twice_daily" && (
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Second time</label>
                <Select value={form.notificationTimeTwo} onValueChange={v => patch("notificationTimeTwo", v)}>
                  <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 block">Timezone</label>
            <Select value={form.timezone} onValueChange={v => patch("timezone", v)}>
              <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl" style={SEL}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery channels */}
          <div>
            <label className="text-[11px] text-slate-400 mb-2 block">Deliver via</label>
            <div className="space-y-2">

              {/* Push */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={CARD}>
                <div className="flex items-center gap-2">
                  <Smartphone size={13} className="text-violet-400" />
                  <span className="text-[13px] text-slate-200">Push notification</span>
                </div>
                <Switch checked={form.channels.push} onCheckedChange={handlePushToggle} />
              </div>

              {/* SMS */}
              <div className="rounded-xl overflow-hidden" style={CARD}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={13} className="text-emerald-400" />
                    <span className="text-[13px] text-slate-200">SMS text message</span>
                  </div>
                  <Switch checked={form.channels.sms} onCheckedChange={v => patchCh("sms", v)} />
                </div>
                {form.channels.sms && (
                  <div className="px-3 pb-3 pt-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <input
                      className={INPUT_CLS}
                      style={{ ...SEL, marginTop: 4 }}
                      placeholder="+1 (555) 000-0000"
                      value={form.phoneNumber}
                      onChange={e => patch("phoneNumber", e.target.value)}
                      type="tel"
                    />
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="rounded-xl overflow-hidden" style={CARD}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-sky-400" />
                    <span className="text-[13px] text-slate-200">Email</span>
                  </div>
                  <Switch checked={form.channels.email} onCheckedChange={v => patchCh("email", v)} />
                </div>
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

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full h-11 rounded-2xl text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
            {isPending ? "Saving…" : editId ? "Save Changes" : "Create Alert"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotificationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAlert, setEditAlert] = useState<UserAlert | null>(null);

  const { data: alerts = [], isLoading } = useQuery<UserAlert[]>({
    queryKey: ["/api/user-alerts"],
    retry: false,
  });

  const { data: favorites = [] } = useQuery<Location[]>({
    queryKey: ["/api/favorites"],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest(`/api/user-alerts/${id}/toggle`, { method: "PATCH", body: { active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] }),
    onError: () => toast({ title: "Error", description: "Failed to update alert.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/user-alerts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] });
      toast({ title: "Alert deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete alert.", variant: "destructive" }),
  });

  const openCreate = () => { setEditAlert(null); setDialogOpen(true); };
  const openEdit = (a: UserAlert) => { setEditAlert(a); setDialogOpen(true); };

  const userEmail = (user as any)?.email ?? null;

  const editInitial = editAlert ? {
    locationId: editAlert.locationId,
    label: editAlert.label ?? "",
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
  } : undefined;

  return (
    <div className="min-h-screen flex flex-col pb-6" style={{ background: "#030a14" }}>
      <Header />

      {/* Page header */}
      <div className="px-5 pt-6 pb-4" style={{ background: "linear-gradient(180deg,#041a2e 0%,#030a14 100%)" }}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <Bell size={18} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-white font-black text-xl leading-tight">Alerts</h1>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {alerts.length === 0 ? "No alerts yet" : `${alerts.length} alert${alerts.length !== 1 ? "s" : ""} configured`}
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 h-9 px-4 rounded-2xl text-[12px] font-bold text-emerald-400 transition-opacity hover:opacity-80"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <Plus size={14} />
            Add Alert
          </button>
        </div>
      </div>

      <main className="flex-1 px-4 pt-4 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="rounded-2xl h-24 animate-pulse" style={CARD} />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Bell size={22} className="text-slate-600" />
            </div>
            <p className="text-slate-300 font-semibold text-sm mb-1">No alerts set up</p>
            <p className="text-slate-500 text-xs max-w-[220px]">
              Create your first alert to get daily surf reports via push, SMS, or email.
            </p>
            <button
              onClick={openCreate}
              className="mt-5 flex items-center gap-2 h-10 px-5 rounded-2xl text-[13px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
              <Plus size={14} />
              Create First Alert
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(a => (
              <AlertCard
                key={a.id}
                alert={a}
                onToggle={active => toggleMutation.mutate({ id: a.id, active })}
                onEdit={() => openEdit(a)}
                onDelete={() => deleteMutation.mutate(a.id)}
              />
            ))}

            {/* Add another */}
            <button
              onClick={openCreate}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl text-[12px] font-semibold text-slate-400 transition-opacity hover:opacity-70"
              style={{ border: "1px dashed rgba(255,255,255,0.1)", background: "transparent" }}>
              <Plus size={13} />
              Add another alert
            </button>
          </div>
        )}
      </main>

      {/* Add / Edit dialog */}
      {dialogOpen && (
        <AlertFormDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditAlert(null); }}
          initialData={editInitial}
          editId={editAlert?.id}
          userEmail={userEmail}
          favorites={favorites}
        />
      )}

      <Footer />
    </div>
  );
}
