import { beforeEach, describe, expect, it, vi } from "vitest";

type CurrentUser = {
  isPro: boolean;
  paidPro: boolean;
  complimentaryPro: boolean;
  isTestAccount: boolean;
  billingProvider: string | null;
  stripeSubscriptionId: string | null;
  whopMembershipId?: string | null;
  billingMigrationState?: string | null;
  billingMigrationStartedAt?: Date | null;
  billingMigrationIntentId?: string | null;
  billingMigrationIntentExpiresAt?: Date | null;
};

const state = vi.hoisted(() => ({
  current: {
    isPro: false,
    paidPro: false,
    complimentaryPro: false,
    isTestAccount: false,
    billingProvider: null,
    stripeSubscriptionId: null,
  } as CurrentUser,
  insertedEvents: [] as Array<Record<string, unknown>>,
  updateSets: [] as Array<Record<string, unknown>>,
}));

vi.mock("./db", () => ({
  db: {
    transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        select: vi.fn(() => {
          const chain: any = {
            from: vi.fn(() => chain),
            where: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            for: vi.fn(async () => [state.current]),
          };
          return chain;
        }),
        update: vi.fn(() => ({
          set: vi.fn((values: Record<string, unknown>) => {
            state.updateSets.push(values);
            const result: any = {
              where: vi.fn(() => {
                const whereResult: any = Promise.resolve([]);
                whereResult.returning = vi.fn(async () => {
                  const targetPaidPro = values.paidPro;
                  if (
                    (typeof targetPaidPro === "boolean" &&
                      targetPaidPro !== state.current.paidPro) ||
                    (typeof values.billingProvider === "string" &&
                      values.billingProvider !== state.current.billingProvider)
                  ) {
                    state.current = {
                      ...state.current,
                      ...values,
                    } as CurrentUser;
                    return [{ id: "user_1" }];
                  }
                  return [];
                });
                return whereResult;
              }),
            };
            return result;
          }),
        })),
        insert: vi.fn(() => ({
          values: vi.fn((value: Record<string, unknown>) => {
            if (value.type) state.insertedEvents.push(value);
            return {
              onConflictDoNothing: vi.fn(async () => []),
            };
          }),
        })),
      };
      return callback(tx);
    }),
  },
}));

import {
  activateWhopMembership,
  beginWhopToStripeMigration,
  reconcileStripeSubscription,
  transitionProStatus,
} from "./pro-transitions";

const activeInput = {
  userId: "user_1",
  customerId: "cus_1",
  subscriptionId: "sub_current",
  status: "active",
  active: true,
  eventId: "evt_1",
  migrationIntentId: "intent_1",
  subscriptionCreatedAt: 1_800_000_000,
};

