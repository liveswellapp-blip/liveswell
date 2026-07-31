import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, MapPin, User, ChevronLeft } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const CARD = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };

function SectionLabel({ icon: Icon, color, label }: { icon: any; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color }}>{label}</span>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

const INPUT = "w-full h-9 rounded-xl px-3 text-[13px] text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500/50 transition-shadow";
const INPUT_STYLE = { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" };

export default function Settings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Profile fields
  const [firstName, setFirstName] = useState((user as any)?.firstName || "");
  const [lastName,  setLastName]  = useState((user as any)?.lastName  || "");
  const [email,     setEmail]     = useState((user as any)?.email     || "");

  // Prefs from /api/profile
  const [units,    setUnits]    = useState("imperial");
  const [language, setLanguage] = useState("en");

  const { data: profile } = useQuery<{ units?: string; language?: string }>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const r = await fetch("/api/profile");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  useEffect(() => {
    if (profile?.units)    setUnits(profile.units);
    if (profile?.language) setLanguage(profile.language);
  }, [profile]);

  const userMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "Failed");
    },
  });

  const prefsMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units, language }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "Failed");
    },
  });

  const handleSave = async () => {
    try {
      await Promise.all([userMutation.mutateAsync(), prefsMutation.mutateAsync()]);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Preferences saved", description: "Your profile has been updated." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const saving = userMutation.isPending || prefsMutation.isPending;

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.15)" }}>
              <Globe size={18} className="text-slate-400" />
            </div>
            <div>
              <h1 className="text-white font-black text-xl leading-tight">Preferences</h1>
              <p className="text-slate-500 text-[11px] mt-0.5">Customize your LiveSwell experience</p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 pt-4 max-w-2xl mx-auto w-full space-y-4">

        {/* Profile */}
        <div className="rounded-2xl p-4" style={CARD}>
          <SectionLabel icon={User} color="#34d399" label="Profile" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="First Name">
                <input
                  className={INPUT}
                  style={INPUT_STYLE}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </FieldRow>
              <FieldRow label="Last Name">
                <input
                  className={INPUT}
                  style={INPUT_STYLE}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </FieldRow>
            </div>
            <FieldRow label="Email">
              <input
                className={INPUT}
                style={INPUT_STYLE}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </FieldRow>
          </div>
        </div>

        {/* Location & Units */}
        <div className="rounded-2xl p-4" style={CARD}>
          <SectionLabel icon={MapPin} color="#22d3ee" label="Units & Language" />
          <div className="space-y-3">
            <FieldRow label="Measurement Units">
              <Select value={units} onValueChange={setUnits}>
                <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">Imperial (ft, mph, °F)</SelectItem>
                  <SelectItem value="metric">Metric (m, km/h, °C)</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Language">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9 text-[13px] text-slate-200 rounded-xl"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-2xl text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#059669,#0891b2)" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>

      </main>

      <Footer />
    </div>
  );
}
