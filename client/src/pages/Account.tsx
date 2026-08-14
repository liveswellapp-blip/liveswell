import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Crown, CreditCard, ArrowRight, Zap, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

interface SubStatus {
  isPro: boolean;
  plan: "monthly" | "annual" | null;
  renewsAt: number | null;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AccountPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect unauthenticated visitors to sign-in, preserving the destination
  // so Clerk returns them here after login.
  if (!authLoading && !isAuthenticated) {
    navigate("/sign-in?redirect_url=" + encodeURIComponent("/account"), { replace: true });
    return null;
  }

  const { data: sub, isLoading: subLoading, isError } = useQuery<SubStatus>({
    queryKey: ["/api/whop/subscription"],
    refetchOnWindowFocus: false,
    // Only fetch once Clerk has confirmed the user is signed in.
    // Prevents a premature unauthenticated request that would show "Free"
    // for a split second while the JWT is still being retrieved.
    enabled: !authLoading && isAuthenticated,
  });

  // Show skeleton while auth OR the subscription query is in-flight
  const isLoading = authLoading || subLoading;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#030a14" }}>
      <Header />

      <main className="flex-1 px-5 pt-8 pb-12 max-w-lg mx-auto w-full">
        <h1 className="text-white font-bold text-xl mb-6">Account &amp; Billing</h1>

        {/* ── Plan card ── */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-slate-500 text-[11px] uppercase tracking-wider mb-3">Current plan</p>

          {isLoading ? (
            <div className="h-6 w-24 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
          ) : isError ? (
            <div className="flex items-center gap-2 text-slate-400 text-[13px]">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <span>Could not load plan info. Please try again later.</span>
            </div>
          ) : sub?.isPro ? (
            <>
              {/* Pro badge */}
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}
                >
                  <Crown size={15} style={{ color: "#fbbf24" }} />
                </div>
                <div>
                  <span className="text-white font-bold text-base">Pro</span>
                  {sub.plan && (
                    <span className="ml-2 text-slate-500 text-[11px] capitalize">{sub.plan}</span>
                  )}
                </div>
              </div>

              {/* Renewal date */}
              {sub.renewsAt && (
                <div className="flex items-center gap-2 mb-5">
                  <CreditCard size={12} className="text-slate-600 flex-shrink-0" />
                  <span className="text-slate-500 text-[12px]">
                    Renews {formatDate(sub.renewsAt)}
                  </span>
                </div>
              )}

              {/* Manage button */}
              <a
                href="https://whop.com/hub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-80"
                style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}
              >
                <span>Manage subscription</span>
                <ArrowRight size={14} style={{ color: "#fbbf24" }} />
              </a>
              <p className="text-slate-700 text-[11px] mt-2 text-center">
                Cancel or update payment info on the Whop portal
              </p>
            </>
          ) : (
            <>
              {/* Free badge */}
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.15)" }}
                >
                  <Zap size={15} className="text-slate-400" />
                </div>
                <span className="text-white font-bold text-base">Free</span>
              </div>

              {/* Upgrade CTA */}
              <Link href="/pricing">
                <a
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}
                >
                  <span>Upgrade to Pro</span>
                  <ArrowRight size={14} style={{ color: "#34d399" }} />
                </a>
              </Link>
              <p className="text-slate-700 text-[11px] mt-2 text-center">
                Unlock SMS, push &amp; email alerts, and AI surf chat
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
