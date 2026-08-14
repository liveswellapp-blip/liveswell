import { useState, useRef, useEffect } from "react";
import { Location, SurfConditions } from "@/types/weather";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, RefreshCw, SquarePen, Lock } from "lucide-react";
import { Link } from "wouter";
import { getClerkToken } from "@/lib/queryClient";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AISurfChatProps {
  location: Location;
  conditions: SurfConditions | undefined;
  aiSummary?: string;
}

export default function AISurfChat({ location, conditions, aiSummary }: AISurfChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);   // true = waiting for first token (show dots)
  const [isStreaming, setIsStreaming] = useState(false); // true = stream in progress (disable input)
  const [error, setError] = useState<string | null>(null);
  const [proRequired, setProRequired] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  // Keep the input bar above the soft keyboard on mobile.
  // `fixed bottom-0` is relative to the layout viewport, which the keyboard
  // overlaps without moving. visualViewport tracks the actually-visible area.
  const [kbOffset, setKbOffset] = useState(0);
  const [kbVpH, setKbVpH] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      if (window.innerWidth >= 768) { setKbOffset(0); setKbVpH(null); return; }
      const offset = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
      setKbOffset(offset);
      setKbVpH(vv.height);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

  // Build the opening context message when the panel first opens
  useEffect(() => {
    if (open && !initializedRef.current) {
      initializedRef.current = true;
      const contextMsg = buildContextMessage(location, conditions, aiSummary);
      setMessages([{ role: "assistant", content: contextMsg }]);
    }
  }, [open]);

  // Reset on location change
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
    initializedRef.current = false;
    setOpen(false);
  }, [location.id]);

  // Scroll to bottom on new messages or while streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isStreaming]);

  // Focus textarea when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading || isStreaming) return;

    setInput("");
    setError(null);

    const userMessage: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const token = await getClerkToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          locationId: location.id,
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 402) {
        setProRequired(true);
        setMessages(nextMessages.slice(0, -1));
        return;
      }

      if (res.status === 401) {
        throw new Error("Not signed in — please refresh the page.");
      }

      if (!res.ok) {
        throw new Error("Request failed");
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      // Add an empty placeholder for the assistant reply
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstToken = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          if (payload === "[ERROR]") throw new Error("Stream error");

          try {
            const { token } = JSON.parse(payload);
            if (token) {
              // Hide loading dots on the first token
              if (!firstToken) {
                firstToken = true;
                setIsLoading(false);
              }
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + token,
                };
                return updated;
              });
            }
          } catch {
            // Ignore parse errors on individual chunks
          }
        }
      }

      // Guard: if the stream ended with no tokens, the assistant bubble would
      // be blank.  Replace it with a user-friendly fallback message.
      if (!firstToken) {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && last.content === "") {
            updated[updated.length - 1] = {
              ...last,
              content: "Sorry, I couldn't generate a response. Please try again.",
            };
          }
          return updated;
        });
      }
    } catch {
      setError("Couldn't connect. Tap retry to try again.");
      // Roll back to the pre-send message list
      setMessages(nextMessages.slice(0, -1).concat(
        // keep user message visible so they can see what they sent
        nextMessages[nextMessages.length - 1]
          ? [nextMessages[nextMessages.length - 1]]
          : []
      ));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }

  function handleRetry() {
    setError(null);
  }

  function handleNewChat() {
    setInput("");
    setError(null);
    const contextMsg = buildContextMessage(location, conditions, aiSummary);
    setMessages([{ role: "assistant", content: contextMsg }]);
  }

  const isBusy = isLoading || isStreaming;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const QUICK_PROMPTS = [
    "Is this good for beginners?",
    "What does the wave period mean?",
    "Should I go now or wait?",
    "What wetsuit do I need?",
  ];

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        style={{
          width: 52,
          height: 52,
          background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
          boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
        }}
        aria-label="Ask about conditions"
      >
        <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-white/[0.08] shadow-2xl transition-transform duration-300 ease-out
          md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:rounded-2xl md:border md:border-white/[0.08]
          ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{
          height: open
            ? (kbOffset > 0 && kbVpH ? `${Math.round(kbVpH * 0.88)}px` : "min(82dvh, 600px)")
            : undefined,
          ...(kbOffset > 0 ? { bottom: kbOffset } : {}),
          background: "linear-gradient(160deg, #030912 0%, #091a35 100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] shrink-0">
          <div>
            <p className="text-sm font-semibold text-white leading-none">Ask about {location.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">AI · current conditions</p>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button
                onClick={handleNewChat}
                disabled={isBusy}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="New chat"
                title="New chat"
              >
                <SquarePen className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-br-sm"
                    : "bg-white/[0.07] text-slate-100 rounded-bl-sm border border-white/[0.06]"
                }`}
              >
                {formatAssistantMessage(msg.content)}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.07] border border-white/[0.06] rounded-2xl rounded-bl-sm px-3 py-2.5">
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isBusy && (
            <div className="flex justify-start">
              <div className="max-w-[82%] rounded-2xl rounded-bl-sm px-3 py-2 bg-red-950/50 border border-red-800/40 text-red-300 text-sm flex items-center gap-2">
                <span className="flex-1 text-xs">{error}</span>
                <button
                  onClick={handleRetry}
                  className="shrink-0 text-red-400 hover:text-red-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quick prompts — show when only the context message is present */}
          {messages.length === 1 && !isBusy && (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-xs text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-800/50 rounded-xl px-3 py-2 transition-colors leading-snug"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input — locked for free users */}
        {proRequired ? (
          <div className="px-4 pt-3 pb-5 shrink-0 border-t border-white/[0.08] flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-semibold">Pro feature</span>
            </div>
            <p className="text-[12px] text-slate-400 text-center leading-snug">
              AI surf chat is available on the Pro plan. Upgrade to ask questions about conditions, gear, and local breaks.
            </p>
            <Link
              href="/pricing"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)" }}
              onClick={() => setOpen(false)}
            >
              Upgrade to Pro
            </Link>
          </div>
        ) : (
          <div className="px-3 pt-2 pb-4 shrink-0 border-t border-white/[0.08]">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about conditions…"
                rows={1}
                disabled={isBusy}
                className="flex-1 resize-none bg-white/[0.07] border-white/[0.12] text-white placeholder:text-slate-500 rounded-xl text-sm py-2.5 focus:ring-1 focus:ring-emerald-500 min-h-[40px] max-h-[120px] overflow-y-auto"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isBusy}
                className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-center text-slate-600 text-[10px] mt-1.5">Enter to send · Shift+Enter for new line</p>
          </div>
        )}
      </div>
    </>
  );
}

export function buildContextMessage(
  location: Location,
  conditions: SurfConditions | undefined,
  aiSummary?: string,
): string {
  if (!conditions) {
    return `Hey! I can answer questions about ${location.name}. Conditions are still loading — ask me anything about surf in general while we wait.`;
  }

  const waveH = conditions.waveHeight ? `${parseFloat(conditions.waveHeight).toFixed(1)} ft` : "unknown";
  const period = conditions.wavePeriod ? `${conditions.wavePeriod}s` : "—";
  const dir = conditions.waveDirection || "—";
  const wind = conditions.windSpeed ? `${Math.round(parseFloat(conditions.windSpeed))} mph ${conditions.windDirection || ""}`.trim() : "—";
  const tide = conditions.tideStatus ? `${conditions.tideStatus}${conditions.tideHeight ? ` at ${parseFloat(conditions.tideHeight).toFixed(1)} ft` : ""}` : "—";
  const water = conditions.waterTemp ? `${parseFloat(conditions.waterTemp).toFixed(0)}°F` : "—";

  const lines = [
    `Here's what's happening at **${location.name}** right now:`,
    "",
    `🌊 Waves: ${waveH} @ ${period} from ${dir}`,
    `💨 Wind: ${wind}`,
    `🌊 Tide: ${tide}`,
    `🌡️ Water: ${water}`,
  ];

  if (aiSummary) {
    lines.push("", aiSummary);
  }

  lines.push("", "Ask me anything — beginner tips, what the numbers mean, best time to paddle out, etc.");

  return lines.join("\n");
}

function formatAssistantMessage(content: string): React.ReactNode {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line === "") return <div key={i} className="h-0.5" />;
        // Handle bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="leading-snug">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="text-white font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}
