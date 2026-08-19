import { beforeEach, describe, expect, it, vi } from "vitest";

type CurrentUser = {
  isPro: boolean;
  paidPro: boolean;
  complimentaryPro: boolean;
  isTestAccount: boolean;
  billingProvider: string | null;
  stripeSubscriptionId: string | null;
  whopMembershipId?: string | null;
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
                    typeof targetPaidPro === "boolean" &&
                    targetPaidPro !== state.current.paidPro
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