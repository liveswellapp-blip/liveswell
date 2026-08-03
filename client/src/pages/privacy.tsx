import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CARD = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-3" style={CARD}>
      <h2 className="text-white font-bold text-[15px]">{title}</h2>
      <div className="text-slate-400 text-[13px] leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-3 text-[13px] text-emerald-300 leading-relaxed"
      style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)" }}>
      {children}
    </div>
  );
}

export default function Privacy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#030a14" }}>
      <Header />

      <div className="px-5 pt-8 pb-5" style={{ background: "linear-gradient(180deg,#041a2e 0%,#030a14 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-2">LiveSwell</p>
          <h1 className="text-white font-black text-2xl leading-tight">Privacy Policy</h1>
          <p className="text-slate-500 text-[12px] mt-1">Effective date: July 1, 2025 &nbsp;·&nbsp; Last updated: August 3, 2026</p>
        </div>
      </div>

      <main className="flex-1 px-4 pt-4 pb-10 max-w-2xl mx-auto w-full space-y-3">

        <Section title="About LiveSwell">
          <p>
            LiveSwell ("we," "us," or "our") is a surf conditions platform that delivers real-time wave,
            wind, and tide data to surfers. This Privacy Policy explains what information we collect,
            how we use it, and your choices — including how we communicate with you via SMS text messages.
          </p>
          <p>
            By using LiveSwell, you agree to the practices described in this policy. If you do not agree,
            please discontinue use of the service.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>We collect the following personal information when you create an account or use the service:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li><strong className="text-slate-300">Name and email address</strong> — for account creation and email alerts</li>
            <li><strong className="text-slate-300">Phone number</strong> — only if you opt in to SMS alerts; verified by a one-time code</li>
            <li><strong className="text-slate-300">Saved surf spots and alert preferences</strong> — to personalize your experience</li>
            <li><strong className="text-slate-300">Usage data</strong> — to improve the service (no third-party ad tracking)</li>
          </ul>
        </Section>

        <Section title="SMS messaging — opt-in and consent">
          <Highlight>
            By providing your phone number and enabling SMS alerts in LiveSwell, you expressly consent
            to receive text messages from LiveSwell at the number provided.
          </Highlight>
          <p>
            SMS messages we send include:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Real-time surf condition alerts for your saved spots</li>
            <li>Daily surf condition digests (if enabled)</li>
            <li>A one-time verification code when you first add your phone number</li>
            <li>Replies to questions you send to our surf AI agent</li>
          </ul>
          <p>
            <strong className="text-slate-300">Message frequency:</strong> Alert frequency depends on
            conditions at your saved spots and the thresholds you set. You may receive up to several
            messages per day when conditions change significantly.
          </p>
          <p>
            <strong className="text-slate-300">Message and data rates may apply.</strong> Contact your
            wireless carrier for details about your plan.
          </p>
        </Section>

        <Section title="SMS opt-out and help">
          <Highlight>
            Reply <strong>STOP</strong> to any SMS from LiveSwell to unsubscribe immediately.
            You will receive a confirmation and no further messages will be sent.
            Reply <strong>START</strong> to re-subscribe at any time.
            Reply <strong>HELP</strong> for assistance.
          </Highlight>
          <p>
            You can also disable SMS alerts at any time from the Notification Settings screen inside the app.
            Opting out via SMS or the app does not delete your account.
          </p>
        </Section>

        <Section title="How we use your information">
          <p>We use your information to:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Operate LiveSwell and deliver the alerts you configured</li>
            <li>Verify your phone number before sending SMS messages</li>
            <li>Respond to your inbound SMS questions about surf conditions</li>
            <li>Improve data accuracy and app performance</li>
          </ul>
          <p>
            <strong className="text-slate-300">We do not sell, rent, or share your personal information —
            including your phone number — with third parties for marketing purposes.</strong>
          </p>
        </Section>

        <Section title="Third-party service providers">
          <p>
            We work with the following trusted providers to operate the service. Each is bound by
            their own privacy and data protection policies:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li><strong className="text-slate-300">Twilio</strong> — SMS message delivery (<a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline hover:text-emerald-300">twilio.com/legal/privacy</a>)</li>
            <li><strong className="text-slate-300">Resend</strong> — Email delivery</li>
            <li><strong className="text-slate-300">OpenAI</strong> — AI-powered surf condition summaries</li>
            <li><strong className="text-slate-300">NOAA / OpenWeatherMap</strong> — Weather and tide data</li>
          </ul>
          <p>
            Your phone number is transmitted to Twilio solely to deliver messages you have requested.
            It is not used by Twilio for marketing or shared further.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            We retain your personal information for as long as your account is active or as needed
            to provide the service. SMS conversation history is automatically deleted after 30 days.
            Verification codes expire within 10 minutes of issuance.
          </p>
          <p>
            You may request deletion of your account and all associated data by contacting us at{" "}
            <a href="mailto:privacy@liveswell.io" className="text-emerald-400 underline hover:text-emerald-300">
              privacy@liveswell.io
            </a>.
          </p>
        </Section>

        <Section title="Security">
          <p>
            All data is transmitted over encrypted connections (HTTPS/TLS). Passwords are hashed and
            never stored in plain text. Phone numbers are stored and used only to deliver alerts you
            have explicitly requested.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>
            LiveSwell is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with personal
            information, please contact us and we will delete it promptly.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the
            "Last updated" date at the top of this page. Continued use of LiveSwell after changes
            are posted constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            For privacy-related questions or to request data deletion, contact us at:
          </p>
          <div className="rounded-xl px-4 py-3 space-y-0.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-slate-200 font-semibold">LiveSwell</p>
            <p>
              <a href="mailto:privacy@liveswell.io" className="text-emerald-400 underline hover:text-emerald-300">
                privacy@liveswell.io
              </a>
            </p>
            <p>
              <a href="https://liveswell.io" className="text-emerald-400 underline hover:text-emerald-300">
                liveswell.io
              </a>
            </p>
          </div>
        </Section>

      </main>

      <Footer />
    </div>
  );
}
