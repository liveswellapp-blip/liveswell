// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: "",
}));

const stripeMocks = vi.hoisted(() => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
  options: null as null | { onComplete?: () => void },
}));

const apiMocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/pricing", routeMocks.navigate],
  useSearch: () => routeMocks.search,
  Link: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: stripeMocks.loadStripe,
}));

vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ children, options }: any) => {
    stripeMocks.options = options;
    return <>{children}</>;
  },
  EmbeddedCheckout: () => (
    <div data-testid="embedded-checkout">Stripe secure payment form</div>
  ),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: apiMocks.apiRequest,
}));

import { useAuth } from "@/hooks/useAuth";
import PricingPage from "@/pages/Pricing";

type BillingStatus = {
  isPro: boolean;
  provider: "stripe" | "whop" | "complimentary" | "test" | "free";
  plan: "monthly" | "annual" | null;
  renewsAt: number | null;
  canManageBilling: boolean;
  managementType: "stripe_in_app" | "whop_hub" | null;
  migration?: {
    state: "not_applicable" | "available" | "pending" | "awaiting_whop_cancellation" | "completed";
    from: "whop" | null;
    canStart: boolean;
  };
};

const freeStatus: BillingStatus = {
  isPro: false,
  provider: "free",
  plan: null,
  renewsAt: null,
  canManageBilling: false,
  managementType: null,
};

function mockAuth(isAuthenticated: boolean, isLoading = false) {
  vi.mocked(useAuth).mockReturnValue({
    user: isAuthenticated ? { id: "user_1" } : null,
    isAuthenticated,
    isLoading,
    isPro: false,
    isProLoading: false,
    logout: vi.fn(),
  } as any);
}

function renderPricing(
  status: BillingStatus = freeStatus,
  queryFn: (context?: any) => Promise<any> = async (context) =>
    context?.queryKey?.[0] === "/api/billing/checkout-config"
      ? {
          checkoutProvider: "stripe",
          assignedProvider: "stripe",
          stripeRolloutPercent: 100,
        }
      : status,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, queryFn },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <PricingPage />
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

function checkoutResponse() {
  return {
    json: async () => ({
      provider: "stripe",
      checkoutSessionId: "cs_test_1",
      clientSecret: "cs_secret_test_1",
      publishableKey: "pk_test_liveswell",
    }),
  } as Response;
}

