/**
 * pro-transitions.ts
 *
 * Single authoritative helper for all Pro status changes.
 *
 * Every grant/revoke MUST go through `transitionProStatus` so the users row
 * update and the audit event always commit together — or both roll back.  If
 * the event INSERT fails the Pro update is rolled back too, so the caller
 * (e.g. a Whop webhook handler) can safely return a 5xx and let the delivery
 * platform retry.
 *
 * `isPro` is the union of paid, complimentary, and test entitlements. Source
 * changes lock the user row and mutate only their own entitlement, so one
 * provider can never revoke access owned by another source.
 */

import { db } from "./db";
import { users, userEvents } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export type ProSource = "whop" | "stripe" | "comp" | "test";

export interface TransitionResult {
  /** true when this source's entitlement actually changed */
  changed: boolean;
}

/**
 * Atomically changes one source entitlement, derives `users.isPro`, and records
 * the matching source grant/revoke event in `user_events`.
 *
 * Both writes happen inside a single DB transaction.
 *
 * @param extraSet     Additional columns to set on the users row when the
 *                     state actually changes (e.g. `{ whopMembershipId }`).
 * @param extraPayload Additional fields merged into the event payload.
 */
export async function transitionProStatus(
  userId: string,
  newIsPro: boolean,
  source: ProSource,
  {
    extraSet,
    extraPayload,
    expectedWhopMembershipId,
  }: {
    extraSet?: Record<string, unknown>;
    extraPayload?: Record<string, unknown>;
    expectedWhopMembershipId?: string;
  } = {},
): Promise<TransitionResult> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        paidPro: users.paidPro,
        complimentaryPro: users.complimentaryPro,
        isTestAccount: users.isTestAccount,
        billingProvider: users.billingProvider,
        whopMembershipId: users.whopMembershipId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .for("update");

    if (!current) return { changed: false };
    if (source === "stripe") {
      throw new Error("Stripe entitlement changes must use reconcileStripeSubscription.");
    }

    let nextPaidPro = current.paidPro;
    let nextComplimentaryPro = current.complimentaryPro;
    let nextIsTestAccount = current.isTestAccount;
    const sourceSet: Record<string, unknown> = {};
    let sourceChanged = false;

    if (source === "comp") {
      sourceChanged = current.complimentaryPro !== newIsPro;
      nextComplimentaryPro = newIsPro;
      sourceSet.complimentaryPro = newIsPro;
    } else if (source === "test") {
      sourceChanged = current.isTestAccount !== newIsPro;
      nextIsTestAccount = newIsPro;
      sourceSet.isTestAccount = newIsPro;
    } else {
      // Whop may only change the paid entitlement if it currently owns it.
      if (!newIsPro && current.billingProvider !== "whop") {
        return { changed: false };
      }
      if (
        !newIsPro &&
        expectedWhopMembershipId &&
        current.whopMembershipId !== expectedWhopMembershipId
      ) {
        return { changed: false };
      }
      if (newIsPro && current.paidPro && current.billingProvider !== "whop") {
        return { changed: false };
      }
      sourceChanged = current.paidPro !== newIsPro;
      nextPaidPro = newIsPro;
      sourceSet.paidPro = newIsPro;
      if (newIsPro) sourceSet.billingProvider = "whop";
    }

    if (!sourceChanged) return { changed: false };

    const nextIsPro = nextPaidPro || nextComplimentaryPro || nextIsTestAccount;
    await tx
      .update(users)
      .set({
        ...sourceSet,
        isPro: nextIsPro,
        updatedAt: new Date(),
        ...(extraSet ?? {}),
      })
      .where(eq(users.id, userId));

    await tx.insert(userEvents).values({
      userId,
      type: newIsPro ? "pro_granted" : "pro_revoked",
      payload: { source, ...(extraPayload ?? {}) },
    });

    return { changed: true };
  });
}

/**
 * Variant for the Whop `membership.activated` webhook that must also upsert
 * a user row (the user may not have called /api/auth/user yet).
 *
 * Steps inside a single transaction:
 *   1. INSERT user with isPro=false, whopMembershipId — DO NOTHING on conflict
 *      so the row exists before step 2's UPDATE.
 *   2. Conditionally set isPro=true (WHERE isPro=false) and insert the event.
 *   3. Always ensure whopMembershipId is up-to-date (runs regardless of
 *      whether step 2 changed the Pro state).
 */
