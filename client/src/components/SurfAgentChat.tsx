import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  pending?: boolean;
}

const QUICK_PROMPTS = [
  "How are my spots looking today?",
  "What's the forecast for tomorrow?",
  "Compare my spots right now",
  "Full forecast for all my spots",
];

export default function SurfAgentChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [proRequired, setProRequired] = useState(false);
  // Timestamp (ms) after which the Refresh button is re-enabled
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(0);
  const [, forceRefreshCooldownRender] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

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

  const { data: history = [], isLoading: historyLoading, error: historyError } = useQuery<Message[]>({
    queryKey: ["/api/agent/history"],
    enabled: open,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: (count, err: any) => {
      // Don't retry on 402 — the user needs to upgrade, not retry
      if (String(err?.message ?? "").startsWith("402")) return false;
      return count < 3;
    },
  });

  // Detect Pro requirement from history query error
  useEffect(() => {
    if (historyError && String((historyError as any)?.message ?? "").startsWith("402")) {
      setProRequired(true);
    }
  }, [historyError]);

  const { data: freshness } = useQuery<{ oldestUpdatedAt: string | null; hasSpots?: boolean; missingSpotCount?: number }>({
    queryKey: ["/api/agent/conditions-freshness"],
    enabled: open,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const freshnessLabel = (() => {
    if (!freshness?.oldestUpdatedAt) return null;
    const ageMs = Date.now() - new Date(freshness.oldestUpdatedAt).getTime();
    const minutes = Math.round(ageMs / 60_000);
    if (minutes < 1) return "Conditions just updated";
    if (minutes < 60) return `Conditions ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
    return `Conditions ${timeStr}`;
  })();

  const isStale = freshness?.oldestUpdatedAt
    ? Date.now() - new Date(freshness.oldestUpdatedAt).getTime() > 2 * 60 * 60 * 1000
    : false;

  // Merge server history + local optimistic messages
  const allMessages: Message[] = [
    ...history,
    ...localMessages.filter(
      (m) => !history.some((h) => h.id && m.id && h.id === m.id),
    ),
  ];

  // Track whether we've already auto-refreshed for the current drawer session
  const autoRefreshedRef = useRef(false);

  // Reset the guard whenever the drawer closes
  useEffect(() => {
    if (!open) {
      autoRefreshedRef.current = false;
    }
  }, [open]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("/api/agent/chat", { method: "POST", body: { message } });
      return res.json();
    },
    onSuccess: (data) => {
      // Remove pending markers and refresh from server
      setLocalMessages([]);
      qc.invalidateQueries({ queryKey: ["/api/agent/history"] });
      setIsTyping(false);
    },
    onError: (err) => {
      const msg = String((err as any)?.message ?? "");
      if (msg.startsWith("402")) {
        // Free user hit the paywall — show upgrade prompt, remove optimistic messages
        setProRequired(true);
        setLocalMessages([]);
        setIsTyping(false);
        return;
      }
      if (msg.startsWith("403") && msg.toLowerCase().includes("suspended")) {
        // Account is suspended — the global QueryCache handler already fires a toast;
        // also inject a clear bubble so the chat thread itself explains the failure.
        setLocalMessages((prev) => [
          ...prev.filter((m) => !(m.pending && m.role === "assistant")),
          {
            role: "assistant",
            content: "Your account has been suspended. Please contact support for assistance.",
          },
        ]);
        setIsTyping(false);
        return;
      }
      // Remove pending assistant placeholder, keep user message; inject error bubble
      setLocalMessages((prev) => [
        ...prev.filter((m) => !(m.pending && m.role === "assistant")),
        {
          role: "assistant",
          content: "Sorry, I couldn't connect right now. Check your connection and try again.",
        },
      ]);
      setIsTyping(false);
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/agent/history", { method: "DELETE" });
    },
    onSuccess: () => {
      setLocalMessages([]);
      qc.invalidateQueries({ queryKey: ["/api/agent/history"] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/agent/refresh-conditions", { method: "POST" });
      return res.json() as Promise<{ refreshed: number; cached?: boolean; nextAllowedAt?: number; message: string }>;
    },
    onSuccess: (data) => {
      if (data.nextAllowedAt) {
        setRefreshCooldownUntil(data.nextAllowedAt);
        // Schedule a re-render for when the cooldown expires
        const delay = data.nextAllowedAt - Date.now();
        if (delay > 0) {
          setTimeout(() => forceRefreshCooldownRender((n) => n + 1), delay);
        }
      }
      qc.invalidateQueries({ queryKey: ["/api/agent/conditions-freshness"] });
    },
  });

  const isRefreshOnCooldown = Date.now() < refreshCooldownUntil;
  const isRefreshDisabled = refreshMutation.isPending || isRefreshOnCooldown;

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatMutation.isPending) return;

      setInput("");
      setIsTyping(true);

      // Optimistic: add user message immediately
      setLocalMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed, pending: true },
      ]);

      chatMutation.mutate(trimmed);
    },
    [chatMutation],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, isTyping]);

  // Auto-refresh conditions silently when the drawer opens and data is stale
  useEffect(() => {
    if (open && isStale && !isRefreshDisabled && !autoRefreshedRef.current) {
      autoRefreshedRef.current = true;
      refreshMutation.mutate();
    }
  }, [open, isStale, isRefreshDisabled]);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const isEmpty = allMessages.length === 0 && !historyLoading;

  // Detect assistant replies that indicate missing conditions data.
  // The agent's system prompt requires it to say "I don't have current data for [spot]"
  // when conditions are unavailable — we match those phrases here.
  const NO_DATA_PATTERN =
    /I don't have current data|no conditions data|don't have.*data for|haven't loaded|no data available|conditions.*not.*available|no surf data/i;
  const NO_DATA_THRESHOLD = 2;

  const noDataReplyCount = allMessages.filter(
    (m) => m.role === "assistant" && !m.pending && NO_DATA_PATTERN.test(m.content)
  ).length;

  // Show the in-conversation warning when:
  //  • at least one saved spot is missing conditions data (missingSpotCount > 0), AND
  //  • the agent has replied with a no-data answer at least NO_DATA_THRESHOLD times
  //  Using missingSpotCount (not oldestUpdatedAt === null) so the warning fires even
  //  when some spots have data but one or more are still missing.
  const showNoDataWarning =
    !!(freshness?.hasSpots && (freshness?.missingSpotCount ?? 0) > 0) &&
    noDataReplyCount >= NO_DATA_THRESHOLD;

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-900/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        aria-label="Open surf agent chat"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col bg-zinc-950 border-t border-zinc-800 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        } md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:h-[600px] md:rounded-2xl md:border md:border-zinc-800`}
        style={{
          height: open
            ? (kbOffset > 0 && kbVpH ? `${Math.round(kbVpH * 0.88)}px` : "min(85dvh, 640px)")
            : undefined,
          ...(kbOffset > 0 ? { bottom: kbOffset } : {}),
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-sm font-semibold text-white leading-none">Live Swell Agent</p>
              {freshnessLabel ? (
                <p className={`text-xs mt-0.5 ${isStale ? "text-amber-500" : "text-zinc-500"}`}>
                  {freshnessLabel}{isStale ? " · may be outdated" : ""}
                </p>
              ) : freshness?.hasSpots ? (
                <p className="text-xs text-amber-500 mt-0.5">No conditions loaded yet</p>
              ) : (
                <p className="text-xs text-zinc-500 mt-0.5">AI · knows your spots</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isStale && (
              <button
                onClick={() => refreshMutation.mutate()}
                disabled={isRefreshDisabled}
                className="text-xs text-amber-500 hover:text-amber-300 px-2 py-1 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                title={isRefreshOnCooldown ? "Conditions were just refreshed — please wait a moment" : "Refresh conditions"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-3 h-3 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                {refreshMutation.isPending ? "Refreshing…" : isRefreshOnCooldown ? "Just refreshed" : "Refresh"}
              </button>
            )}
            {allMessages.length > 0 && (
              <button
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors"
                title="New conversation"
              >
                New chat
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {historyLoading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          )}

          {isEmpty && !historyLoading && (
            <div className="flex flex-col items-center pt-6 pb-2 gap-4">
              <div className="text-center">
                <p className="text-white font-medium text-sm">Hey, I'm the Live Swell Agent</p>
                <p className="text-zinc-500 text-xs mt-1">Ask me about your spots, conditions, or when to paddle out</p>
              </div>
              {freshness?.hasSpots && (freshness?.missingSpotCount ?? 0) > 0 && (
                <div className="w-full flex items-start gap-2 bg-amber-950/40 border border-amber-700/50 rounded-lg px-3 py-2.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"
                  >
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-300 text-xs font-medium leading-snug">Conditions haven't loaded yet</p>
                    <p className="text-amber-500/80 text-xs mt-0.5 leading-snug">Try refreshing your spots to get the latest data.</p>
                  </div>
                  <button
                    onClick={() => refreshMutation.mutate()}
                    disabled={isRefreshDisabled}
                    className="text-xs text-amber-400 hover:text-amber-200 font-medium shrink-0 flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`w-3 h-3 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                    >
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                    {refreshMutation.isPending ? "Refreshing…" : isRefreshOnCooldown ? "Just refreshed" : "Refresh"}
                  </button>
                </div>
              )}
              <div className="w-full grid grid-cols-1 gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={chatMutation.isPending}
                    className="text-left text-xs text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-800/50 rounded-lg px-3 py-2 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allMessages.map((msg, i) => (
            <div
              key={msg.id ?? `local-${i}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-br-sm"
                    : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
                } ${msg.pending ? "opacity-70" : ""}`}
              >
                {msg.role === "assistant"
                  ? (() => {
                      const lines = msg.content.split("\n");
                      const SECTION_LABELS = new Set(["Swell", "Wind", "Tides"]);
                      const DAY_RE = /^(Tomorrow|Sun|Mon|Tue|Wed|Thu|Fri|Sat)/;
                      // Data lines always start with a known keyword followed by " - "
                      // Using startsWith avoids false-positives for spot names like "Folly Beach - The Washout"
                      const DATA_PREFIXES = ["Swell - ", "Wind - ", "Tide - ", "Water Temp - "];
                      const isDataLine = (l: string) => DATA_PREFIXES.some(p => l.startsWith(p));
                      const isSpotName = (l: string, idx: number) =>
                        idx > 0 &&
                        l !== "" &&
                        !SECTION_LABELS.has(l) &&
                        !DAY_RE.test(l) &&
                        !isDataLine(l);

                      // Track whether previous non-empty line was a blank (spot separator)
                      let prevWasBlank = false;
                      return lines.map((line, i) => {
                        const blank = line === "";
                        const el = (() => {
                          if (i === 0)
                            return <p key={i} className="font-semibold mb-2">{line}</p>;
                          if (blank)
                            return <div key={i} className="h-1" />;
                          if (SECTION_LABELS.has(line))
                            return <p key={i} className="font-semibold text-zinc-200 mt-1 mb-0.5">{line}</p>;
                          if (DAY_RE.test(line))
                            return <p key={i} className="font-semibold text-zinc-100 mt-3 pt-2 border-t border-zinc-700">{line}</p>;
                          if (isSpotName(line, i)) {
                            const cls = prevWasBlank
                              ? "font-semibold text-zinc-100 mt-1 pt-2 border-t border-zinc-700"
                              : "font-semibold text-zinc-100";
                            return <p key={i} className={cls}>{line}</p>;
                          }
                          return <p key={i} className="text-zinc-300 leading-snug">{line}</p>;
                        })();
                        prevWasBlank = blank;
                        return el;
                      });
                    })()
                  : msg.content}
              </div>
            </div>
          ))}

          {/* In-conversation no-data warning — shown after repeated no-data replies */}
          {showNoDataWarning && !isTyping && (
            <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-700/50 rounded-xl px-3 py-2.5 mx-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-amber-300 text-xs font-medium leading-snug">Conditions still haven't loaded</p>
                <p className="text-amber-500/80 text-xs mt-0.5 leading-snug">
                  Your spots don't have any conditions data yet. Refreshing may fix this.
                </p>
              </div>
              <button
                onClick={() => refreshMutation.mutate()}
                disabled={isRefreshDisabled}
                className="text-xs text-amber-400 hover:text-amber-200 font-medium shrink-0 flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-3 h-3 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                {refreshMutation.isPending ? "Refreshing…" : isRefreshOnCooldown ? "Just refreshed" : "Refresh"}
              </button>
            </div>
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3 text-emerald-400"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-3 py-2.5">
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area — locked for free users */}
        {proRequired ? (
          <div className="px-4 pt-4 pb-5 shrink-0 border-t border-zinc-800 flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2 text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-sm font-semibold text-white">Pro feature</span>
            </div>
            <p className="text-xs text-zinc-400 leading-snug max-w-[260px]">
              The Live Swell Agent is available on the Pro plan. Upgrade to ask questions about your spots, conditions, and when to paddle out.
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
          <div className="px-3 pb-safe-area-inset-bottom shrink-0 border-t border-zinc-800 pb-3 pt-2">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about surf conditions…"
                rows={1}
                className="flex-1 resize-none bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 rounded-xl text-sm py-2.5 focus:ring-1 focus:ring-emerald-500 min-h-[40px] max-h-[120px] overflow-y-auto"
                disabled={chatMutation.isPending}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || chatMutation.isPending}
                className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 text-white"
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </div>
            <p className="text-center text-zinc-600 text-[10px] mt-1.5">Enter to send · Shift+Enter for new line</p>
          </div>
        )}
      </div>
    </>
  );
}
