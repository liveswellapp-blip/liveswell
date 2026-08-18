// @vitest-environment jsdom

/**
 * NotificationSettingsAddAlertSkeleton.test.tsx
 *
 * Confirms that the "Add Alert" area shows a loading skeleton while Clerk auth
 * or the Whop subscription check is in-flight, and only shows the locked
 * (→ /pricing) button once both flags have settled to false.
 *
 * This is a regression guard for the two rendering branches added to
 * NotificationSettings at lines 1597-1617 (header bar) and 1757-1776
 * (empty-state body).
 *
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── Mocks (must precede component imports) ────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/notifications", mockNavigate],
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: vi.fn(({ queryKey }: { queryKey: any[] }) => {
      // user-alerts → empty list so the empty-state skeleton branch also renders
      if (String(queryKey[0]).includes("/api/user-alerts")) {
        return { data: [], isLoading: false };
      }
      return { data: [], isLoading: false };
    }),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useQueryClient: () => ({ invalidateQueries: vi.fn(), clear: vi.fn() }),
  };
});

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("@/lib/push-notifications", () => ({
  pushNotifications: {
    isSupported: () => false,
    getSubscription: () => Promise.resolve(null),
    subscribe: () => Promise.resolve(null),
    unsubscribe: () => Promise.resolve(false),
  },
}));

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/PhoneInputField", () => ({
  PhoneInputField: () => null,
}));

// ── Component import (after mocks) ────────────────────────────────────────────

import { useAuth } from "@/hooks/useAuth";
import NotificationSettings from "@/pages/NotificationSettings";

// ── Helpers ───────────────────────────────────────────────────────────────────

type AuthReturnValue = {
  user: null | { id: string; email: string | null; firstName: string | null; lastName: string | null; profileImageUrl: string | null };
  isLoading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  isProLoading: boolean;
  logout: () => Promise<void>;
};

function mockAuth(overrides: Partial<AuthReturnValue>) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isPro: false,
    isProLoading: false,
    logout: vi.fn(),
    ...overrides,
  } as any);
}

const AUTHED_USER = {
  id: "user_123",
  email: "surfer@test.com",
  firstName: "Wave",
  lastName: "Rider",
  profileImageUrl: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("NotificationSettings – Add Alert skeleton during loading", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(cleanup);

  it("shows a skeleton and hides the locked button when Clerk auth is still loading (isLoading: true)", () => {
    mockAuth({ isLoading: true, isPro: false, isProLoading: false });

    render(<NotificationSettings />);

    // At least one animate-pulse skeleton div must be present
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);

    // The "PRO" badge that lives exclusively inside the locked button must NOT appear
    expect(screen.queryByText("PRO")).toBeNull();
  });

  it("shows a skeleton and hides the locked button when the Whop subscription check is in-flight (isProLoading: true)", () => {
    mockAuth({
      user: AUTHED_USER,
      isLoading: false,
      isAuthenticated: true,
      isPro: false,
      isProLoading: true,
    });

    render(<NotificationSettings />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);

    // The locked button's PRO badge must not appear while subscription is loading
    expect(screen.queryByText("PRO")).toBeNull();
  });

  it("shows the locked button (navigates to /pricing) only when both loading flags are false and isPro is false", async () => {
    mockAuth({
      user: AUTHED_USER,
      isLoading: false,
      isAuthenticated: true,
      isPro: false,
      isProLoading: false,
    });

    const user = userEvent.setup();
    render(<NotificationSettings />);

    // No skeleton expected once both loading flags are false
    // (there may still be other animate-pulse elements from data fetches,
    //  but the Add Alert button area should show the locked button)

    // The PRO badge is unique to the locked state buttons
    const proBadges = screen.getAllByText("PRO");
    expect(proBadges.length).toBeGreaterThan(0);

    // Find a button that contains the PRO badge (the locked Add Alert button)
    const lockedButton = proBadges[0].closest("button");
    expect(lockedButton).not.toBeNull();

    // Clicking the locked button should navigate to /pricing
    await user.click(lockedButton!);
    expect(mockNavigate).toHaveBeenCalledWith("/pricing");
  });

  it("transitions from skeleton to green Add Alert button without extra user action when isPro resolves to true", async () => {
    // Phase 1 – subscription check still in-flight
    mockAuth({
      user: AUTHED_USER,
      isLoading: false,
      isAuthenticated: true,
      isPro: false,
      isProLoading: true,
    });

    const { rerender } = render(<NotificationSettings />);

    // Skeleton must be present and green "Add Alert" button must not exist
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    // The green button has no PRO badge and no Lock icon — its text is just "Add Alert"
    // but since the locked button also contains "Add Alert", we look for absence of PRO badge
    expect(screen.queryByText("PRO")).toBeNull();

    // Phase 2 – Whop query resolves: user is Pro
    mockAuth({
      user: AUTHED_USER,
      isLoading: false,
      isAuthenticated: true,
      isPro: true,
      isProLoading: false,
    });

    await act(async () => {
      rerender(<NotificationSettings />);
    });

    // The skeleton divs that guard the Add Alert area must be gone:
    // specifically, neither of the two subscription-gated skeletons should remain.
    // (Other animate-pulse elements from data loading may still exist, so we check
    //  for the PRO badge being absent rather than requiring zero skeletons.)
    expect(screen.queryByText("PRO")).toBeNull();

    // The green Add Alert button must now be visible — it contains the text "Add Alert"
    // and does NOT contain a Lock icon or a PRO badge.
    const addAlertButtons = screen.getAllByText("Add Alert");
    // At least the header-bar green button should appear
    expect(addAlertButtons.length).toBeGreaterThan(0);

    // Confirm none of those buttons navigate to /pricing (i.e. none are the locked variant)
    for (const el of addAlertButtons) {
      const btn = el.closest("button");
      if (btn) {
        expect(btn.textContent).not.toContain("PRO");
      }
    }
  });
});
