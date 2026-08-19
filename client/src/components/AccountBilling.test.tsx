// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ navigate: vi.fn(), search: "" }));
const api = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("wouter", () => ({
  useLocation: () => ["/account", route.navigate],
  useSearch: () => route.search,
  Link: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@/lib/queryClient", () => ({ apiRequest: api.request }));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(() => Promise.resolve({})) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: any) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element">Stripe card form</div>,
  useStripe: () => ({ confirmSetup: vi.fn() }),
  useElements: () => ({}),
}));

import { useAuth } from "@/hooks/useAuth";
import AccountPage from "@/pages/Account";

const activeStripe: any = {
  isPro: true, provider: "stripe", plan: "monthly", renewsAt: 1_800_000_000, periodEndsAt: 1_800_000_000,
  subscriptionStatus: "active", accessState: "active", cancelAtPeriodEnd: false,
  paymentMethod: { brand: "visa", last4: "4242", expMonth: 10, expYear: 2030 },
  invoices: [{ id: "in_1", number: "A-1", status: "paid", createdAt: 1_700_000_000, amountPaid: 499, currency: "usd" }],
  providerState: "live", canManageBilling: true, managementType: "stripe_in_app",
};

function renderAccount(status: any = activeStripe, queryFn: () => Promise<any> = async () => status) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, queryFn }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}><AccountPage /></QueryClientProvider>);
}

describe("Account billing workspace", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user_1" }, isAuthenticated: true, isLoading: false, isPro: true, isProLoading: false, logout: vi.fn(),
    } as any);
    api.request.mockResolvedValue({ json: async () => ({ clientSecret: "seti_secret", publishableKey: "pk_test" }) });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Stripe self-service controls and calls the safe cancel endpoint", async () => {
    const user = userEvent.setup();
    renderAccount();

    expect(await screen.findByText("LiveSwell Pro")).toBeInTheDocument();
    expect(screen.getByText(/visa •••• 4242/i)).toBeInTheDocument();
    expect(screen.getByText("$4.99")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cancel at period end/i }));

    expect(api.request).toHaveBeenCalledWith(
      "/api/stripe/subscription/cancel",
      expect.objectContaining({ method: "POST", body: expect.objectContaining({ requestId: expect.any(String) }) }),
    );
  });

  it("uses Stripe Payment Element rather than custom card fields", async () => {
    const user = userEvent.setup();
    renderAccount();

    await user.click(await screen.findByRole("button", { name: /update/i }));

    expect(api.request).toHaveBeenCalledWith("/api/stripe/payment-method/setup", expect.objectContaining({ method: "POST" }));
    expect(await screen.findByTestId("payment-element")).toBeInTheDocument();
    expect(screen.getByText(/never sees the full number/i)).toBeInTheDocument();
  });

  it("shows the correct non-Stripe management paths", async () => {
    renderAccount({ ...activeStripe, provider: "complimentary", plan: null, canManageBilling: false, managementType: null });
    expect(await screen.findByText("Complimentary Pro access")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel at period end/i })).not.toBeInTheDocument();
    cleanup();

    renderAccount({ ...activeStripe, provider: "whop", plan: "annual", managementType: "whop_hub" });
    expect(await screen.findByText("Legacy Whop subscription")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage on whop/i })).toHaveAttribute("href", "https://whop.com/hub");
  });

  it("shows a retry state when the provider status cannot be read", async () => {
    renderAccount(activeStripe, async () => { throw new Error("provider unavailable"); });
    expect(await screen.findByText(/could not load billing details/i)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument());
  });
});