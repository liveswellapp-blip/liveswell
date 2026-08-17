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
 * Idempotency: the UPDATE is conditioned on the prior `isPro` value using a
 * WHERE clause.  If the state is already the target value the transaction
 * commits immediately with `{ changed: false }` and no rows are written.
 * PostgreSQL's row-level locking serialises concurrent requests that target
 * the same user, so only one transaction ever writes the event.
 */

import { db } from "./db";
import { users, userEvents } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export type ProSource = "whop" | "comp" | "test";

export interface TransitionResult {
  /** true when isPro was actually changed (false = already in target state) */
  changed: boolean;
}

/**
 * Atomically sets `users.isPro` to `newIsPro` for the given user and records
 * the matching `pro_granted` or `pro_revoked` event in `user_events`.
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
  }: {
    extraSet?: Record<string, unknown>;
    extraPayload?: Record<string, unknown>;
  } = {},
): Promise<TransitionResult> {
  return db.transaction(async (tx) => {
    // Conditional update — only fires when the current state differs from the
    // target.  PostgreSQL acquires a row-level lock before evaluating WHERE, so
    // a concurrent transaction that targets the same row waits here; after the
    // first commits with isPro=true the second's WHERE isPro=false fails and it
    // returns { changed: false } without inserting a duplicate event.
    const updated = await tx
      .update(users)
      .set({
        isPro: newIsPro,
        updatedAt: new Date(),
        ...(extraSet ?? {}),
      })
      .where(and(eq(users.id, userId), eq(users.isPro, !newIsPro)))
      .returning({ id: users.id });

    if (updated.length === 0) {
      return { changed: false };
    }

    // Event INSERT is inside the same transaction — it rolls back with the
    // users update if anything fails, so the history is never orphaned.
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
      .values({ id: clerkUserId, isPro: false, whopMembershipId: membershipId })
      .onConflictDoNothing();

    // Conditional grant — only when not already Pro.
    const updated = await tx
      .update(users)
      .set({ isPro: true, whopMembershipId: membershipId, updatedAt: new Date() })
      .where(and(eq(users.id, clerkUserId), eq(users.isPro, false)))
      .returning({ id: users.id });

    if (updated.length > 0) {
      await tx.insert(userEvents).values({
        userId: clerkUserId,
        type: "pro_granted",
        payload: { source: "whop", membershipId },
      });
    } else {
      // User was already Pro — still keep whopMembershipId current.
      await tx
        .update(users)
        .set({ whopMembershipId: membershipId })
        .where(eq(users.id, clerkUserId));
    }

    return { changed: updated.length > 0 };
  });
}
