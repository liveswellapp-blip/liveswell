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

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#030a14" }}>
      <Header />

      <div className="px-5 pt-8 pb-5" style={{ background: "linear-gradient(180deg,#041a2e 0%,#030a14 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-2">LiveSwell</p>
          <h1 className="text-white font-black text-2xl leading-tight">Terms of Service</h1>
          <p className="text-slate-500 text-[12px] mt-1">Effective date: July 1, 2025 &nbsp;·&nbsp; Last updated: August 3, 2026</p>
        </div>
      </div>

      <main className="flex-1 px-4 pt-4 pb-10 max-w-2xl mx-auto w-full space-y-3">

        <Section title="Acceptance of terms">
          <p>
            By accessing or using LiveSwell ("the Service"), you agree to be bound by these Terms of
            Service. If you do not agree, please do not use the Service.
          </p>
        </Section>

        <Section title="Description of service">
          <p>
            LiveSwell provides real-time surf condition data including wave height, wind, and tide
            information for surf spots worldwide. The Service includes optional SMS and email alert
            notifications, and an AI-powered surf condition assistant.
          </p>
        </Section>

        <Section title="User accounts">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials.
            You must provide accurate information when creating your account. You may not use the
            Service for any unlawful purpose.
          </p>
        </Section>

        <Section title="SMS messaging terms">
          <p>
            By opting in to SMS alerts, you agree to receive automated text messages from LiveSwell
            at the phone number you provide. Message types include surf condition alerts, daily
            digests, and responses to questions you send to our surf assistant.
          </p>
          <p><strong className="text-slate-300">Message frequency:</strong> Varies based on conditions and your alert settings. You may receive multiple messages per day when surf conditions change.</p>
          <p><strong className="text-slate-300">Message and data rates may apply.</strong> Contact your wireless carrier for plan details.</p>
          <p><strong className="text-slate-300">To opt out:</strong> Reply STOP to any SMS from LiveSwell. You will receive a confirmation and no further messages will be sent. Reply START to re-subscribe. Reply HELP for assistance.</p>
          <p>
            SMS consent is not required to use other features of the Service and is not a condition
            of any purchase.
          </p>
        </Section>

        <Section title="Surf data accuracy">
          <p>
            Surf condition data is sourced from NOAA, OpenWeatherMap, and other third-party providers.
            LiveSwell does not guarantee the accuracy, completeness, or timeliness of this data.
            Always use your own judgment before entering the water. LiveSwell is not liable for
            decisions made based on the data provided.
          </p>
        </Section>

        <Section title="AI surf assistant">
          <p>
            The LiveSwell AI surf assistant provides information based on available conditions data.
            Responses are automated and may not reflect real-time conditions. Do not rely solely on
            AI responses for ocean safety decisions.
          </p>
        </Section>

        <Section title="Intellectual property">
          <p>
            All content, design, and software comprising the Service is owned by LiveSwell and
            protected by applicable intellectual property laws. You may not copy, reproduce, or
            redistribute any part of the Service without written permission.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the fullest extent permitted by law, LiveSwell shall not be liable for any indirect,
            incidental, special, or consequential damages arising from your use of the Service,
            including but not limited to damages related to surf conditions data or SMS communications.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these Terms of Service from time to time. Continued use of the Service
            after changes are posted constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms? Contact us at{" "}
            <a href="mailto:legal@liveswell.io" className="text-emerald-400 underline hover:text-emerald-300">
              legal@liveswell.io
            </a>{" "}or visit{" "}
            <a href="https://liveswell.io" className="text-emerald-400 underline hover:text-emerald-300">
              liveswell.io
            </a>.
          </p>
        </Section>

      </main>

      <Footer />
    </div>
  );
}
