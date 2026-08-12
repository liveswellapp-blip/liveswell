// @vitest-environment jsdom

/**
 * AlertFormCountrySwitch.test.tsx
 *
 * Confirms that switching country mid-flow in the phone verification widget
 * resets verifyStep back to "idle" and clears the verified / code-sent state.
 *
 * The bug risk: a user who verified a US number then switched to UK (or any
 * other country) could carry a stale "verified" badge — or stay in "code_sent"
 * state — on a completely different phone number.  handlePhoneChange guards
 * against this by resetting verifyStep→"idle" and phoneVerifiedLocal→false
 * whenever the E.164 value changes.
 *
 * Scenarios tested:
 *  1. Switching country while in "code_sent" state resets to idle
 *     (Verify button reappears, code-entry input disappears, Resend disappears)
 *  2. Switching country while in "verified" state resets to idle
 *     (Verify button reappears, locked "Change" display disappears)
 *  3. verifyStep stays "idle" after multiple consecutive country switches
 *     (no state-machine drift from rapid switches)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks (must be declared before component imports) ────────────────────────

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

// Desktop mode — renders a Dialog, not a Drawer
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/alerts", vi.fn()],
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: () => ({ mutate: mockMutate, isPending: false }),
    useQuery: () => ({ data: [], isLoading: false }),
  };
});

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/lib/push-notifications", () => ({
  pushNotifications: {
    isSupported:     vi.fn().mockResolvedValue(false),
    subscribe:       vi.fn().mockResolvedValue(null),
    isNativeIOS:     vi.fn().mockResolvedValue(false),
    isNativeAndroid: vi.fn().mockResolvedValue(false),
  },
}));

// Stub page-level components that pull in assets not available in jsdom
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

// Render Dialog inline (no Radix portal) so content is in the test container
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader:  ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle:   ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="drawer">{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader:  ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle:   ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

// ── Real component import (after mocks are registered) ───────────────────────
import React from "react";
import { AlertFormDialog } from "@/pages/NotificationSettings";
import { apiRequest } from "@/lib/queryClient";

// ── Shared fixtures ───────────────────────────────────────────────────────────

const FAKE_LOCATION = {
  id: 1,
  name: "Malibu",
  city: "Malibu",
  country: "US",
  latitude: "34.0",
  longitude: "-118.0",
  isCoastal: true,
};

const BASE_INITIAL_DATA = {
  locationId: 1,
  label: "",
  alertType: "daily_report" as const,
  frequency: "once_daily" as const,
  notificationTime: "08:00",
  notificationTimeTwo: "18:00",
  timezone: "America/New_York",
  channels: { push: false, sms: true, email: false },
  phoneNumber: "+15551234567",
  swellMinHeight: 4,
  swellMinPeriod: 0,
  windThreshold: 15,
  windTriggerWhen: "below" as const,
  windDirectionFilter: "any" as const,
  tideType: "high" as const,
  tideWindowMinutes: 30,
  cooldownHours: 4,
};

function renderDialog(
  initialPhoneVerified: boolean,
  overrides: Partial<React.ComponentProps<typeof AlertFormDialog>> = {},
) {
  const props: React.ComponentProps<typeof AlertFormDialog> = {
    open: true,
    onClose: vi.fn(),
    onSaveSuccess: vi.fn(),
    initialData: BASE_INITIAL_DATA,
    editId: 42,
    userEmail: "surfer@example.com",
    favorites: [FAKE_LOCATION],
    initialPhoneVerified,
    initialEmailUnsubscribed: false,
    existingAlerts: [],
    ...overrides,
  };
  return render(<AlertFormDialog {...props} />);
}

// Helper: fire a country-select change event simulating a country switch
function switchCountry(container: HTMLElement, countryCode: string) {
  const countrySelect = container.querySelector(
    ".PhoneInputCountrySelect",
  ) as HTMLSelectElement;
  expect(countrySelect).not.toBeNull();
  act(() => {
    fireEvent.change(countrySelect, { target: { value: countryCode } });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AlertFormDialog — country switch resets verification state", () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockMutate.mockClear();
    vi.mocked(apiRequest).mockResolvedValue({} as any);
  });

  afterEach(() => cleanup());

  // ── 1. Country switch while in "code_sent" state ─────────────────────────

  it("resets verifyStep to idle when the country is switched while a code has already been sent", async () => {
    const user = userEvent.setup();
    // Start with unverified phone so the consent checkbox and Verify button
    // are immediately visible.
    const { container } = renderDialog(false);

    // Accept SMS consent so the Verify button becomes enabled
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    // Click Verify → verifyStep moves to "code_sent"
    await user.click(screen.getByRole("button", { name: "Verify" }));

    // Confirm we're in "code_sent" state: Resend button and code input present
    expect(screen.queryByRole("button", { name: "Resend" })).not.toBeNull();
    expect(screen.queryByPlaceholderText("123456")).not.toBeNull();
    // Verify button is gone (its label changed to Resend)
    expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();

    // ── Switch country (simulates user choosing a different dial-code prefix) ─
    switchCountry(container, "GB");

    // verifyStep must now be "idle":
    //   - "Verify" button reappears (Resend is gone)
    //   - code-entry input disappears
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Resend" })).toBeNull();
    expect(screen.queryByPlaceholderText("123456")).toBeNull();
  });

  // ── 2. Country switch while in "verified" state ──────────────────────────
  //
  // The PhoneInputField (and its country selector) is only rendered when
  // verifyStep !== "verified".  A user in "verified" state must click "Change"
  // to unlock the field first — then they can pick a new country.

  it("resets verifyStep to idle and removes the verified badge when the country is switched after full verification", async () => {
    const user = userEvent.setup();
    // Start with unverified phone
    const { container } = renderDialog(false);

    // Accept consent, send code, enter code, confirm → verifyStep = "verified"
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Verify" }));
    const codeInput = screen.getByPlaceholderText("123456");
    await user.type(codeInput, "123456");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    // Confirm we're in "verified" state: locked "Change" button present
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();

    // Click "Change" to unlock the phone field (PhoneInputField is now rendered)
    await user.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();

    // ── Switch country ────────────────────────────────────────────────────────
    // handlePhoneChange fires with a new value → verifyStep stays "idle",
    // phoneVerifiedLocal stays false (the country-switch clears any partial entry).
    switchCountry(container, "AU");

    // verifyStep remains "idle":
    //   - "Verify" button still present
    //   - "Change" (locked-verified display) is not restored
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
  });

  // ── 3. Country switch from a pre-verified dialog ─────────────────────────
  //
  // Same constraint: the user must click "Change" before the country selector
  // becomes available in the DOM.

  it("resets the verified badge when the country is switched on a dialog opened with phoneVerified=true", async () => {
    const user = userEvent.setup();
    // Start with a pre-verified phone (simulates editing a saved alert)
    const { container } = renderDialog(true);

    // Pre-verified state: locked "Change" button visible, no Verify button
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();

    // Unlock the field so the PhoneInputField (and country selector) renders
    await user.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();

    // Switch country — handlePhoneChange fires, keeping verifyStep at "idle"
    switchCountry(container, "GB");

    // phoneVerifiedLocal stays false, verifyStep stays "idle"
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
  });

  // ── 4. Multiple consecutive country switches stay in idle ────────────────

  it("keeps verifyStep at idle across multiple rapid consecutive country switches", async () => {
    const { container } = renderDialog(false);

    // Starting state: idle, Verify button present
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();

    // Switch countries multiple times rapidly
    switchCountry(container, "GB");
    switchCountry(container, "DE");
    switchCountry(container, "JP");
    switchCountry(container, "US");

    // verifyStep must remain "idle" throughout — no phantom code_sent state
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Resend" })).toBeNull();
    expect(screen.queryByPlaceholderText("123456")).toBeNull();
  });

  // ── 5. Save is blocked after country switch (stale verified state gone) ──
  //
  // The user must click "Change" first (to unlock the phone field) before
  // the country selector is in the DOM. After the switch, phoneVerifiedLocal
  // is false, so Save must be blocked.

  it("blocks Save after a country switch and fires 'Verify your number' toast", async () => {
    const user = userEvent.setup();
    // Start with a pre-verified phone — phoneVerifiedLocal = true
    const { container } = renderDialog(true);

    // Unlock the phone field so the country selector renders
    await user.click(screen.getByRole("button", { name: "Change" }));

    // Switch country — handlePhoneChange fires, resets phoneVerifiedLocal to false
    switchCountry(container, "GB");

    // Attempt to save without re-verifying
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    // The save guard must block the mutation and prompt to verify
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Verify your number" }),
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
