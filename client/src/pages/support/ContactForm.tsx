import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export default function SupportContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) return;
    setState("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setState("success");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  };

  const subjects = [
    "Conditions data question",
    "SMS alert not working",
    "Account issue",
    "Bug report",
    "Feature request",
    "Other",
  ];

  return (
    <div className="support-contact-wrap">
      <style>{`
        .support-contact-wrap {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 64px 48px 72px;
        }
        .support-contact-inner {
          max-width: 560px; margin: 0 auto;
        }
        .support-contact-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2);
          border-radius: 20px; padding: 4px 12px; margin-bottom: 16px;
          font-size: 11px; font-weight: 700; color: #34d399; letter-spacing: 0.05em;
        }
        .support-contact-title { font-size: 26px; font-weight: 900; letter-spacing: -0.4px; margin-bottom: 8px; }
        .support-contact-sub { font-size: 14px; color: rgba(255,255,255,0.4); line-height: 1.6; margin-bottom: 32px; }
        .support-field { margin-bottom: 16px; }
        .support-label {
          display: block; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5);
          letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px;
        }
        .support-input, .support-textarea, .support-select {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px; padding: 12px 16px; color: white; font-family: inherit; font-size: 14px;
          outline: none; transition: border-color 0.2s; box-sizing: border-box;
        }
        .support-input:focus, .support-textarea:focus, .support-select:focus {
          border-color: rgba(52,211,153,0.4);
        }
        .support-input::placeholder, .support-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .support-textarea { resize: vertical; min-height: 120px; }
        .support-select { appearance: none; cursor: pointer; }
        .support-select option { background: #0d1f35; color: white; }
        .support-submit {
          width: 100%; background: #34d399; color: #030a14; border: none; border-radius: 10px;
          padding: 14px; font-family: inherit; font-weight: 800; font-size: 15px; cursor: pointer;
          margin-top: 8px; transition: background 0.2s, opacity 0.2s;
        }
        .support-submit:hover:not(:disabled) { background: #2fd494; }
        .support-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .support-success {
          background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.25);
          border-radius: 14px; padding: 24px 28px; text-align: center;
        }
        .support-success-icon { font-size: 32px; margin-bottom: 10px; }
        .support-success-title { font-size: 16px; font-weight: 700; color: #34d399; margin-bottom: 6px; }
        .support-success-body { font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.6; }
        .support-error-msg {
          background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2);
          border-radius: 8px; padding: 10px 14px; margin-top: 10px;
          font-size: 13px; color: #fca5a5;
        }
        @media (max-width: 768px) {
          .support-contact-wrap { padding: 48px 20px 56px; }
        }
      `}</style>

      <div className="support-contact-inner">
        <div className="support-contact-eyebrow">✉️ Contact Us</div>
        <div className="support-contact-title">Still need help?</div>
        <p className="support-contact-sub">
          Can't find what you're looking for? Send us a message and we'll get back to you within one business day.
        </p>

        {state === "success" ? (
          <div className="support-success">
            <div className="support-success-icon">✅</div>
            <div className="support-success-title">Message received</div>
            <div className="support-success-body">
              Thanks for reaching out. We'll get back to you within one business day.
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="support-field">
                <label className="support-label">Name</label>
                <input className="support-input" type="text" placeholder="Your name" value={form.name} onChange={set("name")} required />
              </div>
              <div className="support-field">
                <label className="support-label">Email</label>
                <input className="support-input" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required />
              </div>
            </div>
            <div className="support-field">
              <label className="support-label">Subject</label>
              <select className="support-select" value={form.subject} onChange={set("subject")} required>
                <option value="">Select a topic…</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="support-field">
              <label className="support-label">Message</label>
              <textarea className="support-textarea" placeholder="Describe your issue or question…" value={form.message} onChange={set("message")} required />
            </div>
            <button className="support-submit" type="submit" disabled={state === "submitting"}>
              {state === "submitting" ? "Sending…" : "Send Message"}
            </button>
            {state === "error" && <div className="support-error-msg">{errorMsg}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