describe("LiveSwell Stripe pricing checkout", () => {
  beforeEach(() => {
    routeMocks.search = "";
    mockAuth(true);
    apiMocks.apiRequest.mockResolvedValue(checkoutResponse());
  });

  afterEach(() => {
    cleanup();
    routeMocks.navigate.mockReset();
    stripeMocks.loadStripe.mockClear();
    stripeMocks.options = null;
    apiMocks.apiRequest.mockReset();
  });

  it("routes signed-out shoppers through Clerk and back to pricing", async () => {
    mockAuth(false);
    const user = userEvent.setup();
    renderPricing();

    await user.click(screen.getByRole("button", { name: /^monthly$/i }));
    await user.click(screen.getByRole("button", { name: /sign in to get pro/i }));

    expect(routeMocks.navigate).toHaveBeenCalledWith(
      "/sign-in?redirect_url=%2Fpricing%3Fplan%3Dmonthly",
    );
    expect(apiMocks.apiRequest).not.toHaveBeenCalled();
  });

  it("keeps checkout neutral and disabled while authoritative status loads", () => {
    renderPricing(
      freeStatus,
      () => new Promise<BillingStatus>(() => {}),
    );

    const loadingButton = screen.getByRole("button", { name: /checking your plan/i });
    expect(loadingButton).toBeDisabled();
    expect(apiMocks.apiRequest).not.toHaveBeenCalled();
  });

  it("creates monthly checkout from the server plan key and embeds Stripe", async () => {
    const user = userEvent.setup();
    renderPricing();

    await screen.findByRole("button", { name: /continue with \$29\.99/i });
    await user.click(screen.getByRole("button", { name: /^monthly$/i }));
    await user.click(screen.getByRole("button", { name: /continue with \$4\.99/i }));

    expect(await screen.findByTestId("embedded-checkout")).toBeInTheDocument();
    expect(apiMocks.apiRequest).toHaveBeenCalledTimes(1);
    expect(apiMocks.apiRequest).toHaveBeenCalledWith(
      "/api/billing/checkout",
      { method: "POST", body: { plan: "monthly", confirmWhopMigration: false } },
    );
    expect(stripeMocks.loadStripe).toHaveBeenCalledWith("pk_test_liveswell");
    expect(String(apiMocks.apiRequest.mock.calls[0][0])).not.toContain("whop");
  });

  it("closes and resumes the same checkout without creating another session", async () => {
    const user = userEvent.setup();
    renderPricing();

    await user.click(await screen.findByRole("button", { name: /continue with \$29\.99/i }));
    await screen.findByTestId("embedded-checkout");
    await user.click(screen.getByRole("button", { name: /close checkout/i }));

    expect(screen.getByText("Checkout paused.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^monthly$/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /resume checkout/i }));

    expect(await screen.findByTestId("embedded-checkout")).toBeInTheDocument();
    expect(apiMocks.apiRequest).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable network error without rendering payment fields", async () => {
    apiMocks.apiRequest.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderPricing();

    await user.click(await screen.findByRole("button", { name: /continue with \$29\.99/i }));

    expect(await screen.findByText(/secure checkout could not be reached/i)).toBeInTheDocument();
    expect(screen.queryByTestId("embedded-checkout")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("blocks checkout when the authoritative plan status cannot be verified", async () => {
    renderPricing(freeStatus, async () => {
      throw new Error("billing unavailable");
    });

    expect(await screen.findByText(/could not verify your current plan/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plan status unavailable/i })).toBeDisabled();
    expect(apiMocks.apiRequest).not.toHaveBeenCalled();
  });

  it("does not open a second checkout for an existing Pro user", async () => {
    renderPricing({
      isPro: true,
      provider: "stripe",
      plan: "annual",
      renewsAt: 1_800_000_000,
      canManageBilling: true,
      managementType: "stripe_in_app",
    });

    const current = await screen.findByRole("button", { name: /pro is active/i });
    expect(current).toBeDisabled();
    expect(screen.getByText(/pro is active\. go find the window/i)).toBeInTheDocument();
    expect(apiMocks.apiRequest).not.toHaveBeenCalled();
  });

  it("requires the legacy member to confirm both migration steps before Stripe checkout", async () => {
    routeMocks.search = "migrate=whop&plan=annual";
    const user = userEvent.setup();
    renderPricing({
      isPro: true,
      provider: "whop",
      plan: "annual",
      renewsAt: 1_800_000_000,
      canManageBilling: true,
      managementType: "whop_hub",
      migration: { state: "available", from: "whop", canStart: true },
    });

    expect(await screen.findByText(/two separate steps/i)).toBeInTheDocument();
    const confirmation = screen.getByRole("checkbox", {
      name: /must cancel Whop myself/i,
    });
    expect(screen.getByRole("button", { name: /confirm both migration steps/i })).toBeDisabled();

    await user.click(confirmation);
    await user.click(screen.getByRole("button", { name: /start new Stripe annual plan/i }));

    expect(apiMocks.apiRequest).toHaveBeenCalledWith("/api/billing/checkout", {
      method: "POST",
      body: { plan: "annual", confirmWhopMigration: true },
    });
    expect(await screen.findByTestId("embedded-checkout")).toBeInTheDocument();
  });

  it("moves from embedded checkout to webhook confirmation without leaving LiveSwell", async () => {
    const user = userEvent.setup();
    renderPricing();

    await user.click(await screen.findByRole("button", { name: /continue with \$29\.99/i }));
    await screen.findByTestId("embedded-checkout");
    expect(stripeMocks.options?.onComplete).toBeTypeOf("function");

    await act(async () => {
      stripeMocks.options?.onComplete?.();
    });

    expect(screen.queryByTestId("embedded-checkout")).not.toBeInTheDocument();
    expect(screen.getByText("Confirming your Pro access")).toBeInTheDocument();
  });

  it("securely confirms the completed checkout when Stripe returns to the pricing URL", async () => {
    routeMocks.search = "stripe_session_id=cs_test_1";
    renderPricing();

    expect(await screen.findByText("Confirming your Pro access")).toBeInTheDocument();
    const pendingButton = screen.getByRole("button", {
      name: /payment confirmation pending/i,
    });
    expect(pendingButton).toBeDisabled();
    await waitFor(() => {
      expect(apiMocks.apiRequest).toHaveBeenCalledWith("/api/billing/checkout/confirm", {
        method: "POST",
        body: { sessionId: "cs_test_1" },
      });
    });
  });

  it("uses an accessible modal that closes with Escape into the paused state", async () => {
    const user = userEvent.setup();
    renderPricing();

    await user.click(await screen.findByRole("button", { name: /continue with \$29\.99/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Checkout paused.")).toBeInTheDocument();
    expect(apiMocks.apiRequest).toHaveBeenCalledTimes(1);
  });
});