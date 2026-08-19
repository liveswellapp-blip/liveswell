/**
 * Whop subscription routes and middleware.
 *
 * Endpoints:
 *   POST /api/whop/checkout       — create a hosted checkout URL for a plan
 *   GET  /api/whop/subscription   — current user's Pro status
 *   POST /api/whop/webhook        — Whop membership lifecycle events
 *
 * Middleware:
 *   requirePro  — 402 when the authenticated user is not on the Pro plan
 *
 * Security notes:
 *   - Webhook signature is verified using the raw request bytes (req.rawBody),
 *     not JSON.stringify(req.body), to avoid serialization-mismatch rejections.
 *   - WHOP_WEBHOOK_SECRET is required in production; the server rejects unsigned
 *     events in production even if the env var is absent.
 *   - Checkout only accepts plan IDs that match WHOP_MONTHLY_PLAN_ID or
 *     WHOP_ANNUAL_PLAN_ID; the webhook additionally confirms the activated
 *     membership's plan is in the same allowlist before granting Pro status.
 */

import type { Express, Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { isAuthenticated } from './auth';
import { getWhopClient } from './whopClient';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';
import { z } from 'zod';
import { activateWhopMembership, transitionProStatus } from './pro-transitions';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the set of Whop plan IDs this app sells.
 * Throws when neither plan ID is configured — callers must treat an empty
 * allowlist as a hard error, never as "allow all".
 */
function getAllowedPlanIds(): Set<string> {
  const ids = new Set<string>();
  if (process.env.WHOP_MONTHLY_PLAN_ID) ids.add(process.env.WHOP_MONTHLY_PLAN_ID);
  if (process.env.WHOP_ANNUAL_PLAN_ID)  ids.add(process.env.WHOP_ANNUAL_PLAN_ID);
  return ids;
}

function planLabel(planId: string): 'monthly' | 'annual' | null {
  if (process.env.WHOP_MONTHLY_PLAN_ID && planId === process.env.WHOP_MONTHLY_PLAN_ID) return 'monthly';
  if (process.env.WHOP_ANNUAL_PLAN_ID  && planId === process.env.WHOP_ANNUAL_PLAN_ID)  return 'annual';
  return null;
}

/**
 * Returns the canonical application origin from trusted environment variables.
 * Uses APP_URL first, then the Replit-injected REPLIT_DEV_DOMAIN.
 * Never reads from request headers — those are user-controlled.
 */
function getAppOrigin(): string | null {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return null;
}

/** Active-ish statuses that indicate the user has current access. */
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'canceling']);

const isProduction = process.env.NODE_ENV === 'production';

function isWhopNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: number; statusCode?: number; code?: string };
  return candidate.status === 404 ||
    candidate.statusCode === 404 ||
    candidate.code === 'not_found';
}

async function retrieveCanonicalMembership(membershipId: string): Promise<any | null> {
  try {
    const client = await getWhopClient();
    return await client.memberships.retrieve(membershipId);
  } catch (error) {
    if (isWhopNotFound(error)) return null;
    throw error;
  }
}

async function verifyCanonicalMembershipActive(
  membershipId: string,
  expectedClerkUserId: string,
): Promise<boolean> {
  const membership = await retrieveCanonicalMembership(membershipId);
  const planId: string | undefined = membership?.plan?.id;
  return Boolean(
    membership &&
    ACTIVE_STATUSES.has(membership.status) &&
    planId &&
    getAllowedPlanIds().has(planId) &&
    membership.metadata?.clerk_user_id === expectedClerkUserId,
  );
}

async function verifyCanonicalMembershipInactive(membershipId: string): Promise<boolean> {
  const membership = await retrieveCanonicalMembership(membershipId);
  return !membership || !ACTIVE_STATUSES.has(membership.status);
}

export class WhopCheckoutError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function createWhopCheckoutForPlanId(userId: string, planId: string): Promise<{ purchaseUrl: string }> {
  const [existingUser] = await db
    .select({ isPro: users.isPro })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (existingUser?.isPro) {
    throw new WhopCheckoutError(409, 'already_subscribed', 'You already have active Pro access.');
  }

