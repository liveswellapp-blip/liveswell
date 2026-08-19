import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { Check, ChevronRight, LockKeyhole, RotateCcw, ShieldCheck, Waves, X } from "lucide-react";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

type SelectedPlan = "monthly" | "annual";
type BillingStatus = {
  isPro: boolean;
  provider: "stripe" | "whop" | "complimentary" | "test" | "free";
  plan: SelectedPlan | null;
  renewsAt: number | null;
  canManageBilling: boolean;
  managementType: "stripe_in_app" | "whop_hub" | null;
  migration: {
    state: "not_applicable" | "available" | "pending" | "awaiting_whop_cancellation" | "completed";
    from: "whop" | null;
    canStart: boolean;
  };
};
type CheckoutBootstrap = {
  provider: "stripe";
  checkoutSessionId: string;
  clientSecret: string;
  publishableKey: string;
};
type CheckoutResponse = CheckoutBootstrap | { provider: "whop"; purchaseUrl: string };
type CheckoutConfig = {
  checkoutProvider: "stripe" | "whop";
  assignedProvider: "stripe" | "whop";
  stripeRolloutPercent: number;
};

const BILLING_QUERY_KEY = ["/api/billing/subscription"] as const;
const CONFIRMATION_TIMEOUT_MS = 45_000;

const plans: Record<SelectedPlan, { price: string; interval: string; copy: string }> = {
  monthly: { price: "$4.99", interval: "month", copy: "Billed monthly. Change or cancel before your next renewal." },
  annual: { price: "$29.99", interval: "year", copy: "Billed once a year. That is about $2.50 per month." },
};
const proFeatures = ["SMS, push, and email condition alerts", "AI surf chat and daily summaries"];
const freeFeatures = ["Real-time NOAA buoy conditions", "Five-day swell and wind forecast", "Tides, sunrise, and sunset times"];

