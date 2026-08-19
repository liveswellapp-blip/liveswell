import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockUserRows: Array<Record<string, unknown>> = [];

const mocks = vi.hoisted(() => ({
  getStripePublishableKey: vi.fn(),
  getUncachableStripeClient: vi.fn(),
  getWhopClient: vi.fn(),
  reconcileStripeSubscription: vi.fn(),
  transitionProStatus: vi.fn(),
  update: vi.fn(),
}));

vi.mock("./db", () => ({
  db: {
    select: vi.fn(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        where: vi.fn(() => chain),
        limit: vi.fn(() => Promise.resolve(mockUserRows)),
      };
      return chain;
    }),
    update: mocks.update,
  },
}));

vi.mock("./stripe-client", () => ({
  getStripePublishableKey: mocks.getStripePublishableKey,
  getUncachableStripeClient: mocks.getUncachableStripeClient,
}));

vi.mock("./whopClient", () => ({
  getWhopClient: mocks.getWhopClient,
}));

vi.mock("./pro-transitions", () => ({
  reconcileStripeSubscription: mocks.reconcileStripeSubscription,
  transitionProStatus: mocks.transitionProStatus,
}));

import {
  BillingRequestError,
  changeStripePlan,
  completeStripePaymentMethodSetup,
  createStripePaymentMethodSetup,
  createStripeSubscriptionSession,
  getStripeInvoiceDocument,
  getBillingStatus,
  processStripeBillingEvent,
  resolveStripePrice,
  setStripeCancellation,
} from "./stripe-billing";

const validMonthlyPrice = {
  id: "price_monthly",
  active: true,
  lookup_key: "liveswell_pro_monthly_v1",
  unit_amount: 499,
  currency: "usd",
  recurring: { interval: "month" },
  product: "prod_liveswell",
  metadata: {
    liveswell_plan: "pro_monthly",
    liveswell_app: "liveswell",
    catalog_version: "v1",
  },
};

const validProduct = {
  id: "prod_liveswell",
  deleted: false,
  metadata: {
    liveswell_product: "pro",
    liveswell_app: "liveswell",
    catalog_version: "v1",
  },
};

const validAnnualPrice = {
  ...validMonthlyPrice,
  id: "price_annual",
  lookup_key: "liveswell_pro_annual_v1",
  unit_amount: 2999,
  recurring: { interval: "year" },
  metadata: { ...validMonthlyPrice.metadata, liveswell_plan: "pro_annual" },
};

describe("Stripe catalog allowlist", () => {
  it("resolves the canonical monthly lookup key and price invariants", async () => {
    const stripe = {
      prices: {
        list: vi.fn().mockResolvedValue({ data: [validMonthlyPrice] }),
      },
      products: {
        retrieve: vi.fn().mockResolvedValue(validProduct),
      },
    } as any;

    await expect(resolveStripePrice(stripe, "monthly")).resolves.toEqual(validMonthlyPrice);
    expect(stripe.prices.list).toHaveBeenCalledWith({
      lookup_keys: ["liveswell_pro_monthly_v1"],
      active: true,
      limit: 1,
    });
  });

  it("fails closed when the lookup key resolves to a modified or foreign price", async () => {
    const stripe = {
      prices: {
        list: vi.fn().mockResolvedValue({
          data: [{ ...validMonthlyPrice, unit_amount: 99 }],
        }),
      },
      products: {
        retrieve: vi.fn().mockResolvedValue(validProduct),
      },
    } as any;

    await expect(resolveStripePrice(stripe, "monthly")).rejects.toMatchObject({
      statusCode: 503,
      code: "stripe_catalog_unavailable",
    });
  });
});

