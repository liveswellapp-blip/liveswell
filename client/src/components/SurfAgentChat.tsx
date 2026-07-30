import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  pending?: boolean;
}

const QUICK_PROMPTS = [
  "How are my spots looking today?",
  "Best window this week?",
  "Compare my spots for tomorrow",
  "What should I wear in the water?",
];

export default function SurfAgentChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  const { data: history = [], isLoading: historyLoading } = useQuery<Message[]>({
    queryKey: ["/api/agent/history"],
    enabled: open,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const { data: freshness } = useQuery<{ oldestUpdatedAt: string | null }>({
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

  // Focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const isEmpty = allMessages.length === 0 && !historyLoading;

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
        style={{ height: open ? "min(85dvh, 640px)" : undefined }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-emerald-400"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">Surf Coach</p>
              {freshnessLabel ? (
                <p className={`text-xs mt-0.5 ${isStale ? "text-amber-500" : "text-zinc-500"}`}>
                  {freshnessLabel}{isStale ? " · may be outdated" : ""}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 mt-0.5">AI · knows your spots</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
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
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-8 h-8 text-emerald-400"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white font-medium text-sm">Hey, I'm your surf coach</p>
                <p className="text-zinc-500 text-xs mt-1">Ask me about your spots, conditions, or when to paddle out</p>
              </div>
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
              {msg.role === "assistant" && (
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
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-br-sm"
                    : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
                } ${msg.pending ? "opacity-70" : ""}`}
              >
                {msg.content}
              </div>
            </div>
          ))}

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

        {/* Input area */}
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
      </div>
    </>
  );
}