export default function PricingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>(() =>
    new URLSearchParams(search).get("plan") === "monthly" ? "monthly" : "annual",
  );
  const [bootstrap, setBootstrap] = useState<CheckoutBootstrap | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<SelectedPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutDismissed, setCheckoutDismissed] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmationDelayed, setConfirmationDelayed] = useState(false);
  const [confirmationStartedAt, setConfirmationStartedAt] = useState<number | null>(null);
  const [migrationConfirmed, setMigrationConfirmed] = useState(false);
  const confirmedCheckoutSessionRef = useRef<string | null>(null);
  const stripeSessionId = useMemo(() => new URLSearchParams(search).get("stripe_session_id"), [search]);
  const requestedWhopMigration = useMemo(
    () => new URLSearchParams(search).get("migrate") === "whop",
    [search],
  );

  const subscription = useQuery<BillingStatus>({
    queryKey: BILLING_QUERY_KEY,
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchInterval: (query) =>
      confirming && !confirmationDelayed && !query.state.data?.isPro ? 2500 : false,
  });
  const checkoutConfig = useQuery<CheckoutConfig>({
    queryKey: ["/api/billing/checkout-config"],
    refetchOnWindowFocus: false,
  });
  const isPro = subscription.data?.isPro === true;
  const migrationEligible =
    requestedWhopMigration &&
    subscription.data?.provider === "whop" &&
    subscription.data.migration.canStart;
  const migrationAvailableForCohort =
    migrationEligible && checkoutConfig.data?.assignedProvider === "stripe";
  const blocksCheckout = isPro && !migrationEligible;
  const statusUnavailable = isAuthenticated && subscription.isError;
  const statusUnknown =
    authLoading ||
    checkoutConfig.isLoading ||
    checkoutConfig.isError ||
    (isAuthenticated && (subscription.isLoading || statusUnavailable));
  const confirmationPending = confirming || Boolean(stripeSessionId && isAuthenticated);

  useEffect(() => {
    if (stripeSessionId && isAuthenticated) {
      setConfirming(true);
      setConfirmationDelayed(false);
      setConfirmationStartedAt(Date.now());
    }
  }, [stripeSessionId, isAuthenticated]);

  useEffect(() => {
    if (
      !stripeSessionId ||
      !isAuthenticated ||
      confirmedCheckoutSessionRef.current === stripeSessionId
    ) return;

    confirmedCheckoutSessionRef.current = stripeSessionId;
    void apiRequest("/api/billing/checkout/confirm", {
      method: "POST",
      body: { sessionId: stripeSessionId },
    })
      .then(() => queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY }))
      .catch(() => {
        // Keep polling after a transient confirmation failure. The webhook can
        // still update access independently, and the delayed state exposes a
        // manual retry without inviting a duplicate payment.
      });
  }, [isAuthenticated, queryClient, stripeSessionId]);

  useEffect(() => {
    if (isPro) {
      setConfirming(false);
      setConfirmationDelayed(false);
      setConfirmationStartedAt(null);
    }
  }, [isPro]);

  useEffect(() => {
    if (!confirming || isPro || !confirmationStartedAt) return;
    const remaining = Math.max(
      0,
      CONFIRMATION_TIMEOUT_MS - (Date.now() - confirmationStartedAt),
    );
    const timeout = window.setTimeout(() => setConfirmationDelayed(true), remaining);
    return () => window.clearTimeout(timeout);
  }, [confirming, confirmationStartedAt, isPro]);

  const checkout = useMutation({
    mutationFn: async (plan: SelectedPlan) => {
      const response = await apiRequest("/api/billing/checkout", {
        method: "POST",
        body: { plan, confirmWhopMigration: migrationEligible && migrationConfirmed },
      });
      return (await response.json()) as CheckoutResponse;
    },
    onSuccess: (data, plan) => {
      if (data.provider === "whop") {
        window.location.assign(data.purchaseUrl);
        return;
      }
      setBootstrap(data);
      setCheckoutPlan(plan);
      setCheckoutOpen(true);
      setCheckoutDismissed(false);
      setCheckoutError(null);
    },
    onError: (error: Error) => setCheckoutError(formatCheckoutError(error)),
  });

  const startCheckout = useCallback(() => {
    setCheckoutError(null);
    if (!isAuthenticated) {
      navigate(
        `/sign-in?redirect_url=${encodeURIComponent(`/pricing?plan=${selectedPlan}`)}`,
      );
      return;
    }
    if (
      blocksCheckout ||
      statusUnknown ||
      confirmationPending ||
      (migrationEligible && (!migrationConfirmed || !migrationAvailableForCohort))
    ) return;
    if (bootstrap) {
      setCheckoutOpen(true);
      setCheckoutDismissed(false);
      return;
    }
    checkout.mutate(selectedPlan);
  }, [blocksCheckout, bootstrap, checkout, confirmationPending, isAuthenticated, migrationAvailableForCohort, migrationConfirmed, migrationEligible, navigate, selectedPlan, statusUnknown]);

  const onCheckoutComplete = useCallback(() => {
    setConfirming(true);
    setConfirmationDelayed(false);
    setConfirmationStartedAt(Date.now());
    setCheckoutOpen(false);
    setCheckoutDismissed(false);
    queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
  }, [queryClient]);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
    setCheckoutDismissed(true);
  }, []);

  const retryConfirmation = useCallback(() => {
    setConfirmationDelayed(false);
    setConfirmationStartedAt(Date.now());
    void subscription.refetch();
  }, [subscription]);

  const stripe = useMemo(() => (bootstrap ? loadStripe(bootstrap.publishableKey) : null), [bootstrap]);
  const displayedPlan = checkoutPlan ?? selectedPlan;

  return (
    <main className="pricing-shell">
      <style>{styles}</style>
      <nav className="pricing-nav" aria-label="Main navigation">
        <Link href="/" className="brand"><img src={logoImage} alt="LiveSwell" /></Link>
        {isAuthenticated ? <Link href="/" className="nav-action">Open app <ChevronRight size={15} /></Link> : (
          <div className="nav-links"><Link href="/sign-in">Sign in</Link><Link href="/sign-up" className="nav-action">Create account</Link></div>
        )}
      </nav>

      <section className="pricing-hero">
        <h1>When the swell turns on,<br /><em>be ready.</em></h1>
        <p>LiveSwell Pro keeps the right signal close: alerts, AI context, and the confidence to act before the window closes.</p>
      </section>

      {confirming && !isPro && (
        <ConfirmationCard delayed={confirmationDelayed} onRetry={retryConfirmation} />
      )}
       {isPro && !migrationEligible && <SuccessCard status={subscription.data} />}
       {migrationEligible && (
         <div className="alert confirmation" role="status">
           <div>
             <strong>Move billing from Whop to Stripe — two separate steps</strong>
             <span>
               First, start a new Stripe subscription here. Then cancel Whop yourself
               in the Whop Hub. LiveSwell cannot transfer your saved card or cancel
               Whop for you, and both subscriptions may renew until you finish both steps.
             </span>
             {!migrationAvailableForCohort && !checkoutConfig.isLoading && (
               <span>Stripe migration is not enabled for this account yet. Keep managing your current membership in Whop.</span>
             )}
           </div>
         </div>
       )}
      {statusUnavailable && (
        <div className="alert alert-error" role="alert">
          <div>
            <strong>We could not verify your current plan.</strong>
            <span>Checkout is paused so we do not accidentally create a second subscription.</span>
          </div>
          <button onClick={() => void subscription.refetch()}>Try again</button>
        </div>
      )}
      {checkoutError && <div className="alert alert-error" role="alert"><div><strong>Checkout could not start.</strong><span>{checkoutError}</span></div><button onClick={() => { setCheckoutError(null); setBootstrap(null); setCheckoutPlan(null); }}>Try again</button></div>}
      {checkoutDismissed && bootstrap && (
        <div className="alert checkout-paused" role="status">
          <div>
            <strong>Checkout paused.</strong>
            <span>Your {checkoutPlan ?? selectedPlan} selection is still ready. No second checkout will be created.</span>
          </div>
          <button onClick={() => { setCheckoutOpen(true); setCheckoutDismissed(false); }}>Resume checkout</button>
        </div>
      )}

      <section className="plan-grid" aria-label="LiveSwell plans">
        <PlanCard label="Free" price="$0" description="The essential read on every session." features={freeFeatures} button={<Link href={isAuthenticated ? "/" : "/sign-up"} className="button secondary">{isAuthenticated ? "Current plan" : "Start exploring"} <ChevronRight size={16} /></Link>} />
        <div className="plan-card pro-card">
          <div className="pro-ribbon">LIVE SWELL PRO</div>
          <div className="plan-card-top"><div><span className="plan-label">For narrow windows</span><h2>Pro</h2></div><Waves className="wave-mark" size={28} /></div>
          <div className="billing-toggle" role="group" aria-label="Choose billing interval">
            {(Object.keys(plans) as SelectedPlan[]).map((plan) => (
              <button key={plan} className={selectedPlan === plan ? "selected" : ""} onClick={() => setSelectedPlan(plan)} aria-pressed={selectedPlan === plan} disabled={!!bootstrap || confirmationPending}>
                {plan === "annual" ? "Annual" : "Monthly"}{plan === "annual" && <small>save 50%</small>}
              </button>
            ))}
          </div>
          <div className="price-line"><strong>{plans[selectedPlan].price}</strong><span> / {plans[selectedPlan].interval}</span></div>
          <p className="plan-copy">{plans[selectedPlan].copy}</p>
           {migrationEligible && (
             <label className="checkout-note" style={{ alignItems: "flex-start", cursor: "pointer" }}>
               <input
                 type="checkbox"
                 checked={migrationConfirmed}
                 onChange={(event) => setMigrationConfirmed(event.target.checked)}
                 style={{ marginTop: 2 }}
               />
               <span>I understand this starts a separate Stripe subscription and I must cancel Whop myself to avoid two renewals.</span>
             </label>
           )}
           <button className="button primary" onClick={startCheckout} disabled={statusUnknown || blocksCheckout || checkout.isPending || confirmationPending || (migrationEligible && (!migrationConfirmed || !migrationAvailableForCohort))} aria-busy={checkout.isPending || confirmationPending}>
             {statusUnavailable ? "Plan status unavailable" : statusUnknown ? "Checking your plan…" : blocksCheckout ? "Pro is active" : migrationEligible && !migrationAvailableForCohort ? "Migration not available yet" : migrationEligible && !migrationConfirmed ? "Confirm both migration steps" : confirmationPending ? "Payment confirmation pending" : checkout.isPending ? "Preparing secure checkout…" : bootstrap ? `Resume ${plans[displayedPlan].price} checkout` : migrationEligible ? `Start new Stripe ${selectedPlan} plan` : isAuthenticated ? `Continue with ${plans[selectedPlan].price}` : "Sign in to get Pro"}
             {!statusUnknown && !blocksCheckout && !checkout.isPending && !confirmationPending && <ChevronRight size={17} />}
          </button>
           <div className="secure-line"><LockKeyhole size={14} /> Secure payment details handled by {checkoutConfig.data?.assignedProvider === "whop" ? "Whop" : "Stripe"}</div>
          <div className="feature-list">{proFeatures.map((feature) => <div key={feature}><Check size={16} /><span>{feature}</span></div>)}</div>
        </div>
      </section>

      {isPro && subscription.data?.canManageBilling && <div className="manage-row">Already Pro? <Link href="/account">Manage billing <ChevronRight size={14} /></Link></div>}

      <section className="trust-grid">
        <TrustItem icon={<ShieldCheck />} title="No card copying" body="Your selected billing provider handles payment details directly. LiveSwell never moves or stores full card numbers." />
        <TrustItem icon={<RotateCcw />} title="Change your mind" body="Cancel anytime before renewal. Your access stays clear and predictable." />
        <TrustItem icon={<LockKeyhole />} title="Built for trust" body="Auto-renewal terms and your selected interval are shown before payment." />
      </section>

      {bootstrap && stripe && (
        <Dialog.Root open={checkoutOpen} onOpenChange={(open) => { if (!open) closeCheckout(); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="checkout-overlay" />
            <Dialog.Content className="checkout-panel">
            <div className="checkout-header"><div><span className="eyebrow">SECURE CHECKOUT</span><Dialog.Title>Stay in the window.</Dialog.Title><Dialog.Description>{plans[displayedPlan].price} / {plans[displayedPlan].interval} · auto-renews until cancelled</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Close checkout"><X /></button></Dialog.Close></div>
            <div className="checkout-note"><LockKeyhole size={15} /> Stripe encrypts and processes your payment details. LiveSwell never sees your full card number.</div>
            <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret: bootstrap.clientSecret, onComplete: onCheckoutComplete }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
            <Dialog.Close asChild><button className="cancel-checkout">Cancel and return to plans</button></Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </main>
  );
}

function PlanCard({ label, price, description, features, button }: { label: string; price: string; description: string; features: string[]; button: React.ReactNode }) {
  return <div className="plan-card free-card"><span className="plan-label">{label}</span><h2>{price}</h2><p className="plan-copy">{description}</p>{button}<div className="feature-list">{features.map((feature) => <div key={feature}><Check size={16} /><span>{feature}</span></div>)}</div></div>;
}
function TrustItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="trust-item"><div className="trust-icon">{icon}</div><div><h3>{title}</h3><p>{body}</p></div></div>;
}
function ConfirmationCard({ delayed, onRetry }: { delayed: boolean; onRetry: () => void }) {
  return <div className="alert confirmation" role="status"><div className="pulse-dot" /><div><strong>{delayed ? "Confirmation is taking longer than expected" : "Confirming your Pro access"}</strong><span>{delayed ? "Your payment may still be processing. Check again without submitting another payment." : "Your payment is secure. We are waiting for the subscription confirmation, usually just a few seconds."}</span></div>{delayed && <button onClick={onRetry}>Check again</button>}</div>;
}
function SuccessCard({ status }: { status?: BillingStatus }) {
  const renewal = status?.renewsAt ? new Date(status.renewsAt * 1000).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : null;
  return <div className="alert success" role="status"><div className="success-check"><Check size={19} /></div><div><strong>Pro is active. Go find the window.</strong><span>{renewal ? `Your ${status?.plan ?? ""} plan renews on ${renewal}.` : "Alerts and AI surf context are ready when you are."}</span></div><Link href="/" className="button small">Open app</Link></div>;
}

function formatCheckoutError(error: Error): string {
  const jsonStart = error.message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(error.message.slice(jsonStart)) as { message?: string };
      if (body.message) return body.message;
    } catch {
      // Fall through to a stable, user-facing message.
    }
  }
  if (/network|fetch|offline/i.test(error.message)) {
    return "The secure checkout could not be reached. Check your connection and try again.";
  }
  return "We could not prepare the secure checkout. Please try again.";
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
:root { --ink:#eef4f3; --muted:#9aaba9; --deep:#06171b; --panel:#0c2428; --line:rgba(185,224,218,.14); --aqua:#76e3cf; --coral:#ff9a78; }
* { box-sizing:border-box; } .pricing-shell { min-height:100dvh; color:var(--ink); background:radial-gradient(circle at 85% 7%,rgba(51,137,135,.20),transparent 31rem),radial-gradient(circle at 8% 37%,rgba(255,120,89,.08),transparent 24rem),var(--deep); font-family:'DM Sans',sans-serif; overflow:hidden; }
.pricing-shell:before { content:""; pointer-events:none; position:fixed; inset:0; opacity:.035; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E"); }
.pricing-nav { max-width:1180px; margin:auto; padding:22px 28px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); position:relative; z-index:2; } .brand img{width:134px;height:auto;display:block}.nav-links{display:flex;gap:22px;align-items:center}.nav-links a,.manage-row a{color:var(--muted);text-decoration:none;font-size:13px}.nav-action{display:inline-flex;align-items:center;gap:5px;color:var(--deep)!important;background:var(--aqua);border-radius:7px;padding:10px 15px;text-decoration:none;font-weight:700;font-size:13px}
.pricing-hero{max-width:850px;margin:0 auto;padding:82px 28px 58px;text-align:center;position:relative}.eyebrow{font:700 10px 'Space Mono',monospace;letter-spacing:.16em;color:var(--aqua)}.eyebrow-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--coral);margin-right:9px;box-shadow:0 0 0 5px rgba(255,154,120,.1)}h1{font-size:clamp(42px,7vw,78px);line-height:.98;letter-spacing:-.065em;margin:22px 0;color:var(--ink)}h1 em{color:var(--aqua);font-style:normal}.pricing-hero p{max-width:535px;margin:auto;color:var(--muted);font-size:16px;line-height:1.7}
.plan-grid{max-width:1060px;margin:auto;padding:0 28px;display:grid;grid-template-columns:.83fr 1.17fr;gap:18px;align-items:stretch}.plan-card{border:1px solid var(--line);border-radius:14px;padding:32px;background:rgba(12,36,40,.72);position:relative}.pro-card{background:linear-gradient(145deg,rgba(15,53,54,.92),rgba(10,29,34,.92));border-color:rgba(118,227,207,.36);box-shadow:0 24px 70px rgba(0,0,0,.2)}.pro-ribbon{position:absolute;top:0;right:28px;padding:7px 11px;background:var(--coral);color:#261511;border-radius:0 0 7px 7px;font:700 9px 'Space Mono',monospace;letter-spacing:.1em}.plan-label{font:700 10px 'Space Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.plan-card h2{font-size:40px;letter-spacing:-.06em;margin:14px 0 8px}.plan-card-top{display:flex;justify-content:space-between;align-items:start}.wave-mark{color:var(--aqua)}.plan-copy{color:var(--muted);line-height:1.6;font-size:14px;min-height:46px;margin:0 0 24px}.billing-toggle{display:flex;gap:7px;background:rgba(0,0,0,.18);padding:5px;border-radius:8px;margin:22px 0 20px;width:max-content}.billing-toggle button{color:var(--muted);background:transparent;border:0;border-radius:5px;padding:8px 12px;font:600 12px 'DM Sans';cursor:pointer}.billing-toggle button.selected{background:#173d3d;color:var(--aqua)}.billing-toggle button:disabled{cursor:not-allowed;opacity:.62}.billing-toggle small{display:block;color:var(--coral);font-size:9px;margin-top:2px}.price-line{display:flex;align-items:baseline;margin-bottom:5px}.price-line strong{font-size:47px;letter-spacing:-.06em}.price-line span{color:var(--muted);font-size:14px}.button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:7px;padding:13px 15px;text-decoration:none;font:700 13px 'DM Sans';cursor:pointer;transition:transform .18s,opacity .18s;width:100%}.button:hover:not(:disabled){transform:translateY(-2px)}.button.primary{background:var(--aqua);color:#072123}.button.secondary{background:rgba(185,224,218,.08);border:1px solid var(--line);color:var(--ink)}.button.small{width:auto;padding:10px 13px}.button:disabled{opacity:.55;cursor:not-allowed}.secure-line{display:flex;align-items:center;justify-content:center;gap:6px;color:#71918e;font-size:11px;margin:15px 0 25px}.feature-list{border-top:1px solid var(--line);padding-top:20px;margin-top:28px;display:grid;gap:14px}.feature-list div{display:flex;gap:10px;align-items:start;color:#c6d5d2;font-size:13px;line-height:1.35}.feature-list svg{color:var(--aqua);flex:none;margin-top:1px}.free-card .feature-list{margin-top:30px}
.alert{max-width:1060px;margin:0 auto 24px;padding:17px 20px;border-radius:10px;display:flex;align-items:center;gap:13px}.alert strong{display:block;font-size:14px}.alert span{display:block;color:var(--muted);font-size:12px;margin-top:4px;line-height:1.4}.alert button{margin-left:auto;background:transparent;color:var(--coral);border:0;text-decoration:underline;cursor:pointer}.confirmation{border:1px solid rgba(118,227,207,.28);background:rgba(20,67,67,.35)}.confirmation button,.checkout-paused button{color:var(--aqua)}.checkout-paused{border:1px solid rgba(118,227,207,.22);background:rgba(12,36,40,.72)}.pulse-dot{width:9px;height:9px;border-radius:50%;background:var(--aqua);box-shadow:0 0 0 7px rgba(118,227,207,.12)}.success{border:1px solid rgba(118,227,207,.35);background:rgba(36,93,82,.35)}.success-check{background:var(--aqua);color:var(--deep);border-radius:50%;padding:7px;display:flex}.success .button{margin-left:auto}.alert-error{border:1px solid rgba(255,154,120,.4);background:rgba(117,47,37,.25)}.alert-error strong{color:var(--coral)}
.manage-row{text-align:center;color:var(--muted);font-size:12px;margin:28px 0}.manage-row a{color:var(--aqua);display:inline-flex;align-items:center;gap:3px}.trust-grid{max-width:1060px;margin:65px auto 80px;padding:28px;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);gap:26px}.trust-item{display:flex;gap:12px}.trust-icon{color:var(--aqua)}.trust-icon svg{width:21px}.trust-item h3{margin:0 0 6px;font-size:13px}.trust-item p{margin:0;color:var(--muted);font-size:12px;line-height:1.55}
.checkout-overlay{position:fixed;inset:0;background:rgba(2,11,14,.82);backdrop-filter:blur(10px);z-index:20}.checkout-panel{position:fixed;z-index:21;top:30px;left:50%;transform:translateX(-50%);max-height:calc(100dvh - 60px);overflow:auto;background:#f5faf8;color:#193238;border-radius:14px;width:min(690px,calc(100% - 36px));padding:25px;box-shadow:0 25px 100px rgba(0,0,0,.5)}.checkout-header{display:flex;justify-content:space-between;gap:20px}.checkout-header h2{font-size:27px;letter-spacing:-.04em;margin:10px 0 4px}.checkout-header p{margin:0 0 18px;color:#607371;font-size:13px}.icon-button{border:1px solid #d7e2df;background:#fff;border-radius:7px;width:36px;height:36px;cursor:pointer;color:#193238}.checkout-note{display:flex;gap:8px;align-items:center;padding:11px 12px;background:#e7f3ef;color:#52706c;font-size:11px;border-radius:7px;margin-bottom:18px}.cancel-checkout{display:block;margin:15px auto 0;background:none;border:0;color:#607371;text-decoration:underline;cursor:pointer;font-size:12px}
@media(max-width:720px){.pricing-nav{padding:18px 18px}.nav-links{gap:9px}.nav-links a:first-child{display:none}.pricing-hero{padding:65px 20px 42px}.plan-grid{grid-template-columns:1fr;padding:0 18px}.pro-card{order:-1}.plan-card{padding:25px}.trust-grid{grid-template-columns:1fr;margin-top:46px;margin-bottom:35px;padding:24px 18px}.alert{margin-left:18px;margin-right:18px}.success{align-items:flex-start;flex-wrap:wrap}.success .button{margin-left:42px}.checkout-panel{top:12px;max-height:calc(100dvh - 24px);width:calc(100% - 24px);padding:18px}}
`;