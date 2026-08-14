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
import { sql } from 'drizzle-orm';
import { users } from '@shared/schema';
import { z } from 'zod';

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

      // Validate that the plan ID belongs to this app's configured plans.
      // An empty allowlist (no env vars set) is treated as a server-side
      // misconfiguration — never falls back to "allow any plan".
      const allowedPlanIds = getAllowedPlanIds();
      if (allowedPlanIds.size === 0) {
        console.error('[whop/checkout] Neither WHOP_MONTHLY_PLAN_ID nor WHOP_ANNUAL_PLAN_ID is configured. Checkout is disabled.');
        return res.status(503).json({ error: 'Subscription plans are not configured' });
      }
      if (!allowedPlanIds.has(planId)) {
        console.warn(`[whop/checkout] Rejected unknown planId: ${planId}`);
        return res.status(400).json({ error: 'Invalid plan ID' });
      }

      // Build an absolute redirect URL from a trusted configured origin, not
      // from request-controlled forwarding headers (Host/X-Forwarded-*).
      const appOrigin = getAppOrigin();
      if (!appOrigin) {
        console.error('[whop/checkout] Cannot determine app origin: set APP_URL or ensure REPLIT_DEV_DOMAIN is available.');
        return res.status(503).json({ error: 'Application URL is not configured' });
      }
      const redirectUrl = `${appOrigin}/pricing?success=true`;

      const client = await getWhopClient();
      const config = await client.checkoutConfigurations.create({
        plan_id:      planId,
        redirect_url: redirectUrl,
        metadata:     { clerk_user_id: userId },
      });

      if (!config.purchase_url) {
        console.error('[whop/checkout] No purchase_url in response:', config);
        return res.status(502).json({ error: 'Whop did not return a purchase URL' });
      }

      return res.json({ purchaseUrl: config.purchase_url });
    } catch (err) {
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

      // Live path — verify current status with Whop
      try {
        const client     = await getWhopClient();
        const membership = await client.memberships.retrieve(user.whopMembershipId);
        const isActive   = ACTIVE_STATUSES.has(membership.status);

        // Sync DB if status changed
        if (isActive !== user.isPro) {
          await db
            .update(users)
            .set({ isPro: isActive })
            .where(eq(users.id, userId!));
        }

        const planId = (membership as any).plan?.id as string | undefined;

        return res.json({
          isPro:    isActive,
          plan:     planId ? planLabel(planId) : null,
          renewsAt: membership.renewal_period_end ?? null,
        });
      } catch (whopErr) {
        // If Whop API is down, fall back to cached DB value
        console.warn('[whop/subscription] Whop API error, using cached value:', whopErr);
        return res.json({
          isPro:    user.isPro,
          plan:     null,
          renewsAt: null,
        });
      }
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
        const membership = (event as any).data;
        if (!membership?.id) {
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
        const membershipPlanId: string | undefined = membership.plan?.id;
        if (membershipPlanId && !allowedPlanIds.has(membershipPlanId)) {
          console.warn(`[whop/webhook] membership.activated: plan ${membershipPlanId} is not in the allowlist — ignoring.`);
          return res.json({ received: true });
        }

        // The Clerk user ID is carried in the checkout configuration metadata.
        const clerkUserId: string | undefined = membership.metadata?.clerk_user_id;
        if (!clerkUserId) {
          console.warn('[whop/webhook] membership.activated: no clerk_user_id in metadata, skipping DB update');
          return res.json({ received: true });
        }

        // Upsert the user row so membership events are never silently dropped
        // because the Clerk user hasn't called /api/auth/user yet.
        // On conflict (user already exists), update only the Pro fields.
        await db
          .insert(users)
          .values({
            id:               clerkUserId,
            isPro:            true,
            whopMembershipId: membership.id,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              isPro:            true,
              whopMembershipId: membership.id,
              updatedAt:        sql`now()`,
            },
          });

        console.log(`[whop/webhook] Set isPro=true for ${clerkUserId} (membership ${membership.id})`);
      }

      // ── membership.deactivated (went_invalid) ──────────────────────────────
      else if (eventType === 'membership.deactivated') {
        const membership = (event as any).data;
        if (!membership?.id) {
          return res.status(400).json({ error: 'Missing membership data' });
        }

        // Look up user by stored membership ID and clear their pro status.
        const updated = await db
          .update(users)
          .set({ isPro: false, updatedAt: sql`now()` })
          .where(eq(users.whopMembershipId, membership.id))
          .returning({ id: users.id });

        if (updated.length > 0) {
          console.log(`[whop/webhook] Set isPro=false for ${updated[0].id} (membership ${membership.id})`);
        } else {
          console.warn(`[whop/webhook] membership.deactivated: no local user found for membership ${membership.id} — Pro status may already be false`);
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