  const allowedPlanIds = getAllowedPlanIds();
  if (allowedPlanIds.size === 0) {
    throw new WhopCheckoutError(503, 'whop_catalog_unavailable', 'Whop subscription plans are not configured.');
  }
  if (!allowedPlanIds.has(planId)) {
    throw new WhopCheckoutError(400, 'invalid_plan', 'Invalid Whop plan.');
  }

  const appOrigin = getAppOrigin();
  if (!appOrigin) {
    throw new WhopCheckoutError(503, 'app_url_unavailable', 'Application URL is not configured.');
  }
  const client = await getWhopClient();
  const config = await client.checkoutConfigurations.create({
    plan_id: planId,
    redirect_url: `${appOrigin}/pricing?success=true`,
    metadata: { clerk_user_id: userId },
  });
  if (!config.purchase_url) {
    throw new WhopCheckoutError(502, 'whop_checkout_incomplete', 'Whop did not return a purchase URL.');
  }
  return { purchaseUrl: config.purchase_url };
}

export async function createWhopCheckoutForPlan(
  userId: string,
  plan: 'monthly' | 'annual',
): Promise<{ purchaseUrl: string }> {
  const planId =
    plan === 'monthly' ? process.env.WHOP_MONTHLY_PLAN_ID : process.env.WHOP_ANNUAL_PLAN_ID;
  if (!planId) {
    throw new WhopCheckoutError(503, 'whop_catalog_unavailable', `The ${plan} Whop plan is not configured.`);
  }
  return createWhopCheckoutForPlanId(userId, planId);
}

// ─── requirePro middleware ───────────────────────────────────────────────────

/**
 * Express middleware that blocks unauthenticated or free-plan users with 402.
 * Must be placed after Clerk middleware (isAuthenticated) in the route chain.
 */
export async function requirePro(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  try {
    const [user] = await db
      .select({ isPro: users.isPro })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.isPro) {
      next();
      return;
    }
  } catch (err) {
    console.error('[requirePro] DB error:', err);
  }

  res.status(402).json({ error: 'pro_required', upgradeUrl: '/pricing' });
}

// ─── route registration ──────────────────────────────────────────────────────