describe("Stripe subscription checkout", () => {
  beforeEach(() => {
    vi.stubEnv("APP_URL", "https://liveswell.example");
    mocks.getStripePublishableKey.mockResolvedValue("pk_test_liveswell");
    mockUserRows = [{
      id: "user_free",
      email: "surfer@example.test",
      isPro: false,
      paidPro: false,
      complimentaryPro: false,
      isTestAccount: false,
      whopMembershipId: null,
      stripeCustomerId: "cus_existing",
      stripeSubscriptionId: null,
      billingProvider: null,
    }];
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("blocks a second checkout while an open Stripe session exists", async () => {
    const stripe = {
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      prices: { list: vi.fn().mockResolvedValue({ data: [validMonthlyPrice] }) },
      products: { retrieve: vi.fn().mockResolvedValue(validProduct) },
      checkout: {
        sessions: {
          list: vi.fn().mockResolvedValue({ data: [{ id: "cs_open" }] }),
          create: vi.fn(),
        },
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await expect(createStripeSubscriptionSession("user_free", "monthly")).rejects.toEqual(
      expect.objectContaining({
        statusCode: 409,
        code: "checkout_in_progress",
      }),
    );
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("blocks a second subscription while an existing Stripe subscription is non-terminal", async () => {
    mockUserRows[0].stripeSubscriptionId = "sub_past_due";
    const stripe = {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({ id: "sub_past_due", status: "past_due" }),
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await expect(createStripeSubscriptionSession("user_free", "monthly")).rejects.toEqual(
      expect.objectContaining({
        statusCode: 409,
        code: "subscription_exists",
      }),
    );
  });

  it("creates an embedded session using only the verified server-side price", async () => {
    const stripe = {
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      prices: { list: vi.fn().mockResolvedValue({ data: [validMonthlyPrice] }) },
      products: { retrieve: vi.fn().mockResolvedValue(validProduct) },
      checkout: {
        sessions: {
          list: vi.fn().mockResolvedValue({ data: [] }),
          create: vi.fn().mockResolvedValue({
            id: "cs_created",
            client_secret: "cs_secret_for_embedded_checkout",
          }),
        },
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await expect(
      createStripeSubscriptionSession("user_free", "monthly"),
    ).resolves.toEqual({
      checkoutSessionId: "cs_created",
      clientSecret: "cs_secret_for_embedded_checkout",
      publishableKey: "pk_test_liveswell",
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        ui_mode: "embedded",
        customer: "cus_existing",
        line_items: [{ price: "price_monthly", quantity: 1 }],
        metadata: expect.objectContaining({ clerk_user_id: "user_free" }),
      }),
      { idempotencyKey: "liveswell-subscription-checkout-user_free" },
    );
  });

  it("blocks checkout when Stripe already has a subscription before the webhook links it", async () => {
    const stripe = {
      subscriptions: {
        list: vi.fn().mockResolvedValue({
          data: [{ id: "sub_webhook_pending", status: "active" }],
        }),
      },
      prices: { list: vi.fn().mockResolvedValue({ data: [validMonthlyPrice] }) },
      products: { retrieve: vi.fn().mockResolvedValue(validProduct) },
      checkout: {
        sessions: {
          list: vi.fn(),
          create: vi.fn(),
        },
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await expect(
      createStripeSubscriptionSession("user_free", "monthly"),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "subscription_exists",
    });
    expect(stripe.checkout.sessions.list).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("rejects users who already have Pro access before calling Stripe", async () => {
    mockUserRows[0].isPro = true;

    await expect(createStripeSubscriptionSession("user_free", "monthly")).rejects.toBeInstanceOf(
      BillingRequestError,
    );
    expect(mocks.getUncachableStripeClient).not.toHaveBeenCalled();
  });

  it("creates and links a customer with a stable per-user idempotency key", async () => {
    mockUserRows[0].stripeCustomerId = null;
    mocks.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ stripeCustomerId: "cus_new" }]),
        }),
      }),
    });
    const stripe = {
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      customers: {
        create: vi.fn().mockResolvedValue({ id: "cus_new" }),
      },
      prices: { list: vi.fn().mockResolvedValue({ data: [validMonthlyPrice] }) },
      products: { retrieve: vi.fn().mockResolvedValue(validProduct) },
      checkout: {
        sessions: {
          list: vi.fn().mockResolvedValue({ data: [] }),
          create: vi.fn().mockResolvedValue({
            id: "cs_created",
            client_secret: "cs_secret_for_embedded_checkout",
          }),
        },
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await createStripeSubscriptionSession("user_free", "monthly");

    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "surfer@example.test",
        metadata: expect.objectContaining({ clerk_user_id: "user_free" }),
      }),
      { idempotencyKey: "liveswell-customer-user_free" },
    );
  });
});

describe("unified billing status", () => {
  beforeEach(() => {
    mocks.transitionProStatus.mockResolvedValue({ changed: false });
    mocks.reconcileStripeSubscription.mockResolvedValue({ changed: false, ignored: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("distinguishes complimentary and test Pro access without billing controls", async () => {
    mockUserRows = [{
      id: "user_comp",
      email: null,
      isPro: true,
      paidPro: false,
      complimentaryPro: true,
      isTestAccount: false,
      whopMembershipId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      billingProvider: null,
    }];

    await expect(getBillingStatus("user_comp")).resolves.toMatchObject({
      isPro: true,
      provider: "complimentary",
      plan: null,
      renewsAt: null,
      canManageBilling: false,
      managementType: null,
    });

    mockUserRows[0].isTestAccount = true;
    await expect(getBillingStatus("user_comp")).resolves.toMatchObject({
      provider: "test",
      canManageBilling: false,
    });
  });

  it("returns a consistent Whop plan and reconciles a resumed membership", async () => {
    vi.stubEnv("WHOP_ANNUAL_PLAN_ID", "plan_annual");
    mockUserRows = [{
      id: "user_whop",
      email: null,
      isPro: false,
      paidPro: false,
      complimentaryPro: false,
      isTestAccount: false,
      whopMembershipId: "mem_1",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      billingProvider: "whop",
    }];
    mocks.getWhopClient.mockResolvedValue({
      memberships: {
        retrieve: vi.fn().mockResolvedValue({
          status: "active",
          plan: { id: "plan_annual" },
          renewal_period_end: 1_900_000_000,
        }),
      },
    });

    await expect(getBillingStatus("user_whop")).resolves.toMatchObject({
      isPro: true,
      provider: "whop",
      plan: "annual",
      renewsAt: 1_900_000_000,
      canManageBilling: true,
      managementType: "whop_hub",
    });
    expect(mocks.transitionProStatus).toHaveBeenCalledWith(
      "user_whop",
      true,
      "whop",
      expect.any(Object),
    );
    vi.unstubAllEnvs();
  });

  it("preserves cached Stripe Pro access during a transient provider failure", async () => {
    mockUserRows = [{
      id: "user_stripe",
      email: null,
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      whopMembershipId: null,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      billingProvider: "stripe",
    }];
    mocks.getUncachableStripeClient.mockRejectedValue(new Error("temporary outage"));

    await expect(getBillingStatus("user_stripe")).resolves.toMatchObject({
      isPro: true,
      provider: "stripe",
      plan: null,
      renewsAt: null,
      canManageBilling: true,
      managementType: "stripe_in_app",
    });
  });

  it("reports complimentary Pro after the linked Stripe subscription is canceled", async () => {
    mockUserRows = [{
      id: "user_stripe_comp",
      email: null,
      isPro: true,
      paidPro: true,
      complimentaryPro: true,
      isTestAccount: false,
      whopMembershipId: null,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      billingProvider: "stripe",
    }];
    const canceledSubscription = {
      id: "sub_1",
      status: "canceled",
      customer: "cus_1",
      items: {
        data: [{ price: { lookup_key: "liveswell_pro_monthly_v1" } }],
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(canceledSubscription),
      },
    });

    await expect(getBillingStatus("user_stripe_comp")).resolves.toMatchObject({
      isPro: true,
      provider: "stripe",
      canManageBilling: true,
    });
  });

  it("returns the post-lock Stripe status when cancellation races the first lookup", async () => {
    mockUserRows = [{
      id: "user_stripe_race",
      email: null,
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: false,
      whopMembershipId: null,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      billingProvider: "stripe",
    }];
    const activeSubscription = {
      id: "sub_1",
      status: "active",
      customer: "cus_1",
      items: {
        data: [{ price: { lookup_key: "liveswell_pro_monthly_v1" } }],
      },
    };
    const canceledSubscription = {
      ...activeSubscription,
      status: "canceled",
    };
    const retrieve = vi.fn()
      .mockResolvedValueOnce(activeSubscription)
      .mockResolvedValueOnce(canceledSubscription);
    mocks.getUncachableStripeClient.mockResolvedValue({
      subscriptions: { retrieve },
      customers: {
        retrieve: vi.fn().mockResolvedValue({
          deleted: false,
          invoice_settings: { default_payment_method: null },
        }),
      },
      invoices: { list: vi.fn().mockResolvedValue({ data: [] }) },
    });
    mocks.reconcileStripeSubscription.mockImplementation(async (input: any) => {
      await input.refreshAfterLock();
      return { changed: true, ignored: false };
    });

    await expect(getBillingStatus("user_stripe_race")).resolves.toMatchObject({
      isPro: false,
      provider: "stripe",
    });
    expect(retrieve).toHaveBeenCalledTimes(2);
  });

  it("reports test Pro after the linked Whop membership becomes inactive", async () => {
    mockUserRows = [{
      id: "user_whop_test",
      email: null,
      isPro: true,
      paidPro: true,
      complimentaryPro: false,
      isTestAccount: true,
      whopMembershipId: "mem_1",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      billingProvider: "whop",
    }];
    mocks.getWhopClient.mockResolvedValue({
      memberships: {
        retrieve: vi.fn().mockResolvedValue({
          status: "expired",
          plan: { id: "plan_old" },
        }),
      },
    });

    await expect(getBillingStatus("user_whop_test")).resolves.toMatchObject({
      isPro: true,
      provider: "whop",
      canManageBilling: true,
    });
    expect(mocks.transitionProStatus).toHaveBeenCalledWith(
      "user_whop_test",
      false,
      "whop",
      expect.objectContaining({ expectedWhopMembershipId: "mem_1" }),
    );
  });
});

describe("Stripe subscription management", () => {
  const managedUser = {
    id: "user_stripe",
    email: "surfer@example.test",
    isPro: true,
    paidPro: true,
    complimentaryPro: false,
    isTestAccount: false,
    whopMembershipId: null,
    stripeCustomerId: "cus_owned",
    stripeSubscriptionId: "sub_owned",
    billingProvider: "stripe",
  };
  const ownedSubscription = {
    id: "sub_owned",
    customer: "cus_owned",
    status: "active",
    cancel_at_period_end: false,
    items: { data: [{ id: "si_owned", price: { id: "price_monthly", lookup_key: "liveswell_pro_monthly_v1" } }] },
  };

  beforeEach(() => {
    mockUserRows = [{ ...managedUser }];
    mocks.getStripePublishableKey.mockResolvedValue("pk_test_liveswell");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("cancels only the authenticated user's linked Stripe subscription with an idempotency key", async () => {
    const stripe = {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(ownedSubscription),
        update: vi.fn().mockResolvedValue({ ...ownedSubscription, cancel_at_period_end: true }),
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await setStripeCancellation("user_stripe", true, "11111111-1111-4111-8111-111111111111");

    expect(stripe.subscriptions.update).toHaveBeenCalledWith(
      "sub_owned",
      { cancel_at_period_end: true },
      { idempotencyKey: "liveswell-cancel-user_stripe-11111111-1111-4111-8111-111111111111" },
    );
  });

  it("rejects a subscription whose Stripe customer is not owned by the signed-in user", async () => {
    const stripe = {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({ ...ownedSubscription, customer: "cus_other" }),
        update: vi.fn(),
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await expect(
      setStripeCancellation("user_stripe", true, "11111111-1111-4111-8111-111111111111"),
    ).rejects.toMatchObject({ statusCode: 403, code: "billing_ownership_mismatch" });
    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
  });

  it("switches only an owned subscription to the verified catalog price", async () => {
    const stripe = {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(ownedSubscription),
        update: vi.fn().mockResolvedValue({ ...ownedSubscription }),
      },
      prices: { list: vi.fn().mockResolvedValue({ data: [validAnnualPrice] }) },
      products: { retrieve: vi.fn().mockResolvedValue(validProduct) },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await changeStripePlan("user_stripe", "annual", "22222222-2222-4222-8222-222222222222");

    expect(stripe.subscriptions.update).toHaveBeenCalledWith(
      "sub_owned",
      expect.objectContaining({
        items: [{ id: "si_owned", price: "price_annual" }],
        proration_behavior: "create_prorations",
      }),
      { idempotencyKey: "liveswell-plan-annual-user_stripe-22222222-2222-4222-8222-222222222222" },
    );
  });

  it("verifies a successful SetupIntent belongs to the user before setting it as default", async () => {
    const stripe = {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(ownedSubscription),
        update: vi.fn().mockResolvedValue({}),
      },
      customers: { update: vi.fn().mockResolvedValue({}) },
      setupIntents: {
        retrieve: vi.fn().mockResolvedValue({
          id: "seti_owned",
          status: "succeeded",
          customer: "cus_owned",
          payment_method: "pm_card",
        }),
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await completeStripePaymentMethodSetup("user_stripe", "seti_owned");

    expect(stripe.customers.update).toHaveBeenCalledWith(
      "cus_owned",
      { invoice_settings: { default_payment_method: "pm_card" } },
      { idempotencyKey: "liveswell-payment-customer-seti_owned" },
    );
    expect(stripe.subscriptions.update).toHaveBeenCalledWith(
      "sub_owned",
      { default_payment_method: "pm_card" },
      { idempotencyKey: "liveswell-payment-subscription-seti_owned" },
    );
  });

  it("does not expose another customer's invoice document", async () => {
    const stripe = {
      invoices: {
        retrieve: vi.fn().mockResolvedValue({
          customer: "cus_other",
          invoice_pdf: "https://stripe.example/invoice.pdf",
        }),
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await expect(getStripeInvoiceDocument("user_stripe", "in_other")).rejects.toMatchObject({
      statusCode: 404,
      code: "invoice_not_found",
    });
  });

  it("returns only Stripe.js bootstrap material when preparing a secure payment update", async () => {
    const stripe = {
      subscriptions: { retrieve: vi.fn().mockResolvedValue(ownedSubscription) },
      setupIntents: {
        create: vi.fn().mockResolvedValue({ id: "seti_owned", client_secret: "seti_secret" }),
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue(stripe);

    await expect(
      createStripePaymentMethodSetup("user_stripe", "33333333-3333-4333-8333-333333333333"),
    ).resolves.toEqual({ clientSecret: "seti_secret", publishableKey: "pk_test_liveswell" });
    expect(stripe.setupIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_owned", usage: "off_session" }),
      { idempotencyKey: "liveswell-payment-setup-user_stripe-33333333-3333-4333-8333-333333333333" },
    );
  });
});

describe("Stripe lifecycle event routing", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps a past-due verified subscription event to a Stripe grace-period reconciliation", async () => {
    mockUserRows = [];
    mocks.reconcileStripeSubscription.mockResolvedValue({ changed: true, ignored: false });
    const subscription = {
      id: "sub_failed",
      status: "past_due",
      customer: "cus_1",
      metadata: { clerk_user_id: "user_1" },
      items: {
        data: [{ price: { lookup_key: "liveswell_pro_monthly_v1" } }],
      },
    };
    mocks.getUncachableStripeClient.mockResolvedValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(subscription),
      },
    });

    await processStripeBillingEvent({
      id: "evt_failed",
      type: "customer.subscription.updated",
      data: { object: subscription },
    } as any);

    expect(mocks.reconcileStripeSubscription).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user_1",
      customerId: "cus_1",
      subscriptionId: "sub_failed",
      status: "past_due",
      active: true,
      eventId: "evt_failed",
      refreshAfterLock: expect.any(Function),
    }));
  });

  it("uses canonical Stripe state when an older active event arrives after cancellation", async () => {
    const eventSnapshot = {
      id: "sub_reordered",
      status: "active",
      customer: "cus_1",
      metadata: { clerk_user_id: "user_1" },
      items: {
        data: [{ price: { lookup_key: "liveswell_pro_monthly_v1" } }],
      },
    };
    const canonicalSubscription = {
      ...eventSnapshot,
      status: "canceled",
    };
    mocks.getUncachableStripeClient.mockResolvedValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(canonicalSubscription),
      },
    });
    mocks.reconcileStripeSubscription.mockResolvedValue({ changed: true, ignored: false });

    await processStripeBillingEvent({
      id: "evt_old_active",
      type: "customer.subscription.updated",
      data: { object: eventSnapshot },
    } as any);

    expect(mocks.reconcileStripeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "sub_reordered",
        status: "canceled",
        active: false,
      }),
    );
  });
});