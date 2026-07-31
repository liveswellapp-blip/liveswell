import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CARD = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-2" style={CARD}>
      <h2 className="text-white font-bold text-[14px]">{title}</h2>
      <div className="text-slate-400 text-[13px] leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function Privacy() {
  const [, navigate] = useLocation();

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
          <h1 className="text-white font-black text-xl leading-tight">Privacy Policy</h1>
          <p className="text-slate-500 text-[11px] mt-1">Last updated July 2025</p>
        </div>
      </div>

      <main className="flex-1 px-4 pt-4 max-w-2xl mx-auto w-full space-y-3">

        <Section title="What we collect">
          <p>We collect your name, email address, and phone number (if you enable SMS alerts) to provide surf condition notifications. We also store the surf spots you save as favorites and your alert preferences.</p>
        </Section>

        <Section title="How we use your data">
          <p>Your data is used solely to operate LiveSwell — sending you the alerts you configured, personalizing your spot list, and improving the service. We do not sell or share your personal information with third parties for marketing purposes.</p>
        </Section>

        <Section title="SMS alerts">
          <p>If you enable SMS alerts, your phone number is shared with Twilio to deliver messages. Standard message and data rates may apply. You can opt out at any time by replying STOP to any alert message, or by disabling SMS in your notification settings.</p>
        </Section>

        <Section title="Email alerts">
          <p>Alert emails are delivered via Resend. Your email address is used only to send the alerts you've subscribed to. Each email includes an unsubscribe link.</p>
        </Section>

        <Section title="Data retention">
          <p>Your account data is retained as long as your account is active. You can request deletion of your account and associated data by contacting us.</p>
        </Section>

        <Section title="Security">
          <p>We use industry-standard practices to protect your data, including encrypted connections (HTTPS) and hashed credentials. We do not store raw passwords.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy? Reach us at{" "}
            <a href="mailto:privacy@liveswell.io" className="text-emerald-400 hover:text-emerald-300 underline">
              privacy@liveswell.io
            </a>.
          </p>
        </Section>

      </main>

      <Footer />
    </div>
  );
}
