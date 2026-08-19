import { and, desc, eq, gte, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { billingHourlyMetrics, billingOperationalEvents } from "@shared/schema";
import { db } from "./db";
import { logError } from "./monitoring";
import { Sentry } from "./sentry";
import { safeLogger } from "./safe-logging";

export type BillingOperationStatus = "success" | "failure" | "ignored";

export interface BillingOperationInput {
  operation: string;
  status: BillingOperationStatus;
  provider?: "stripe" | "whop";
  userId?: string | null;
  eventId?: string | null;
  objectId?: string | null;
  code?: string | null;
  unexpectedError?: boolean;
}

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const RETENTION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastRetentionCheckAt = 0;

export type CheckoutOutcome = "success" | "technical_failure";

interface NormalizedBillingOperation {
  operation: string;
  status: BillingOperationStatus;
  provider: "stripe" | "whop";
  userId: string | null;
  eventId: string | null;
  objectId: string | null;
  code: string | null;
  unexpectedError: boolean;
}

function safeIdentifier(value: string | null | undefined, fallback: string | null = null): string | null {
  if (!value) return fallback;
  return /^[A-Za-z0-9_.:-]{1,128}$/.test(value) ? value : fallback;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalize(input: BillingOperationInput): NormalizedBillingOperation {
  return {
    operation: safeIdentifier(input.operation, "unknown")!,
    status: input.status,
    provider: input.provider ?? "stripe",
    userId: safeIdentifier(input.userId),
    eventId: safeIdentifier(input.eventId),
    objectId: safeIdentifier(input.objectId),
    code: safeIdentifier(input.code),
    unexpectedError: Boolean(input.unexpectedError),
  };
}

async function pruneExpiredBillingOperations(now: number): Promise<void> {
  if (now - lastRetentionCheckAt < RETENTION_CHECK_INTERVAL_MS) return;
  lastRetentionCheckAt = now;
  try {
    await db
      .delete(billingOperationalEvents)
      .where(
        and(
          lt(billingOperationalEvents.createdAt, new Date(now - RETENTION_MS)),
          or(
            ne(billingOperationalEvents.status, "failure"),
            isNotNull(billingOperationalEvents.resolvedAt),
          ),
        ),
      );
    await db
      .delete(billingHourlyMetrics)
      .where(lt(billingHourlyMetrics.bucket, new Date(now - RETENTION_MS)));
  } catch (error) {
    safeLogger.warn("[billing/observability] Retention cleanup failed", { error });
  }
}

function hourBucket(now: Date): Date {
  const bucket = new Date(now);
  bucket.setUTCMinutes(0, 0, 0);
  return bucket;
}

export async function recordCheckoutOutcome(
  provider: "stripe" | "whop",
  outcome: CheckoutOutcome,
): Promise<void> {
  const now = new Date();
  const successIncrement = outcome === "success" ? 1 : 0;
  const failureIncrement = outcome === "technical_failure" ? 1 : 0;
  try {
    await db
      .insert(billingHourlyMetrics)
      .values({
        bucket: hourBucket(now),
        provider,
        checkoutAttempts: 1,
        checkoutSuccesses: successIncrement,
        checkoutTechnicalFailures: failureIncrement,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [billingHourlyMetrics.bucket, billingHourlyMetrics.provider],
        set: {
          checkoutAttempts: sql`${billingHourlyMetrics.checkoutAttempts} + 1`,
          checkoutSuccesses: sql`${billingHourlyMetrics.checkoutSuccesses} + ${successIncrement}`,
          checkoutTechnicalFailures: sql`${billingHourlyMetrics.checkoutTechnicalFailures} + ${failureIncrement}`,
          updatedAt: now,
        },
      });
    await pruneExpiredBillingOperations(now.getTime());
  } catch (error) {
    safeLogger.error("[billing/observability] Could not update checkout metrics", {
      provider,
      outcome,
      error,
    });
  }
}

export async function recordBillingOperation(input: BillingOperationInput): Promise<void> {
  const record = normalize(input);
  const context = {
    operation: record.operation,
    provider: record.provider,
    status: record.status,
    eventId: record.eventId,
    objectId: record.objectId,
    code: record.code,
  };

  if (record.status === "failure") {
    logError(record.unexpectedError ? "error" : "warning", "Billing operation failed", {
      userId: record.userId ?? undefined,
      context,
    });
    if (record.unexpectedError) {
      Sentry.captureException(
        new Error(`Billing operation failed: ${record.operation}:${record.code ?? "unknown"}`),
        {
          tags: {
            component: "billing",
            provider: record.provider,
            operation: record.operation,
          },
          extra: context,
          user: record.userId ? { id: record.userId } : undefined,
        },
      );
    }
  }

  try {
    await db.insert(billingOperationalEvents).values({
      provider: record.provider,
      operation: record.operation,
      status: record.status,
      userId: record.userId,
      eventId: record.eventId,
      objectId: record.objectId,
      code: record.code,
    });
    await pruneExpiredBillingOperations(Date.now());
  } catch (error) {
    safeLogger.error("[billing/observability] Could not persist billing operation", {
      operation: record.operation,
      provider: record.provider,
      status: record.status,
      error,
    });
  }
}

export async function getBillingOperationalSnapshot() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [stats] = await db
    .select({
      failuresLast24Hours: sql<number>`count(*) filter (where ${billingOperationalEvents.status} = 'failure')::int`,
      ignoredLast24Hours: sql<number>`count(*) filter (where ${billingOperationalEvents.status} = 'ignored')::int`,
      checkoutFailuresLast24Hours: sql<number>`count(*) filter (where ${billingOperationalEvents.status} = 'failure' and ${billingOperationalEvents.operation} = 'checkout')::int`,
      webhookFailuresLast24Hours: sql<number>`count(*) filter (where ${billingOperationalEvents.status} = 'failure' and ${billingOperationalEvents.operation} = 'webhook')::int`,
      managementFailuresLast24Hours: sql<number>`count(*) filter (where ${billingOperationalEvents.status} = 'failure' and ${billingOperationalEvents.operation} not in ('checkout', 'webhook', 'startup'))::int`,
      paymentFailuresLast24Hours: sql<number>`count(*) filter (where ${billingOperationalEvents.code} = 'invoice_payment_failed_reconciled')::int`,
      lastSuccessAt: sql<Date | null>`max(${billingOperationalEvents.createdAt}) filter (where ${billingOperationalEvents.status} = 'success')`,
    })
    .from(billingOperationalEvents)
    .where(gte(billingOperationalEvents.createdAt, cutoff));

  const [unresolvedCountRow, recentFailures, checkoutMetricRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(billingOperationalEvents)
      .where(
        and(
          eq(billingOperationalEvents.status, "failure"),
          isNull(billingOperationalEvents.resolvedAt),
        ),
      ),
    db
      .select({
        id: billingOperationalEvents.id,
        operation: billingOperationalEvents.operation,
        provider: billingOperationalEvents.provider,
        userId: billingOperationalEvents.userId,
        eventId: billingOperationalEvents.eventId,
        objectId: billingOperationalEvents.objectId,
        code: billingOperationalEvents.code,
        timestamp: billingOperationalEvents.createdAt,
      })
      .from(billingOperationalEvents)
      .where(
        and(
          eq(billingOperationalEvents.status, "failure"),
          isNull(billingOperationalEvents.resolvedAt),
        ),
      )
      .orderBy(desc(billingOperationalEvents.createdAt))
      .limit(25),
    db
      .select({
        provider: billingHourlyMetrics.provider,
        attempts: sql<number>`coalesce(sum(${billingHourlyMetrics.checkoutAttempts}), 0)::int`,
        successes: sql<number>`coalesce(sum(${billingHourlyMetrics.checkoutSuccesses}), 0)::int`,
        technicalFailures: sql<number>`coalesce(sum(${billingHourlyMetrics.checkoutTechnicalFailures}), 0)::int`,
      })
      .from(billingHourlyMetrics)
      .where(gte(billingHourlyMetrics.bucket, cutoff))
      .groupBy(billingHourlyMetrics.provider),
  ]);

  const unresolvedFailures = unresolvedCountRow[0]?.count ?? 0;
  const metricFor = (provider: "stripe" | "whop") => {
    const row = checkoutMetricRows.find((candidate) => candidate.provider === provider);
    const attempts = row?.attempts ?? 0;
    const technicalFailures = row?.technicalFailures ?? 0;
    return {
      attempts,
      successes: row?.successes ?? 0,
      technicalFailures,
      technicalFailureRate:
        attempts > 0 ? Number(((technicalFailures / attempts) * 100).toFixed(2)) : null,
    };
  };
  return {
    status: unresolvedFailures > 0 ? "degraded" as const : "healthy" as const,
    failuresLast24Hours: stats?.failuresLast24Hours ?? 0,
    ignoredLast24Hours: stats?.ignoredLast24Hours ?? 0,
    checkoutFailuresLast24Hours: stats?.checkoutFailuresLast24Hours ?? 0,
    webhookFailuresLast24Hours: stats?.webhookFailuresLast24Hours ?? 0,
    managementFailuresLast24Hours: stats?.managementFailuresLast24Hours ?? 0,
    paymentFailuresLast24Hours: stats?.paymentFailuresLast24Hours ?? 0,
    checkout: {
      stripe: metricFor("stripe"),
      whop: metricFor("whop"),
    },
    unresolvedFailures,
    lastSuccessAt: toIsoString(stats?.lastSuccessAt),
    recentFailures: recentFailures.map((record) => ({
      ...record,
      timestamp: toIsoString(record.timestamp)!,
    })),
  };
}

export async function getUserBillingOperations(userId: string) {
  return db
    .select({
      id: billingOperationalEvents.id,
      operation: billingOperationalEvents.operation,
      provider: billingOperationalEvents.provider,
      status: billingOperationalEvents.status,
      eventId: billingOperationalEvents.eventId,
      objectId: billingOperationalEvents.objectId,
      code: billingOperationalEvents.code,
      resolvedAt: billingOperationalEvents.resolvedAt,
      createdAt: billingOperationalEvents.createdAt,
    })
    .from(billingOperationalEvents)
    .where(eq(billingOperationalEvents.userId, userId))
    .orderBy(desc(billingOperationalEvents.createdAt))
    .limit(25);
}

export async function resolveBillingOperationalFailure(id: number): Promise<boolean> {
  const rows = await db
    .update(billingOperationalEvents)
    .set({ resolvedAt: new Date(), resolvedBy: "admin" })
    .where(
      and(
        eq(billingOperationalEvents.id, id),
        eq(billingOperationalEvents.status, "failure"),
        isNull(billingOperationalEvents.resolvedAt),
      ),
    )
    .returning({ id: billingOperationalEvents.id });
  return rows.length > 0;
}