export function registerWhopRoutes(app: Express): void {

  // ── POST /api/whop/checkout ────────────────────────────────────────────────
  // Creates a Whop checkout configuration for the given plan and returns the
  // hosted purchase_url.  Only plan IDs in the configured allowlist are accepted.
  app.post('/api/whop/checkout', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = z.object({ planId: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'planId is required' });
      }

      const { userId } = getAuth(req);
      const { planId } = parsed.data;

      return res.json(await createWhopCheckoutForPlanId(userId!, planId));
    } catch (err) {
      if (err instanceof WhopCheckoutError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      console.error('[whop/checkout] Error:', err);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // ── GET /api/whop/subscription ─────────────────────────────────────────────
  // Returns the authenticated user's current Pro status.
  // Fast path: reads isPro from the local DB (populated via webhook).
  // Live path: if a whopMembershipId is stored, re-fetches it from Whop and
  //            syncs the DB, so stale cached state is corrected.
  app.get('/api/whop/subscription', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);

      const [user] = await db
        .select({
          isPro:            users.isPro,
          paidPro:          users.paidPro,
          complimentaryPro: users.complimentaryPro,
          isTestAccount:    users.isTestAccount,
          whopMembershipId: users.whopMembershipId,
        })
        .from(users)
        .where(eq(users.id, userId!))
        .limit(1);

      if (!user) {
        return res.json({ isPro: false, plan: null, renewsAt: null });
      }

      // Fast path — no membership ID, trust cached flag
      if (!user.whopMembershipId) {
        return res.json({
          isPro:    user.isPro,
          plan:     null,
          renewsAt: null,
        });
      }

      // Live path — verify current status with Whop.
      // The timeout races the ENTIRE chain — including getWhopClient() which
      // performs the connector credential fetch (up to 10 s on a cold client).
      // Starting the timer before the chain ensures the 5-second budget is
      // enforced end-to-end, not just for the memberships.retrieve() call.
      const LIVE_TIMEOUT_MS = 5_000;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let membership: any = null;
      let whopCallFailed = false;

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Whop API timeout')),
          LIVE_TIMEOUT_MS,
        );
      });

      try {
        membership = await Promise.race([
          getWhopClient().then(client =>
            client.memberships.retrieve(user.whopMembershipId!),
          ),
          timeoutPromise,
        ]);
      } catch (whopErr) {
        whopCallFailed = true;
        console.warn('[whop/subscription] Whop API error or timeout, falling back to cached DB value:', whopErr);
      } finally {
        clearTimeout(timeoutId);
      }

      if (whopCallFailed || !membership) {
        // Whop was unreachable or timed out.
        // Trust the DB isPro flag — never show "Free" to a user whose DB row
        // says isPro=true just because the upstream had a transient issue.
        return res.json({
          isPro:    user.isPro,
          plan:     null,
          renewsAt: null,
        });
      }

      const isActive = ACTIVE_STATUSES.has(membership.status);

      // Sync DB if status changed (catches missed/delayed webhooks).
      // transitionProStatus conditions the UPDATE on the prior isPro value
      // and inserts the audit event in the same transaction.
      // Only sync on confirmed deactivation — never downgrade based on a
      // transient or ambiguous Whop response (handled above by whopCallFailed).
      if (isActive !== user.paidPro) {
        await transitionProStatus(userId!, isActive, 'whop', {
          extraPayload: { via: 'subscription_reconciliation', membershipId: user.whopMembershipId },
          expectedWhopMembershipId: user.whopMembershipId,
        });
      }

      const planId = (membership as any).plan?.id as string | undefined;

      // If the DB said isPro=true but Whop's live call says inactive, we
      // return the live value (and have already synced the DB above).  This is
      // a genuine deactivation, not a transient error.
      // If the DB said isPro=false but Whop says active, the live value wins.
      return res.json({
        isPro:    isActive || user.complimentaryPro || user.isTestAccount,
        plan:     planId ? planLabel(planId) : null,
        renewsAt: (membership as any).renewal_period_end ?? null,
      });
    } catch (err) {
      console.error('[whop/subscription] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
  });

  // ── POST /api/whop/webhook ─────────────────────────────────────────────────
  // Handles Whop membership lifecycle events and caches Pro status in the DB.
  //
  // Signature verification uses req.rawBody (the unmodified request bytes
  // captured by the verify callback in the global express.json() setup) to
  // prevent serialisation-mismatch false-negatives.
  //
  // WHOP_WEBHOOK_SECRET is always required — there is no unsigned fallback.
  // When absent the endpoint returns 503 (misconfigured, not attacker-facing)
  // so operators know to provision the secret before events can be processed.
  app.post('/api/whop/webhook', async (req: Request, res: Response) => {
    try {
      const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

      // Fail closed unconditionally — no dev/test bypass for an
      // entitlement-granting endpoint.
      if (!webhookSecret) {
        console.error('[whop/webhook] WHOP_WEBHOOK_SECRET is not configured. All webhook events are rejected until the secret is provisioned.');
        return res.status(503).json({ error: 'Webhook secret not configured — set WHOP_WEBHOOK_SECRET' });
      }

      // Use the raw body bytes captured before express.json() parsed the
      // request; this is the string Whop signed, so it must be passed verbatim.
      const rawBody: string = (req as any).rawBody ?? JSON.stringify(req.body);

      let event: any;
      try {
        const client = await getWhopClient();
        event = client.webhooks.unwrap(rawBody, {
          headers: req.headers as Record<string, string>,
          key:     webhookSecret,
        });
      } catch (sigErr) {
        console.warn('[whop/webhook] Signature verification failed:', sigErr);
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      if (!event) {
        return res.status(400).json({ error: 'Empty webhook event' });
      }

      const eventType: string = (event as any).action ?? (event as any).type ?? '';
      console.log(`[whop/webhook] Received event: ${eventType}`);

      // ── membership.activated (went_valid) ──────────────────────────────────
      if (eventType === 'membership.activated') {
        const eventMembership = (event as any).data;
        if (!eventMembership?.id) {
          return res.status(400).json({ error: 'Missing membership data' });
        }

        // Guard: only grant Pro for memberships on an allowed plan.
        // An empty allowlist (env vars not set) is a misconfiguration — never
        // fall through to granting Pro for arbitrary plans.
        const allowedPlanIds = getAllowedPlanIds();
        if (allowedPlanIds.size === 0) {
          console.error('[whop/webhook] membership.activated: no plan IDs configured — refusing to grant Pro. Set WHOP_MONTHLY_PLAN_ID and/or WHOP_ANNUAL_PLAN_ID.');
          return res.status(503).json({ error: 'Subscription plans not configured' });
        }
        const membership = await retrieveCanonicalMembership(eventMembership.id);
        if (!membership || !ACTIVE_STATUSES.has(membership.status)) {
          console.warn(`[whop/webhook] membership.activated: ${eventMembership.id} is not currently active — ignoring stale event.`);
          return res.json({ received: true });
        }
        const membershipPlanId: string | undefined = membership.plan?.id;
        if (!membershipPlanId || !allowedPlanIds.has(membershipPlanId)) {
          console.warn(`[whop/webhook] membership.activated: missing or unlisted plan ${membershipPlanId ?? '(missing)'} — ignoring.`);
          return res.json({ received: true });
        }

        // The Clerk user ID is carried in the checkout configuration metadata.
        const clerkUserId: string | undefined =
          membership.metadata?.clerk_user_id ?? eventMembership.metadata?.clerk_user_id;
        if (!clerkUserId) {
          console.warn('[whop/webhook] membership.activated: no clerk_user_id in metadata, skipping DB update');
          return res.json({ received: true });
        }

        // activateWhopMembership upserts the user row (in case they haven't
        // called /api/auth/user yet) and then conditionally grants Pro — all
        // inside a single transaction.  The conditional UPDATE is gated on
        // isPro=false so concurrent/retried deliveries of the same event only
        // ever record one pro_granted entry.
        const { changed } = await activateWhopMembership(
          clerkUserId,
          membership.id,
          (membershipId) => verifyCanonicalMembershipActive(membershipId, clerkUserId),
        );
        console.log(
          changed
            ? `[whop/webhook] Set isPro=true for ${clerkUserId} (membership ${membership.id})`
            : `[whop/webhook] membership.activated: ${clerkUserId} was already Pro — skipped duplicate event`,
        );
      }

      // ── membership.deactivated (went_invalid) ──────────────────────────────
      else if (eventType === 'membership.deactivated') {
        const membership = (event as any).data;
        if (!membership?.id) {
          return res.status(400).json({ error: 'Missing membership data' });
        }
        const canonicalMembership = await retrieveCanonicalMembership(membership.id);
        if (canonicalMembership && ACTIVE_STATUSES.has(canonicalMembership.status)) {
          console.warn(`[whop/webhook] membership.deactivated: ${membership.id} is currently active — ignoring stale event.`);
          return res.json({ received: true });
        }

        // Look up user by the stored membership ID so we have their primary key.
        const [target] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.whopMembershipId, membership.id))
          .limit(1);

        if (target) {
          // transitionProStatus conditions the UPDATE on isPro=true, so
          // idempotent re-deliveries return { changed: false } without writing.
          const { changed } = await transitionProStatus(target.id, false, 'whop', {
            extraPayload: { membershipId: membership.id },
            expectedWhopMembershipId: membership.id,
            verifyWhopInactiveAfterLock: verifyCanonicalMembershipInactive,
          });
          if (changed) {
            console.log(`[whop/webhook] Set isPro=false for ${target.id} (membership ${membership.id})`);
          } else {
            console.warn(`[whop/webhook] membership.deactivated: ${target.id} was already not-Pro — skipped duplicate event`);
          }
        } else {
          console.warn(`[whop/webhook] membership.deactivated: no local user found for membership ${membership.id}`);
        }
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('[whop/webhook] Unhandled error:', err);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
}

// Log a startup warning when WHOP_WEBHOOK_SECRET is absent so operators know
// to provision it before going live — call this once during route registration.
export function logWhopStartupWarnings(): void {
  if (!process.env.WHOP_WEBHOOK_SECRET) {
    console.warn('[whop] ⚠️  WHOP_WEBHOOK_SECRET is not set. The webhook endpoint will reject all events until the secret is configured. Obtain it from the Whop dashboard → Developer → Webhooks and set it as a Replit secret.');
  }
  if (!process.env.WHOP_MONTHLY_PLAN_ID && !process.env.WHOP_ANNUAL_PLAN_ID) {
    console.warn('[whop] ⚠️  Neither WHOP_MONTHLY_PLAN_ID nor WHOP_ANNUAL_PLAN_ID is set. Checkout and webhook activation are disabled until at least one plan ID is configured.');
  }
}
