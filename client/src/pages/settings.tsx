import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Globe, Shield, RefreshCw, Trash2, Download } from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import { useState } from "react";

const CARD = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };
const SEP  = { borderColor: "rgba(255,255,255,0.06)" };

function SectionLabel({ icon: Icon, color, label }: { icon: any; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color }}>{label}</span>
    </div>
  );
}

function RowToggle({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-[13px] font-semibold text-slate-200">{label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function Settings() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [units, setUnits] = useState("imperial");
  const [language, setLanguage] = useState("en");

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "#030a14" }}>
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
            style={{ background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.15)" }}>
            <Globe size={18} className="text-slate-400" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl leading-tight">Preferences</h1>
            <p className="text-slate-500 text-[11px] mt-0.5">Customize your LiveSwell experience</p>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 pt-4 max-w-2xl mx-auto w-full space-y-4">

        {/* Location & Units */}
        <div className="rounded-2xl p-4" style={CARD}>
          <SectionLabel icon={MapPin} color="#34d399" label="Location & Units" />
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5">Measurement Units</p>
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
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5">Language</p>
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
            </div>
          </div>
        </div>

        {/* Data & Refresh */}
        <div className="rounded-2xl px-4 pt-4 pb-1" style={CARD}>
          <SectionLabel icon={RefreshCw} color="#22d3ee" label="Data & Refresh" />
          <div className="divide-y" style={SEP}>
            <RowToggle
              label="Auto-refresh Data"
              sub="Automatically update conditions every 30 seconds"
              checked={autoRefresh}
              onChange={setAutoRefresh}
            />
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="rounded-2xl p-4" style={CARD}>
          <SectionLabel icon={Shield} color="#38bdf8" label="Privacy & Security" />
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <Trash2 size={14} className="text-slate-500" />
              <span className="text-[13px] text-slate-300">Clear Cache & Data</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <Download size={14} className="text-slate-500" />
              <span className="text-[13px] text-slate-300">Export Favorites</span>
            </button>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-slate-600">App Version</span>
            <span className="text-[11px] text-slate-500">LiveSwell v1.0.0</span>
          </div>
        </div>

        {/* Save */}
        <button className="w-full h-11 rounded-2xl text-[13px] font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#059669,#0891b2)" }}>
          Save Changes
        </button>

      </main>

      <Footer />
    </div>
  );
}
