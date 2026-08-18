import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import { CheckCircle, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Password-change page used by the admin-triggered password reset flow.
 *
 * When an admin sends a reset email, the link is:
 *   /sign-in?__clerk_ticket=TOKEN&redirect_url=/change-password
 * Clerk processes the one-time ticket on /sign-in, authenticates the user,
 * and then redirects them here so they can set a new password.
 */
export default function ChangePasswordPage() {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Redirect unauthenticated visitors to sign-in, preserving this destination.
  if (!isLoading && !isAuthenticated) {
    navigate("/sign-in?redirect_url=" + encodeURIComponent("/change-password"), { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    try {
      await user!.updatePassword({
        newPassword,
        signOutOfOtherSessions: true,
      });
      setStatus("success");
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Failed to update password — please try again.";
      setErrorMsg(msg);
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#030a14" }}>
      <Header />
      <main className="flex-1 flex items-start justify-center px-4 pt-12 pb-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Set a new password
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === "success" ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="font-semibold text-lg">Password updated</p>
                <p className="text-muted-foreground text-sm">
                  Your new password has been saved. All other sessions have been signed out.
                </p>
                <Button onClick={() => navigate("/")} className="mt-2">
                  Go to the app
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose a strong password for your LiveSwell account.
                </p>
                <div>
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="mt-1"
                    data-testid="input-new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repeat your new password"
                    className="mt-1"
                    data-testid="input-confirm-password"
                  />
                </div>
                {status === "error" && (
                  <p className="text-sm text-destructive" data-testid="change-password-error">
                    {errorMsg}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={status === "saving"}
                  data-testid="button-set-password"
                >
                  {status === "saving" ? "Saving…" : "Set new password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