export async function activateWhopMembership(
  clerkUserId: string,
  membershipId: string,
): Promise<TransitionResult> {
  return db.transaction(async (tx) => {
    // Ensure the user row exists; preserve all existing columns on conflict.
    await tx
      .insert(users)
      .values({
        id: clerkUserId,
        isPro: false,
        paidPro: false,
        whopMembershipId: membershipId,
        billingProvider: "whop",
      })
      .onConflictDoNothing();

    const [current] = await tx
      .select({
        paidPro: users.paidPro,
        billingProvider: users.billingProvider,
      })
      .from(users)
      .where(eq(users.id, clerkUserId))
      .limit(1)
      .for("update");

    if (!current) return { changed: false };

    // A delayed legacy Whop activation must not take paid ownership from Stripe.
    if (current.paidPro && current.billingProvider !== "whop") {
      await tx
        .update(users)
        .set({ whopMembershipId: membershipId, updatedAt: new Date() })
        .where(eq(users.id, clerkUserId));
      return { changed: false };
    }

    if (current.paidPro) {
      await tx
        .update(users)
        .set({ whopMembershipId: membershipId, updatedAt: new Date() })
        .where(eq(users.id, clerkUserId));
      return { changed: false };
    }

    await tx
      .update(users)
      .set({
        isPro: true,
        paidPro: true,
        whopMembershipId: membershipId,
        billingProvider: "whop",
        updatedAt: new Date(),
      })
      .where(eq(users.id, clerkUserId));
    await tx.insert(userEvents).values({
      userId: clerkUserId,
      type: "pro_granted",
      payload: { source: "whop", membershipId },
    });

    return { changed: true };
  });
}

export interface StripeSubscriptionTransition {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  active: boolean;
  eventId?: string;
  /** Re-fetches canonical Stripe state after the user row is locked. */
  refreshAfterLock?: () => Promise<{
    customerId: string;
    subscriptionId: string;
    status: string;
    active: boolean;
  }>;
}

export interface StripeTransitionResult extends TransitionResult {
  /** true when another provider or a newer Stripe subscription owns access */
  ignored: boolean;
}

/**
 * Reconciles a verified Stripe subscription without disturbing access owned by
 * Whop, a complimentary grant, or a test account.
 *
 * Stale cancellation events are ignored unless their subscription ID still
 * matches the Stripe subscription currently stored on the user.
 */
export async function reconcileStripeSubscription(
  input: StripeSubscriptionTransition,
): Promise<StripeTransitionResult> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        isPro: users.isPro,
        paidPro: users.paidPro,
        complimentaryPro: users.complimentaryPro,
        isTestAccount: users.isTestAccount,
        billingProvider: users.billingProvider,
        stripeSubscriptionId: users.stripeSubscriptionId,
      })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1)
      .for("update");

    if (!current) {
      return { changed: false, ignored: true };
    }

    // Webhook callers refresh Stripe after acquiring the row lock. This closes
    // the retrieve-to-commit race where a cancellation could occur while an
    // older active handler was waiting to enter this transaction.
    const transition = input.refreshAfterLock
      ? { ...input, ...(await input.refreshAfterLock()) }
      : input;

    if (transition.active) {
      // Never let Stripe take ownership of access that is currently provided
      // by Whop, a complimentary grant, or a test account.
      if (current.paidPro && current.billingProvider !== "stripe") {
        return { changed: false, ignored: true };
      }

      if (current.paidPro) {
        // A delayed activation for an older subscription must not replace the
        // newer subscription that currently owns access.
        if (
          current.stripeSubscriptionId &&
          current.stripeSubscriptionId !== transition.subscriptionId
        ) {
          return { changed: false, ignored: true };
        }

        // Replayed activation/resumption: refresh references but do not emit a
        // duplicate pro_granted event.
        await tx
          .update(users)
          .set({
            isPro: true,
            stripeCustomerId: transition.customerId,
            stripeSubscriptionId: transition.subscriptionId,
            billingProvider: "stripe",
            updatedAt: new Date(),
          })
          .where(and(eq(users.id, input.userId), eq(users.billingProvider, "stripe")));
        return { changed: false, ignored: false };
      }

      const updated = await tx
        .update(users)
        .set({
          isPro: true,
          paidPro: true,
          stripeCustomerId: transition.customerId,
          stripeSubscriptionId: transition.subscriptionId,
          billingProvider: "stripe",
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, input.userId), eq(users.paidPro, false)))
        .returning({ id: users.id });

      if (updated.length === 0) {
        return { changed: false, ignored: true };
      }

      await tx.insert(userEvents).values({
        userId: input.userId,
        type: "pro_granted",
        payload: {
          source: "stripe",
          subscriptionId: transition.subscriptionId,
          status: transition.status,
          eventId: transition.eventId,
        },
      });
      return { changed: true, ignored: false };
    }

    // Only the current Stripe subscription may revoke Stripe-owned access.
    // This makes duplicate and out-of-order cancellation events harmless.
    if (
      current.billingProvider !== "stripe" ||
      current.stripeSubscriptionId !== transition.subscriptionId ||
      !current.paidPro
    ) {
      return { changed: false, ignored: true };
    }

    const updated = await tx
      .update(users)
      .set({
        isPro: current.complimentaryPro || current.isTestAccount,
        paidPro: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, input.userId),
          eq(users.paidPro, true),
          eq(users.billingProvider, "stripe"),
          eq(users.stripeSubscriptionId, transition.subscriptionId),
        ),
      )
      .returning({ id: users.id });

    if (updated.length === 0) {
      return { changed: false, ignored: false };
    }

    await tx.insert(userEvents).values({
      userId: input.userId,
      type: "pro_revoked",
      payload: {
        source: "stripe",
        subscriptionId: transition.subscriptionId,
        status: transition.status,
        eventId: transition.eventId,
      },
    });
    return { changed: true, ignored: false };
  });
}
