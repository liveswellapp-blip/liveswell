// @vitest-environment jsdom

/**
 * LiveAlertTest.test.tsx
 *
 * Two describe blocks:
 *
 * 1. "field validation" — confirms client-side validation prevents submission
 *    when required fields are blank.  useMutation is mocked for isolation.
 *
 * 2. "request payload and toast feedback" — confirms the real mutationFn
 *    sends the expected POST body, and that onSuccess/onError callbacks show
 *    the correct toast messages.  useMutation is real (via QueryClientProvider);
 *    fetch is spied upon so no network calls are made.
 *
 * Run with:  npm test
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LiveAlertTest from "./LiveAlertTest";

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Stable data objects — fixed references prevent useEffect from re-firing on
// every re-render (avoids pre-fill from clobbering form state set in tests).
const SPOTS_DATA = {
  logs: [{ id: 1, name: "Malibu", region: "CA" }],
  total: 1,
};
const AUTH_USER_EMPTY: { email?: string } = {};

// useMutation and useQuery are mocked via vi.fn() so each describe block
// configures the behaviour it needs in beforeEach.
const mockedUseMutation = vi.fn();
const mockedUseQuery = vi.fn();

// Captured inside importOriginal so we hold the TRUE original, not the proxy.
// Using these refs in payload tests avoids infinite recursion.
// Must be `var` (not `let/const`) because vi.mock is hoisted above declarations;
// `var` is hoisted AND pre-initialised to undefined so assignment inside the
// factory runs without a TDZ error.
// eslint-disable-next-line no-var
var _realUseMutation: (...args: unknown[]) => unknown;
// eslint-disable-next-line no-var
var _realUseQuery: (...args: unknown[]) => unknown;

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  _realUseMutation = actual.useMutation as (...args: unknown[]) => unknown;
  _realUseQuery = actual.useQuery as (...args: unknown[]) => unknown;
  return {
    ...actual,
    useMutation: (...args: unknown[]) => mockedUseMutation(...args),
    useQuery: (...args: unknown[]) => mockedUseQuery(...args),
  };
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Stub useQuery to return surf spots and an empty auth user. */
function stubUseQueryWithSpots() {
  mockedUseQuery.mockImplementation(
    ({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === "/api/admin/surf-spots") {
        return { data: SPOTS_DATA, isLoading: false };
      }
      if (Array.isArray(queryKey) && queryKey[0] === "/api/auth/user") {
        return { data: AUTH_USER_EMPTY, isLoading: false };
      }
      // /api/user-alerts — no verified phone
      return { data: [], isLoading: false };
    },
  );
}

/** Selects a surf spot so locationId is valid. */
function selectSpot() {
  const select = screen.getByTestId(
    "select-test-location",
  ) as HTMLSelectElement;
  fireEvent.change(select, { target: { value: "1" } });
}

/** Clicks the channel tab button. */
function selectChannel(ch: "SMS" | "Email" | "Both") {
  fireEvent.click(screen.getByRole("button", { name: ch }));
}

/** Fills the email input. */
function fillEmail(value = "admin@example.com") {
  const emailInput = screen.getByTestId(
    "input-test-email",
  ) as HTMLInputElement;
  fireEvent.change(emailInput, { target: { value } });
}

/** Returns the submit button. */
function getSubmitButton() {
  return screen.getByTestId("button-send-test-alert");
}

// ---------------------------------------------------------------------------
// 1. Field-validation tests (useMutation fully mocked)
// ---------------------------------------------------------------------------

