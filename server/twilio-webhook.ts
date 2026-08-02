/**
 * Inbound SMS webhook handler for two-way SMS with the surf agent.
 *
 * Route: POST /api/twilio/incoming
 * - Validates the Twilio request signature
 * - Handles STOP / UNSUBSCRIBE / HELP keywords before the agent
 * - Looks up the user by verified phone number
 * - Loads / saves per-phone SMS conversation history (24-hour window)
 * - Calls the surf agent and formats the reply for SMS (<= 320 chars)
 * - Responds with TwiML
 */

import type { Request, Response } from "express";
import twilio from "twilio";
import { db } from "./db";
import { agentSmsThreads, verifiedPhones as verifiedPhonesTable, userAlerts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "./storage";
import { runSurfAgent, type AgentMessage } from "./surf-agent";
import { normalizePhone } from "./sms-service";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// ---------------------------------------------------------------------------
// Keyword constants
// ---------------------------------------------------------------------------
const STOP_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const HELP_KEYWORDS = new Set(["HELP", "INFO"]);

const HELP_REPLY =
  "LiveSwell SMS Tips:\n" +
  "• Reply with any question about your spots\n" +
  "• \"How are conditions at [spot]?\"\n" +
  "• \"Is it worth going out tomorrow?\"\n" +
  "Reply STOP to unsubscribe.";

const STOP_REPLY =
  "You've been unsubscribed from LiveSwell SMS alerts. " +
  "Reply START to re-subscribe anytime.";

const UNKNOWN_REPLY =
  "Hi! Your number isn't linked to a LiveSwell account. " +
  "Sign up at liveswell.io to get surf alerts and use this feature.";

// ---------------------------------------------------------------------------
// SMS formatter
// ---------------------------------------------------------------------------
const MAX_SMS_CHARS = 320; // 2 segments

function formatSmsReply(text: string, isFirstContact: boolean): string {
  // Strip markdown
  let clean = text
    .replace(/\*\*(.*?)\*\*/g, "$1")  // bold
    .replace(/\*(.*?)\*/g, "$1")       // italic
    .replace(/`(.*?)`/g, "$1")         // code
    .replace(/#{1,6}\s/g, "")          // headings
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // links
    .trim();

  const suffix = isFirstContact ? "\n\nReply HELP for tips." : "";
  const budget = MAX_SMS_CHARS - suffix.length;

  if (clean.length > budget) {
    // Trim to last complete sentence within budget
    const trimmed = clean.slice(0, budget);
    const lastPeriod = Math.max(
      trimmed.lastIndexOf(". "),
      trimmed.lastIndexOf("! "),
      trimmed.lastIndexOf("? "),
    );
    clean = lastPeriod > 100 ? trimmed.slice(0, lastPeriod + 1) : trimmed;
  }

  return clean + suffix;
}

// ---------------------------------------------------------------------------
// SMS thread storage helpers
// ---------------------------------------------------------------------------
async function getSmsThread(phone: string): Promise<AgentMessage[]> {
  const [row] = await db
    .select()
    .from(agentSmsThreads)
    .where(eq(agentSmsThreads.phoneNumber, phone))
    .limit(1);

  if (!row) return [];

  // Filter to 24-hour window
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const messages = (row.messages as Array<AgentMessage & { ts: number }>);
  return messages.filter((m) => !m.ts || m.ts > cutoff);
}

async function appendSmsThread(
  phone: string,
  additions: Array<AgentMessage & { ts?: number }>,
): Promise<void> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  const [row] = await db
    .select()
    .from(agentSmsThreads)
    .where(eq(agentSmsThreads.phoneNumber, phone))
    .limit(1);

  const existing = row
    ? (row.messages as Array<AgentMessage & { ts: number }>).filter((m) => m.ts > cutoff)
    : [];

  const updated = [...existing, ...additions.map((m) => ({ ...m, ts: m.ts ?? Date.now() }))];

  if (row) {
    await db
      .update(agentSmsThreads)
      .set({ messages: updated, updatedAt: new Date() })
      .where(eq(agentSmsThreads.phoneNumber, phone));
  } else {
    await db
      .insert(agentSmsThreads)
      .values({ phoneNumber: phone, messages: updated, updatedAt: new Date() });
  }
}

// ---------------------------------------------------------------------------
// Look up user by verified phone number
// ---------------------------------------------------------------------------
async function lookupUserByPhone(phone: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: verifiedPhonesTable.userId })
    .from(verifiedPhonesTable)
    .where(eq(verifiedPhonesTable.phone, phone))
    .limit(1);
  return row?.userId ?? null;
}