describe("reconcileStripeSubscription", () => {
  beforeEach(() => {
    state.current = {
      isPro: false,
      paidPro: false,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: null,
      stripeSubscriptionId: null,
    };
    state.insertedEvents.length = 0;
    state.updateSets.length = 0;
    vi.clearAllMocks();
  });

  it("grants Stripe-owned Pro access and records one source-specific event", async () => {
    await expect(reconcileStripeSubscription(activeInput)).resolves.toEqual({
      changed: true,
      ignored: false,
    });
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      isPro: true,
      billingProvider: "stripe",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_current",
    }));
    expect(state.insertedEvents).toEqual([
      expect.objectContaining({
        userId: "user_1",
        type: "pro_granted",
        payload: expect.objectContaining({
          source: "stripe",
          eventId: "evt_1",
        }),
      }),
    ]);
  });

  it("adds paid Stripe access alongside a complimentary grant", async () => {
    state.current = {
      isPro: true,
      paidPro: false,
      complimentaryPro: true,
      isTestAccount: false,
      billingProvider: null,
      stripeSubscriptionId: null,
    };

    await expect(reconcileStripeSubscription(activeInput)).resolves.toEqual({
      changed: true,
      ignored: false,
    });
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      isPro: true,
      paidPro: true,
      billingProvider: "stripe",
    }));
  });

  it("lets Stripe take paid ownership only after explicit Whop migration consent", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "whop",
      stripeSubscriptionId: null,
      whopMembershipId: "mem_legacy",
      billingMigrationState: "whop_to_stripe_pending",
      billingMigrationStartedAt: new Date(1_799_999_900_000),
      billingMigrationIntentId: "intent_1",
      billingMigrationIntentExpiresAt: new Date(1_800_000_100_000),
    };

    await expect(reconcileStripeSubscription(activeInput)).resolves.toEqual({
      changed: false,
      ignored: false,
    });
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
      billingMigrationState: "awaiting_whop_cancellation",
    }));
  });

  it("still rejects accidental Stripe takeover of an active Whop entitlement", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "whop",
      stripeSubscriptionId: null,
      whopMembershipId: "mem_legacy",
      billingMigrationState: null,
    };

    await expect(reconcileStripeSubscription(activeInput)).resolves.toEqual({
      changed: false,
      ignored: true,
    });
    expect(state.updateSets).toHaveLength(0);
  });

  it("rejects Stripe takeover when the subscription is not bound to the approved migration intent", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "whop",
      stripeSubscriptionId: null,
      whopMembershipId: "mem_legacy",
      billingMigrationState: "whop_to_stripe_pending",
      billingMigrationStartedAt: new Date(1_799_999_900_000),
      billingMigrationIntentId: "approved_intent",
      billingMigrationIntentExpiresAt: new Date(1_800_000_100_000),
    };

    await expect(reconcileStripeSubscription({
      ...activeInput,
      migrationIntentId: "different_intent",
    })).resolves.toEqual({ changed: false, ignored: true });
    expect(state.updateSets).toHaveLength(0);
  });

  it("rejects a subscription created after the approved migration intent expired", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "whop",
      stripeSubscriptionId: null,
      whopMembershipId: "mem_legacy",
      billingMigrationState: "whop_to_stripe_pending",
      billingMigrationStartedAt: new Date(1_799_999_900_000),
      billingMigrationIntentId: "intent_1",
      billingMigrationIntentExpiresAt: new Date(1_799_999_999_000),
    };

    await expect(reconcileStripeSubscription(activeInput)).resolves.toEqual({
      changed: false,
      ignored: true,
    });
    expect(state.updateSets).toHaveLength(0);
  });

  it("keeps access during Stripe's current past-due retry window", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
    };

    await expect(reconcileStripeSubscription({
      ...activeInput,
        active: true,
      status: "past_due",
      eventId: "evt_failed",
    })).resolves.toEqual({ changed: false, ignored: false });
    expect(state.insertedEvents).toHaveLength(0);
  });

  it("restores Whop ownership if migrated Stripe ends before Whop cancellation", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
      whopMembershipId: "mem_legacy",
      billingMigrationState: "awaiting_whop_cancellation",
    };

    await expect(reconcileStripeSubscription({
      ...activeInput,
      active: false,
      status: "canceled",
      eventId: "evt_stripe_canceled",
      verifyWhopActiveAfterLock: vi.fn().mockResolvedValue(true),
    })).resolves.toEqual({ changed: false, ignored: false });
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      isPro: true,
      paidPro: true,
      billingProvider: "whop",
      billingMigrationState: "whop_to_stripe_pending",
    }));
    expect(state.insertedEvents[0]).toEqual(expect.objectContaining({
      type: "billing_migration_stripe_deactivated",
    }));
  });

  it("does not restore Whop after Stripe ends when canonical Whop state is inactive", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
      whopMembershipId: "mem_legacy",
      billingMigrationState: "awaiting_whop_cancellation",
      billingMigrationIntentId: "intent_1",
      billingMigrationIntentExpiresAt: new Date(1_800_000_100_000),
    };

    await expect(reconcileStripeSubscription({
      ...activeInput,
      active: false,
      status: "canceled",
      verifyWhopActiveAfterLock: vi.fn().mockResolvedValue(false),
    })).resolves.toEqual({ changed: true, ignored: false });
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      paidPro: false,
      billingMigrationState: "whop_to_stripe_completed",
      billingMigrationIntentId: null,
    }));
    expect(state.updateSets[0]).not.toHaveProperty("billingProvider", "whop");
  });

  it("restores Pro access when the same Stripe subscription resumes", async () => {
    state.current = {
      isPro: false,
      paidPro: false,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
    };

    await expect(reconcileStripeSubscription({
      ...activeInput,
      status: "active",
      eventId: "evt_resumed",
    })).resolves.toEqual({ changed: true, ignored: false });
    expect(state.insertedEvents[0]).toEqual(expect.objectContaining({
      type: "pro_granted",
      payload: expect.objectContaining({
        source: "stripe",
        status: "active",
      }),
    }));
  });

  it("ignores a stale cancellation for an older Stripe subscription", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_newer",
    };

    await expect(reconcileStripeSubscription({
      ...activeInput,
      active: false,
      status: "canceled",
    })).resolves.toEqual({ changed: false, ignored: true });
    expect(state.updateSets).toHaveLength(0);
    expect(state.insertedEvents).toHaveLength(0);
  });

  it("ignores a delayed activation for an older Stripe subscription", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_newer",
    };

    await expect(reconcileStripeSubscription(activeInput)).resolves.toEqual({
      changed: false,
      ignored: true,
    });
    expect(state.updateSets).toHaveLength(0);
    expect(state.insertedEvents).toHaveLength(0);
  });

  it("treats a repeated cancellation as an idempotent no-op", async () => {
    state.current = {
      isPro: false,
      paidPro: false,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
    };

    await expect(reconcileStripeSubscription({
      ...activeInput,
      active: false,
      status: "canceled",
    })).resolves.toEqual({ changed: false, ignored: true });
    expect(state.insertedEvents).toHaveLength(0);
  });

  it("removes only Stripe access when complimentary access also exists", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: true,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
    };

    await reconcileStripeSubscription({
      ...activeInput,
      active: false,
      status: "canceled",
    });

    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      isPro: true,
      paidPro: false,
    }));
  });

  it("does not let Stripe take paid ownership from Whop", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "whop",
      stripeSubscriptionId: null,
    };

    await expect(reconcileStripeSubscription(activeInput)).resolves.toEqual({
      changed: false,
      ignored: true,
    });
    expect(state.updateSets).toHaveLength(0);
  });

  it("rechecks canonical Stripe state after locking before it commits", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
    };
    const refreshAfterLock = vi.fn().mockResolvedValue({
      customerId: "cus_1",
      subscriptionId: "sub_current",
      status: "canceled",
      active: false,
    });

    await expect(reconcileStripeSubscription({
      ...activeInput,
      refreshAfterLock,
    })).resolves.toEqual({ changed: true, ignored: false });
    expect(refreshAfterLock).toHaveBeenCalledOnce();
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      paidPro: false,
      isPro: false,
    }));
  });
});