describe("LiveAlertTest — field validation", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Isolated mutation mock for validation tests
    mockedUseMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    stubUseQueryWithSpots();
  });

  afterEach(() => {
    cleanup();
  });

  it("submit button is disabled when no surf spot is selected (default email channel)", () => {
    render(<LiveAlertTest />);
    expect(getSubmitButton()).toBeDisabled();
  });

  it("submit button is enabled after a spot is selected and email is filled", () => {
    render(<LiveAlertTest />);
    selectSpot();
    fillEmail();
    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("switching to SMS channel shows the phone-number label", () => {
    render(<LiveAlertTest />);
    selectChannel("SMS");
    const phoneLabel = screen
      .getAllByText(/Phone number/i)
      .find((el) => el.tagName.toLowerCase() === "label");
    expect(phoneLabel).toBeTruthy();
  });

  it("submit button is disabled when channel=sms and phone is blank", () => {
    render(<LiveAlertTest />);
    selectChannel("SMS");
    selectSpot();
    // toPhone starts blank — disabled
    expect(getSubmitButton()).toBeDisabled();
  });

  it("submit button is enabled when channel=sms, phone is filled, and spot is selected", async () => {
    const user = userEvent.setup();
    render(<LiveAlertTest />);
    selectChannel("SMS");
    selectSpot();

    const phoneInput = document.querySelector(
      ".PhoneInputInput",
    ) as HTMLInputElement;
    await user.click(phoneInput);
    await user.type(phoneInput, "5551234567");

    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("submit button is disabled when channel=email and email is blank", () => {
    render(<LiveAlertTest />);
    selectSpot();
    // email is blank (AUTH_USER_EMPTY) → disabled
    expect(getSubmitButton()).toBeDisabled();
  });

  it("submit button is enabled when channel=email and email is filled + spot selected", () => {
    render(<LiveAlertTest />);
    selectSpot();
    fillEmail();
    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("submit button is disabled on channel=both when phone is blank (even with email filled)", () => {
    render(<LiveAlertTest />);
    selectChannel("Both");
    selectSpot();
    fillEmail();
    // toPhone blank → still disabled
    expect(getSubmitButton()).toBeDisabled();
  });

  it("submit button is enabled on channel=both when both phone and email are filled", async () => {
    const user = userEvent.setup();
    render(<LiveAlertTest />);
    selectChannel("Both");
    selectSpot();
    fillEmail();

    const phoneInput = document.querySelector(
      ".PhoneInputInput",
    ) as HTMLInputElement;
    await user.click(phoneInput);
    await user.type(phoneInput, "5551234567");

    expect(getSubmitButton()).not.toBeDisabled();
  });

  it("switching from SMS to Email hides the phone-number label", () => {
    render(<LiveAlertTest />);
    selectChannel("SMS");
    expect(
      screen
        .getAllByText(/Phone number/i)
        .some((el) => el.tagName.toLowerCase() === "label"),
    ).toBe(true);

    selectChannel("Email");
    const phoneLabelAfter = screen
      .queryAllByText(/Phone number/i)
      .find((el) => el.tagName.toLowerCase() === "label");
    expect(phoneLabelAfter).toBeUndefined();
  });

  it("does not call mutate when the submit button is disabled", () => {
    render(<LiveAlertTest />);
    selectChannel("SMS");
    selectSpot();
    // phone blank → disabled
    fireEvent.click(getSubmitButton());
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls mutate when the form is valid and the submit button is clicked", () => {
    render(<LiveAlertTest />);
    selectSpot();
    fillEmail();
    fireEvent.click(getSubmitButton());
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Request payload and toast-feedback tests (real useMutation, fetch spy)
// ---------------------------------------------------------------------------

/**
 * Wrap the component in a fresh QueryClient so real useMutation works.
 * A new QueryClient per test prevents cache bleeding between tests.
 */
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/** Build a Response-like object accepted by fetch spies. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("LiveAlertTest — request payload and toast feedback", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Use the true original useMutation (captured in importOriginal, NOT the proxy)
    // so mutationFn + onSuccess/onError callbacks run without infinite recursion.
    mockedUseMutation.mockImplementation((...args: unknown[]) =>
      _realUseMutation(...args),
    );
    // Keep useQuery stubbed (surf spots + empty auth) to avoid real API calls.
    mockedUseQuery.mockImplementation(
      ({ queryKey }: { queryKey: unknown[] }) => {
        if (
          Array.isArray(queryKey) &&
          queryKey[0] === "/api/admin/surf-spots"
        ) {
          return {
            data: SPOTS_DATA,
            isLoading: false,
            isSuccess: true,
            error: null,
          };
        }
        if (Array.isArray(queryKey) && queryKey[0] === "/api/auth/user") {
          return {
            data: AUTH_USER_EMPTY,
            isLoading: false,
            isSuccess: true,
            error: null,
          };
        }
        return {
          data: [],
          isLoading: false,
          isSuccess: true,
          error: null,
        };
      },
    );

    // Default fetch spy — returns a successful email response.
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ success: true, results: { email: true } }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  // ── POST body ─────────────────────────────────────────────────────────────

  it("sends channel and locationId in the POST body for an email-only send", async () => {
    renderWithQueryClient(<LiveAlertTest />);
    selectSpot();
    fillEmail("surf@example.com");

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    const postCall = fetchSpy.mock.calls.find(
      ([url]) => String(url) === "/api/admin/test-alert",
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.channel).toBe("email");
    expect(body.locationId).toBe(1); // numeric (parseInt'd)
    expect(body.toEmail).toBe("surf@example.com");
    expect(body.toPhone).toBeUndefined(); // not included for email-only
  });

  it("includes toPhone and omits toEmail in the POST body for an SMS-only send", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<LiveAlertTest />);
    selectChannel("SMS");
    selectSpot();

    const phoneInput = document.querySelector(
      ".PhoneInputInput",
    ) as HTMLInputElement;
    await user.click(phoneInput);
    await user.type(phoneInput, "5551234567");

    fetchSpy.mockResolvedValue(
      jsonResponse({ success: true, results: { sms: true } }),
    );

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    const postCall = fetchSpy.mock.calls.find(
      ([url]) => String(url) === "/api/admin/test-alert",
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.channel).toBe("sms");
    expect(body.toPhone).toBe("+15551234567"); // E.164
    expect(body.toEmail).toBeUndefined();
  });

  it("includes alertId in the POST body when the optional alert-ID field is filled", async () => {
    renderWithQueryClient(<LiveAlertTest />);
    selectSpot();
    fillEmail();

    const alertIdInput = screen.getByTestId(
      "input-test-alert-id",
    ) as HTMLInputElement;
    fireEvent.change(alertIdInput, { target: { value: "42" } });

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    const postCall = fetchSpy.mock.calls.find(
      ([url]) => String(url) === "/api/admin/test-alert",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.alertId).toBe(42); // numeric (parseInt'd)
  });

  // ── Toast messages ─────────────────────────────────────────────────────────

  it("shows a success toast after a successful email send", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ success: true, results: { email: true } }),
    );

    renderWithQueryClient(<LiveAlertTest />);
    selectSpot();
    fillEmail();

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    const toastCall = mockToast.mock.calls[0][0];
    expect(toastCall.title).toBe("Test alert sent");
    expect(toastCall.description).toContain("Email");
    expect(toastCall.description).toContain("✓");
  });

  it("shows a destructive toast when the server reports partial failure", async () => {
    fetchSpy.mockResolvedValue(
      // success = false means at least one channel failed
      jsonResponse({ success: false, results: { email: false } }),
    );

    renderWithQueryClient(<LiveAlertTest />);
    selectSpot();
    fillEmail();

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    const toastCall = mockToast.mock.calls[0][0];
    expect(toastCall.title).toBe("Test alert had failures");
    expect(toastCall.variant).toBe("destructive");
    expect(toastCall.description).toContain("✗");
  });

  it("shows a destructive toast when the server returns a non-OK response", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ message: "locationId is required" }, 400),
    );

    renderWithQueryClient(<LiveAlertTest />);
    selectSpot();
    fillEmail();

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    const toastCall = mockToast.mock.calls[0][0];
    expect(toastCall.title).toBe("Test alert failed");
    expect(toastCall.variant).toBe("destructive");
  });
});
