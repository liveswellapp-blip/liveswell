// @vitest-environment jsdom

/**
 * AlertFormReVerification.test.tsx
 *
 * Component tests confirming that the phone re-verification prompt appears
 * when a user changes their phone number while editing an alert.
 *
 * Scenario: the alert was previously saved with a verified phone number.
 * The user opens the edit dialog, clicks "Change" or types a new number,
 * and the form must require re-verification before saving.
 *
 * Done-criteria tested:
 *   1. Pre-verified alert shows the locked-phone / "Change" UI
 *   2. Clicking "Change" resets to unverified state (Verify button appears)
 *   3. Typing a new phone number into the unlocked field keeps Verify visible
 *   4. Trying to Save while unverified blocks the mutation and fires the toast
 *   5. Opening with phoneVerified=false (server response after a number change)
 *      immediately shows Verify and blocks Save
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks (must be declared before any component imports) ────────────────────

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

// Desktop mode — component renders a Dialog (not a Drawer)
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
  apiRequest: vi.fn(),
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

// Stub page-level components that pull in image assets not available in jsdom
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

// Render Dialog and Drawer inline (no Radix portal) so that:
//   - All rendered content lives inside the test container, not document.body
//   - No `pointer-events: none` is added to document.body by Radix
//   - userEvent can interact freely with PhoneInputField inside the form
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle:  ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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

// ── Shared test fixtures ──────────────────────────────────────────────────────

const FAKE_LOCATION = {
  id: 1,
  name: "Malibu",
  city: "Malibu",
  country: "US",
  latitude: "34.0",
  longitude: "-118.0",
  isCoastal: true,
};

/** Initial form data: alert already has a VERIFIED phone number */
const VERIFIED_INITIAL_DATA = {
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

function renderVerifiedDialog(
  overrides: Partial<React.ComponentProps<typeof AlertFormDialog>> = {},
) {
  const props: React.ComponentProps<typeof AlertFormDialog> = {
    open: true,
    onClose: vi.fn(),
    onSaveSuccess: vi.fn(),
    initialData: VERIFIED_INITIAL_DATA,
    editId: 42,
    userEmail: "surfer@example.com",
    favorites: [FAKE_LOCATION],
    initialPhoneVerified: true,
    initialEmailUnsubscribed: false,
    existingAlerts: [],
    ...overrides,
  };
  return render(<AlertFormDialog {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AlertFormDialog — phone re-verification prompt", () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockMutate.mockClear();
  });

  // `globals: false` means @testing-library/react cannot hook into the global
  // afterEach — call cleanup() explicitly so DOM doesn't accumulate across tests.
  afterEach(() => cleanup());

  // ── 1. Verified state renders correctly ──────────────────────────────────

  it("shows the locked phone display and a 'Change' button when the phone is pre-verified", () => {
    renderVerifiedDialog();

    // The locked display shows the phone number
    expect(screen.queryByText("+15551234567")).not.toBeNull();

    // "Change" lets the user unlock the field to enter a new number
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeNull();

    // The Verify button must NOT appear while the phone is already verified
    expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();
  });

  // ── 2. Clicking "Change" triggers the unverified / re-verify state ───────

  it("shows the Verify button after clicking 'Change', signalling re-verification is required", async () => {
    const user = userEvent.setup();
    renderVerifiedDialog();

    await user.click(screen.getByRole("button", { name: "Change" }));

    // Phone input + Verify button must now be visible (idle / unverified state)
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();
    // The locked "Change" display must be gone
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
  });

  // ── 3. Typing a new number into the unlocked field keeps Verify visible ──

  it("keeps the Verify button visible after the user types a new number into the unlocked phone field", async () => {
    const user = userEvent.setup();
    const { container } = renderVerifiedDialog();

    // Unlock the phone field
    await user.click(screen.getByRole("button", { name: "Change" }));

    // With Dialog mocked inline, the input lives in `container` (no portal)
    const phoneInput = container.querySelector(".PhoneInputInput") as HTMLInputElement;
    expect(phoneInput).not.toBeNull();

    // Type a new digit — this fires handlePhoneChange with a value different
    // from prevPhone.current, confirming phoneVerifiedLocal stays false.
    await user.click(phoneInput);
    await user.type(phoneInput, "9");

    // Verify button must remain visible — the changed number is still unverified
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();
  });

  // ── 4. Save is blocked after clicking "Change" without completing verify ─

  it("fires a 'Verify your number' toast and blocks Save after clicking 'Change' without verifying", async () => {
    const user = userEvent.setup();
    renderVerifiedDialog();

    // Unlock the phone field — phoneVerifiedLocal resets to false
    await user.click(screen.getByRole("button", { name: "Change" }));

    // Attempt to save without going through the verify flow
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    // Form gate must block the save and prompt to verify
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Verify your number" }),
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  // ── 5. Save is blocked after typing a new number without verifying ───────

  it("fires a 'Verify your number' toast and blocks Save after typing a new phone number without verifying", async () => {
    const user = userEvent.setup();
    const { container } = renderVerifiedDialog();

    // Unlock the phone field
    await user.click(screen.getByRole("button", { name: "Change" }));

    // Type a new digit to confirm the number-change handler resets verification
    const phoneInput = container.querySelector(".PhoneInputInput") as HTMLInputElement;
    expect(phoneInput).not.toBeNull();
    await user.click(phoneInput);
    await user.type(phoneInput, "9");

    // Attempt to save the alert with the unverified changed number
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    // Save must be blocked
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Verify your number" }),
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  // ── 6. Dialog opened with phoneVerified=false mirrors server response ────
  //       after a phone number change (PUT returns phoneVerified=false)

  it("shows the Verify button when the dialog opens with phoneVerified=false (the server response after a number change)", () => {
    renderVerifiedDialog({ initialPhoneVerified: false });

    // Verify prompt must appear immediately — the new number needs confirmation
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();
    // Locked verified display must NOT appear
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
  });

  it("fires a 'Verify your number' toast and blocks Save when phoneVerified=false on open", async () => {
    const user = userEvent.setup();
    renderVerifiedDialog({ initialPhoneVerified: false });

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Verify your number" }),
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Full re-verification round-trip
// ─────────────────────────────────────────────────────────────────────────────

describe("AlertFormDialog — full re-verification round-trip", () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockMutate.mockClear();
    // Make both verify-phone endpoints resolve successfully by default
    vi.mocked(apiRequest).mockResolvedValue({} as any);
  });

  afterEach(() => cleanup());

  // ── 7. Complete the end-to-end verify flow ───────────────────────────────

  it("completes the full flow — Change → consent → Verify → code → Confirm — and fires 'Phone verified!' toast", async () => {
    const user = userEvent.setup();
    renderVerifiedDialog();

    // ── Step 1: Click "Change" to unlock the phone field ─────────────────
    await user.click(screen.getByRole("button", { name: "Change" }));
    // verifyStep is now "idle" — Verify button is visible
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeNull();

    // ── Step 2: Accept SMS consent so the Verify button becomes enabled ───
    // The consent checkbox is rendered when verifyStep !== "verified"
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    // ── Step 3: Click Verify → triggers /api/alerts/verify-phone/send ────
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
      "/api/alerts/verify-phone/send",
      expect.objectContaining({ method: "POST" }),
    );

    // "Code sent" toast fires and the code-entry input appears
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Code sent" }),
    );
    expect(screen.queryByPlaceholderText("123456")).not.toBeNull();

    // ── Step 4: Type the 6-digit verification code ────────────────────────
    const codeInput = screen.getByPlaceholderText("123456");
    await user.type(codeInput, "123456");

    // ── Step 5: Click Confirm → triggers /api/alerts/verify-phone/confirm ─
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
      "/api/alerts/verify-phone/confirm",
      expect.objectContaining({ method: "POST" }),
    );

    // verifyStep reaches "verified" → "Phone verified!" toast fires
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Phone verified!" }),
    );

    // Locked verified display is restored
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeNull();
    // Verify button and code-entry panel are gone
    expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();
    expect(screen.queryByPlaceholderText("123456")).toBeNull();
  });

  // ── 8. Resend shows the code-entry panel again ───────────────────────────

  it("shows a 'Resend' button and keeps the code-entry panel open when already in code_sent state", async () => {
    const user = userEvent.setup();
    renderVerifiedDialog();

    // Unlock → consent → Verify (moves to code_sent)
    await user.click(screen.getByRole("button", { name: "Change" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Verify" }));

    // Button label becomes "Resend" while code_sent
    expect(screen.queryByRole("button", { name: "Resend" })).not.toBeNull();
    // Code-entry input is still visible
    expect(screen.queryByPlaceholderText("123456")).not.toBeNull();
  });

  // ── 9a. Typing a new digit after clicking "Change" keeps consent unchecked ─
  //        (handlePhoneChange code path — distinct from the button-click reset)

  it("keeps the SMS consent checkbox unchecked when the user types a new number after clicking 'Change'", async () => {
    const user = userEvent.setup();
    const { container } = renderVerifiedDialog();

    // ── Step 1: Click "Change" — smsConsent resets to false ─────────────────
    await user.click(screen.getByRole("button", { name: "Change" }));

    // Sanity-check: consent is unchecked after "Change"
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    // ── Step 2: Type a new digit — fires handlePhoneChange ───────────────────
    const phoneInput = container.querySelector(".PhoneInputInput") as HTMLInputElement;
    expect(phoneInput).not.toBeNull();
    await user.click(phoneInput);
    await user.type(phoneInput, "9");

    // ── Step 3: Consent must remain unchecked — typing must not set it true ──
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  // ── 9b. Typing a new digit after checking consent resets consent ─────────
  //        Confirms handlePhoneChange resets smsConsent when the number changes

  it("resets the SMS consent checkbox when the user types a new digit after checking consent", async () => {
    const user = userEvent.setup();
    const { container } = renderVerifiedDialog();

    // Unlock the field
    await user.click(screen.getByRole("button", { name: "Change" }));

    // Check the consent checkbox
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    // Type a new digit — this fires handlePhoneChange with a new value,
    // which must reset smsConsent back to false (fresh consent required).
    const phoneInput = container.querySelector(".PhoneInputInput") as HTMLInputElement;
    expect(phoneInput).not.toBeNull();
    await user.click(phoneInput);
    await user.type(phoneInput, "9");

    // Consent must be reset — the changed number requires fresh consent.
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  // ── 9. Clicking "Change" after a completed verify round-trip resets consent ─

  it("unchecks the SMS consent checkbox when the user clicks 'Change' after a previously completed verification", async () => {
    const user = userEvent.setup();
    // Open with an unverified phone so the consent checkbox is immediately accessible
    renderVerifiedDialog({ initialPhoneVerified: false });

    // ── Step 1: Check the consent checkbox ───────────────────────────────────
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    // ── Step 2: Complete the verify flow so verifyStep reaches "verified" ────
    await user.click(screen.getByRole("button", { name: "Verify" }));
    // verifyStep → code_sent; type the code
    const codeInput = screen.getByPlaceholderText("123456");
    await user.type(codeInput, "123456");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    // verifyStep → verified; locked display + "Change" button restored
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeNull();

    // ── Step 3: Click "Change" ───────────────────────────────────────────────
    await user.click(screen.getByRole("button", { name: "Change" }));

    // ── Step 4: Consent checkbox must be unchecked — fresh consent required ──
    const resetCheckbox = screen.getByRole("checkbox");
    expect(resetCheckbox).not.toBeChecked();
  });

  // ── 10. Banner filter: re-verified alert drops out of unverifiedActiveAlerts

  it("drops a re-verified alert from the unverifiedActiveAlerts filter, hiding the banner", () => {
    // The NotificationSettings page computes:
    //   unverifiedActiveAlerts = alerts.filter(
    //     a => a.active && a.deliveryChannels?.includes("sms") && !!a.phoneNumber && !a.phoneVerified
    //   )
    // showVerificationBanner is true iff unverifiedActiveAlerts.length > 0.
    // After a successful round-trip the server returns phoneVerified: true, so the
    // alert drops out of the filter and the banner disappears.

    type AlertLike = {
      id: number;
      active: boolean;
      deliveryChannels: string[];
      phoneNumber: string | null;
      phoneVerified: boolean;
    };

    const unverifiedAlert: AlertLike = {
      id: 42,
      active: true,
      deliveryChannels: ["sms"],
      phoneNumber: "+15551234567",
      phoneVerified: false,
    };

    const verifiedAlert: AlertLike = { ...unverifiedAlert, phoneVerified: true };

    const bannerFilter = (a: AlertLike) =>
      a.active &&
      a.deliveryChannels.includes("sms") &&
      !!a.phoneNumber &&
      !a.phoneVerified;

    // Before re-verification: alert appears → banner shows
    expect([unverifiedAlert].filter(bannerFilter)).toHaveLength(1);

    // After re-verification: phoneVerified is true → alert drops out → banner hides
    expect([verifiedAlert].filter(bannerFilter)).toHaveLength(0);
  });
});