describe("Whop to Stripe migration state", () => {
  beforeEach(() => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "whop",
      stripeSubscriptionId: null,
      whopMembershipId: "mem_legacy",
      billingMigrationState: null,
    };
    state.insertedEvents.length = 0;
    state.updateSets.length = 0;
    vi.clearAllMocks();
  });

  it("records explicit consent before any Stripe checkout can take ownership", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    await beginWhopToStripeMigration("user_1", "mem_legacy", "intent_1", expiresAt);
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      billingMigrationState: "whop_to_stripe_pending",
      billingMigrationStartedAt: expect.any(Date),
      billingMigrationIntentId: "intent_1",
      billingMigrationIntentExpiresAt: expiresAt,
    }));
    expect(state.insertedEvents[0]).toEqual(expect.objectContaining({
      type: "billing_migration_started",
      payload: expect.objectContaining({ from: "whop", to: "stripe" }),
    }));
  });

  it("reuses a still-valid pending intent instead of widening abandoned consent", async () => {
    state.current = {
      ...state.current,
      billingMigrationState: "whop_to_stripe_pending",
      billingMigrationIntentId: "existing_intent",
      billingMigrationIntentExpiresAt: new Date(Date.now() + 60_000),
    };

    await expect(beginWhopToStripeMigration(
      "user_1",
      "mem_legacy",
      "replacement_intent",
      new Date(Date.now() + 120_000),
    )).resolves.toBe("existing_intent");
    expect(state.updateSets).toHaveLength(0);
    expect(state.insertedEvents).toHaveLength(0);
  });

  it("marks migration complete when Whop later confirms cancellation without revoking Stripe", async () => {
    state.current = {
      ...state.current,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
      billingMigrationState: "awaiting_whop_cancellation",
    };

    await expect(transitionProStatus("user_1", false, "whop", {
      expectedWhopMembershipId: "mem_legacy",
    })).resolves.toEqual({ changed: false });
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      billingMigrationState: "whop_to_stripe_completed",
    }));
    expect(state.updateSets[0]).not.toHaveProperty("paidPro", false);
    expect(state.insertedEvents[0]).toEqual(expect.objectContaining({
      type: "billing_migration_completed",
    }));
  });
});

