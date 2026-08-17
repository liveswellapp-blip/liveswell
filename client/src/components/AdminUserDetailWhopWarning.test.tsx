// @vitest-environment jsdom

/**
 * admin-user-detail-whop-warning.test.tsx
 *
 * Confirms that when DELETE /api/admin/users/:userId returns HTTP 200 with
 * { whopCancellationFailed: true, whopMembershipId }, the delete mutation's
 * onSuccess handler fires a persistent destructive toast (duration: Infinity)
 * telling the admin to cancel the membership manually in the Whop dashboard.
 *
 * Strategy:
 *   - Mock @tanstack/react-query so useMutation captures each call's options.
 *   - The delete mutation is the 2nd useMutation() registered in the component.
 *   - Call onSuccess directly with the warning payload and assert toast args.
 *
 * Run with:  npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ── Mocks (must precede component imports) ───────────────────────────────────

const mockToast = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ userId: "user_abc123" }),
  useLocation: () => ["/admin/users/user_abc123", mockNavigate],
}));

// Capture every useMutation call's options so we can call onSuccess directly.
const capturedMutations: any[] = [];

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: (opts: any) => {
      capturedMutations.push(opts);
      return { mutate: vi.fn(), isPending: false };
    },
    useQuery: vi.fn(({ queryKey }: { queryKey: any[] }) => {
      // Return authenticated for the admin-status query; loading otherwise
      if (String(queryKey[0]).includes("/api/admin/status")) {
        return { data: { authenticated: true }, isLoading: false };
      }
      return { data: undefined, isLoading: true, refetch: vi.fn() };
    }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useInfiniteQuery: () => ({
      data: undefined,
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    }),
  };
});

// Stub heavy UI/nav components that have no bearing on this test
vi.mock("@/components/AdminNav", () => ({ default: () => null }));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
}));

// ── Real component (imported after mocks are registered) ─────────────────────

import AdminUserDetail from "@/pages/admin-user-detail";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AdminUserDetail – delete mutation Whop cancellation warning", () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    mockToast.mockClear();
    mockNavigate.mockClear();
  });

  afterEach(cleanup);

  const renderAndCapture = () => {
    render(<AdminUserDetail />);
    // The component registers 5 useMutation calls in source order:
    //   0 – testAccessMutation
    //   1 – deleteMutation  ← what we want
    //   2 – suspendMutation
    //   3 – planOverrideMutation
    //   4 – profileMutation
    return capturedMutations[1]; // deleteMutation options
  };

  it("fires a second toast with duration: Infinity when whopCancellationFailed is true", () => {
    const deleteMutationOpts = renderAndCapture();
    expect(deleteMutationOpts, "deleteMutation (index 1) was not captured").toBeTruthy();

    const warningPayload = {
      deleted: true,
      whopCancellationFailed: true,
      whopMembershipId: "mem_abc123",
    };

    deleteMutationOpts.onSuccess(warningPayload);

    // First toast: generic success
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "User deleted" }),
    );

    // Second toast: persistent Whop warning
    const warnCall = mockToast.mock.calls.find(
      ([args]) => args?.title === "Whop membership cancellation failed",
    );
    expect(warnCall, "Whop warning toast was not fired").toBeTruthy();

    const warnArgs = warnCall![0];
    expect(warnArgs.variant).toBe("destructive");
    expect(warnArgs.duration).toBe(Infinity);
    expect(warnArgs.description).toContain("mem_abc123");
  });

  it("does NOT fire the Whop warning toast when cancellation succeeded (null payload)", () => {
    const deleteMutationOpts = renderAndCapture();
    expect(deleteMutationOpts).toBeTruthy();

    deleteMutationOpts.onSuccess(null);

    expect(mockToast).toHaveBeenCalledOnce();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "User deleted" }),
    );
  });

  it("does NOT fire the Whop warning toast when whopCancellationFailed is false", () => {
    const deleteMutationOpts = renderAndCapture();
    expect(deleteMutationOpts).toBeTruthy();

    deleteMutationOpts.onSuccess({ deleted: true, whopCancellationFailed: false });

    expect(mockToast).toHaveBeenCalledOnce();
  });
});