// ---------------------------------------------------------------------------
// Handle STOP: deactivate all SMS alert channels for this user
// ---------------------------------------------------------------------------
async function handleStop(userId: string): Promise<void> {
  // Pull all active alerts for the user that include 'sms' as a channel
  const alerts = await storage.getUserAlerts(userId);
  for (const alert of alerts) {
    if (!alert.active) continue;
    const channels: string[] = alert.deliveryChannels ?? [];
    if (!channels.includes("sms")) continue;

    const remaining = channels.filter((c) => c !== "sms");
    await storage.updateUserAlert(alert.id, userId, {
      deliveryChannels: remaining,
      active: remaining.length > 0 ? alert.active : false,
    });
  }
}

// ---------------------------------------------------------------------------
// TwiML response helper
// ---------------------------------------------------------------------------
function twimlReply(res: Response, message: string): void {
  res.type("text/xml");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`,
  );
}

function twimlEmpty(res: Response): void {
  res.type("text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---------------------------------------------------------------------------
// Main webhook handler
// ---------------------------------------------------------------------------
export async function handleIncomingSms(req: Request, res: Response): Promise<void> {
  // ── 1. Validate Twilio signature ────────────────────────────────────────
  if (authToken) {
    const twilioSignature = req.headers["x-twilio-signature"] as string | undefined;
    const protocol = req.headers["x-forwarded-proto"] ?? req.protocol;
    const host = req.headers["host"];
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    const isValid = twilio.validateRequest(authToken, twilioSignature ?? "", fullUrl, req.body);
    if (!isValid) {
      console.warn("⚠️  Twilio signature validation failed — rejecting inbound SMS");
      res.status(403).send("Forbidden");
      return;
    }
  } else {
    console.warn("⚠️  TWILIO_AUTH_TOKEN not set — skipping signature validation");
  }

  // ── 2. Parse Twilio body ─────────────────────────────────────────────────
  const from: string = normalizePhone(req.body?.From ?? "");
  const body: string = (req.body?.Body ?? "").trim();

  if (!from || !body) {
    twimlEmpty(res);
    return;
  }

  const keyword = body.toUpperCase().split(/\s+/)[0];

  // ── 3. HELP keyword ──────────────────────────────────────────────────────
  if (HELP_KEYWORDS.has(keyword)) {
    twimlReply(res, HELP_REPLY);
    return;
  }

  // ── 4. STOP / UNSUBSCRIBE keyword ────────────────────────────────────────
  if (STOP_KEYWORDS.has(keyword)) {
    const userId = await lookupUserByPhone(from);
    if (userId) {
      try {
        await handleStop(userId);
      } catch (err) {
        console.error("Error processing STOP for user", userId, err);
      }
    }
    // Twilio itself handles carrier-level opt-outs; we still acknowledge
    twimlReply(res, STOP_REPLY);
    return;
  }

  // ── 5. Look up user by phone ─────────────────────────────────────────────
  const userId = await lookupUserByPhone(from);
  if (!userId) {
    twimlReply(res, UNKNOWN_REPLY);
    return;
  }

  // ── 5a. Inbound rate limit (10 req / 10 min per phone) ───────────────────
  const withinLimit = await storage.checkAndRecordInboundSmsRateLimit(userId, from);
  if (!withinLimit) {
    console.warn(`⚠️  Inbound SMS rate limit exceeded for phone ${from} (userId ${userId})`);
    twimlReply(
      res,
      "You're sending messages too quickly. Please wait a few minutes and try again.",
    );
    return;
  }

  // ── 6. Load conversation thread ──────────────────────────────────────────
  const history = await getSmsThread(from);
  const isFirstContact = history.length === 0;

  // ── 7. Run surf agent ────────────────────────────────────────────────────
  let agentReply: string;
  try {
    agentReply = await runSurfAgent(userId, body, history);
  } catch (err) {
    console.error("Surf agent error for SMS from", from, err);
    agentReply = "Sorry, I couldn't fetch conditions right now. Try again in a moment!";
  }

  // ── 8. Format for SMS ────────────────────────────────────────────────────
  const smsText = formatSmsReply(agentReply, isFirstContact);

  // ── 9. Persist thread ────────────────────────────────────────────────────
  const now = Date.now();
  await appendSmsThread(from, [
    { role: "user", content: body, ts: now } as any,
    { role: "assistant", content: agentReply, ts: now + 1 } as any,
  ]);

  // ── 10. Reply via TwiML ──────────────────────────────────────────────────
  twimlReply(res, smsText);
}