describe("source-aware Pro transitions", () => {
  beforeEach(() => {
    state.insertedEvents.length = 0;
    state.updateSets.length = 0;
    vi.clearAllMocks();
  });

  it("revokes a complimentary grant without revoking paid access", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: true,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
    };

    await expect(transitionProStatus("user_1", false, "comp")).resolves.toEqual({
      changed: true,
    });
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      complimentaryPro: false,
      isPro: true,
    }));
  });

  it("revokes test access without revoking paid access", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: true,
      billingProvider: "whop",
      stripeSubscriptionId: null,
    };

    await transitionProStatus("user_1", false, "test");
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      isTestAccount: false,
      isPro: true,
    }));
  });

  it("ignores delayed Whop deactivation when Stripe owns paid access", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_current",
    };

    await expect(transitionProStatus("user_1", false, "whop")).resolves.toEqual({
      changed: false,
    });
    expect(state.updateSets).toHaveLength(0);
  });

  it("Whop deactivation preserves a separate complimentary grant", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: true,
      isTestAccount: false,
      billingProvider: "whop",
      stripeSubscriptionId: null,
    };

    await transitionProStatus("user_1", false, "whop");
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      paidPro: false,
      isPro: true,
    }));
  });

  it("ignores deactivation for a Whop membership replaced while the event waited", async () => {
    state.current = {
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "whop",
      stripeSubscriptionId: null,
      whopMembershipId: "mem_new",
    };

    await expect(transitionProStatus("user_1", false, "whop", {
      expectedWhopMembershipId: "mem_old",
    })).resolves.toEqual({ changed: false });
    expect(state.updateSets).toHaveLength(0);
  });

  it("lets a valid Whop activation replace a terminated Stripe paid owner", async () => {
    state.current = {
      isPro: false,
      paidPro: false,
      complimentaryPro: false,
      isTestAccount: false,
      billingProvider: "stripe",
      stripeSubscriptionId: "sub_canceled",
      whopMembershipId: null,
    };

    await expect(
      activateWhopMembership("user_1", "mem_new"),
    ).resolves.toEqual({ changed: true });
    expect(state.updateSets[0]).toEqual(expect.objectContaining({
      isPro: true,
      paidPro: true,
      billingProvider: "whop",
      whopMembershipId: "mem_new",
    }));
    expect(state.insertedEvents[0]).toEqual(expect.objectContaining({
      type: "pro_granted",
      payload: expect.objectContaining({ source: "whop" }),
    }));
  });
});