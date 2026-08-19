import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Crown,
  ExternalLink,
  FileDown,
  RefreshCw,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

type Plan = "monthly" | "annual";
type Provider = "stripe" | "whop" | "complimentary" | "test" | "free";
type BillingStatus = {
  isPro: boolean;
  provider: Provider;
  plan: Plan | null;
  renewsAt: number | null;
  periodEndsAt: number | null;
  subscriptionStatus: string | null;
  accessState: "active" | "grace" | "canceled" | "incomplete" | "unpaid" | "unknown";
  cancelAtPeriodEnd: boolean;
  paymentMethod: { brand: string; last4: string; expMonth: number | null; expYear: number | null } | null;
  invoices: Array<{ id: string; number: string | null; status: string | null; createdAt: number; amountPaid: number; currency: string }>;
  providerState: "live" | "cached" | "not_applicable";
  canManageBilling: boolean;
  managementType: "stripe_in_app" | "whop_hub" | null;
};

type PaymentSetup = { clientSecret: string; publishableKey: string };
const BILLING_QUERY_KEY = ["/api/billing/subscription"] as const;

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function errorText(error: Error, fallback: string) {
  const jsonStart = error.message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const payload = JSON.parse(error.message.slice(jsonStart)) as { message?: string };
      if (payload.message) return payload.message;
    } catch {
      // A stable fallback is safer than showing a raw API response.
    }
  }
  return fallback;
}

export default function AccountPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const queryClient = useQueryClient();
  const [setup, setSetup] = useState<PaymentSetup | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const completedSetupRef = useRef<string | null>(null);

  if (!authLoading && !isAuthenticated) {
    navigate(`/sign-in?redirect_url=${encodeURIComponent("/account")}`, { replace: true });
    return null;
  }

  const billing = useQuery<BillingStatus>({
    queryKey: BILLING_QUERY_KEY,
    enabled: !authLoading && isAuthenticated,
  });

  const invalidateBilling = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
  }, [queryClient]);

  const cancel = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/stripe/subscription/cancel", {
        method: "POST",
        body: { requestId: requestId() },
      });
    },
    onSuccess: async () => {
      setNotice("Your subscription will end after the current billing period.");
      await invalidateBilling();
    },
  });

  const resume = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/stripe/subscription/resume", {
        method: "POST",
        body: { requestId: requestId() },
      });
    },
    onSuccess: async () => {
      setNotice("Your subscription is active again.");
      await invalidateBilling();
    },
  });

  const changePlan = useMutation({
    mutationFn: async (plan: Plan) => {
      await apiRequest("/api/stripe/subscription/plan", {
        method: "POST",
        body: { plan, requestId: requestId() },
      });
    },
    onSuccess: async () => {
      setNotice("Your plan change is being applied. Any Stripe proration is shown on your next invoice.");
      await invalidateBilling();
    },
  });

  const startPaymentSetup = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/stripe/payment-method/setup", {
        method: "POST",
        body: { requestId: requestId() },
      });
      return (await response.json()) as PaymentSetup;
    },
    onSuccess: (nextSetup) => {
      setSetup(nextSetup);
      setSetupOpen(true);
    },
  });

  const finishPaymentSetup = useMutation({
    mutationFn: async (setupIntentId: string) => {
      await apiRequest("/api/stripe/payment-method/complete", {
        method: "POST",
        body: { setupIntentId },
      });
    },
    onSuccess: async () => {
      setSetup(null);
      setSetupOpen(false);
      setNotice("Your payment method is updated and ready for future renewals.");
      await invalidateBilling();
    },
  });

  const returnedSetupIntent = useMemo(
    () => new URLSearchParams(search).get("setup_intent"),
    [search],
  );

  useEffect(() => {
    if (
      !returnedSetupIntent ||
      !isAuthenticated ||
      billing.data?.provider !== "stripe" ||
      completedSetupRef.current === returnedSetupIntent
    ) {
      return;
    }
    completedSetupRef.current = returnedSetupIntent;
    finishPaymentSetup.mutate(returnedSetupIntent);
    window.history.replaceState({}, "", "/account");
  }, [billing.data?.provider, finishPaymentSetup, isAuthenticated, returnedSetupIntent]);

  const stripe = useMemo(
    () => (setup ? loadStripe(setup.publishableKey) : null),
    [setup],
  );
  const isLoading = authLoading || billing.isLoading;
  const actionError = [cancel.error, resume.error, changePlan.error, startPaymentSetup.error, finishPaymentSetup.error]
    .find((error): error is Error => error instanceof Error);

  return (
    <div className="min-h-screen flex flex-col bg-[#030a14]">
      <Header />
      <main className="flex-1 w-full max-w-2xl mx-auto px-5 pt-8 pb-14">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-emerald-300 text-[10px] font-bold tracking-[.18em] uppercase mb-2">LiveSwell account</p>
            <h1 className="text-white font-bold text-2xl tracking-tight">Account &amp; Billing</h1>
          </div>
          <Link href="/pricing" className="text-emerald-300 text-xs font-semibold inline-flex items-center gap-1">
            Plans <ChevronRight size={14} />
          </Link>
        </div>

        {notice && <Notice tone="success" onDismiss={() => setNotice(null)}>{notice}</Notice>}
        {actionError && <Notice tone="error" onDismiss={() => {
          cancel.reset(); resume.reset(); changePlan.reset(); startPaymentSetup.reset(); finishPaymentSetup.reset();
        }}>{errorText(actionError, "We could not update billing. Please try again.")}</Notice>}

        {isLoading ? <LoadingCard /> : billing.isError ? (
          <ErrorCard onRetry={() => void billing.refetch()} />
        ) : billing.data ? (
          <BillingWorkspace
            status={billing.data}
            cancelPending={cancel.isPending}
            resumePending={resume.isPending}
            planPending={changePlan.isPending}
            paymentPending={startPaymentSetup.isPending || finishPaymentSetup.isPending}
            onCancel={() => cancel.mutate()}
            onResume={() => resume.mutate()}
            onChangePlan={(plan) => changePlan.mutate(plan)}
            onUpdatePayment={() => startPaymentSetup.mutate()}
          />
        ) : null}
      </main>
      <Footer />

      {setup && stripe && (
        <Dialog.Root open={setupOpen} onOpenChange={(open) => {
          setSetupOpen(open);
          if (!open) setSetup(null);
        }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm" />
            <Dialog.Content className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0a1724] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <Dialog.Title className="text-white font-bold text-lg">Update payment method</Dialog.Title>
                  <Dialog.Description className="text-slate-400 text-xs mt-1">Your card details go directly to Stripe. LiveSwell never sees the full number.</Dialog.Description>
                </div>
                <Dialog.Close asChild><button aria-label="Close payment method form" className="text-slate-400 hover:text-white"><X size={19} /></button></Dialog.Close>
              </div>
              <Elements stripe={stripe} options={{ clientSecret: setup.clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#6ee7b7", colorBackground: "#0a1724", colorText: "#f8fafc" } } }}>
                <PaymentMethodForm
                  isCompleting={finishPaymentSetup.isPending}
                  onComplete={(setupIntentId) => finishPaymentSetup.mutate(setupIntentId)}
                />
              </Elements>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}

function BillingWorkspace({
  status,
  cancelPending,
  resumePending,
  planPending,
  paymentPending,
  onCancel,
  onResume,
  onChangePlan,
  onUpdatePayment,
}: {
  status: BillingStatus;
  cancelPending: boolean;
  resumePending: boolean;
  planPending: boolean;
  paymentPending: boolean;
  onCancel: () => void;
  onResume: () => void;
  onChangePlan: (plan: Plan) => void;
  onUpdatePayment: () => void;
}) {
  const stripeManaged = status.provider === "stripe" && status.canManageBilling;
  const alternatePlan: Plan = status.plan === "monthly" ? "annual" : "monthly";

  return (
    <div className="space-y-4">
      {status.providerState === "cached" && (
        <Notice tone="warning">Live billing details are temporarily unavailable. Your saved account access is shown; try again shortly before making changes.</Notice>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
        <p className="text-slate-500 text-[10px] uppercase tracking-[.16em] font-bold mb-4">Current access</p>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-300/10 border border-amber-300/25 flex items-center justify-center shrink-0">
            {status.isPro ? <Crown size={19} className="text-amber-300" /> : <Zap size={19} className="text-slate-400" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold">{status.isPro ? "LiveSwell Pro" : "Free"}</h2>
            <p className="text-slate-400 text-xs mt-1">{accessDescription(status)}</p>
          </div>
        </div>
        {status.provider === "free" && <Link href="/pricing" className="mt-5 flex items-center justify-between rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-white text-sm font-semibold"><span>Upgrade to Pro</span><ArrowRight size={16} className="text-emerald-300" /></Link>}
      </section>

      {status.provider === "whop" && (
        <section className="rounded-2xl border border-violet-300/20 bg-violet-300/[.06] p-5">
          <h2 className="text-white font-semibold text-sm">Legacy Whop subscription</h2>
          <p className="text-slate-400 text-xs leading-relaxed mt-2">This subscription is still managed through Whop during the transition. Your LiveSwell access remains unchanged.</p>
          <a href="https://whop.com/hub" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-between rounded-xl border border-violet-300/25 px-4 py-3 text-sm font-semibold text-white"><span>Manage on Whop</span><ExternalLink size={15} className="text-violet-200" /></a>
        </section>
      )}

      {(status.provider === "complimentary" || status.provider === "test") && (
        <section className="rounded-2xl border border-sky-300/20 bg-sky-300/[.06] p-5">
          <h2 className="text-white font-semibold text-sm">{status.provider === "test" ? "Test account access" : "Complimentary Pro access"}</h2>
          <p className="text-slate-400 text-xs leading-relaxed mt-2">{status.provider === "test" ? "Your Pro access is enabled for testing. No subscription or payment method is attached." : "Your Pro access was granted directly. There is no subscription to manage or cancel."}</p>
        </section>
      )}

      {status.provider === "stripe" && (
        <>
          <StripeStatusNotice status={status} />
          <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-[.16em] font-bold">Stripe subscription</p>
                <h2 className="text-white font-bold text-lg capitalize mt-1">{status.plan ?? "Pro"} plan</h2>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-emerald-200">{status.subscriptionStatus ?? "Unknown"}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoTile label={status.cancelAtPeriodEnd ? "Access ends" : "Next renewal"} value={formatDate(status.periodEndsAt)} icon={<CalendarClock size={15} />} />
              <InfoTile label="Billing interval" value={status.plan ? `${status.plan[0].toUpperCase()}${status.plan.slice(1)}` : "—"} icon={<CreditCard size={15} />} />
            </div>
            {stripeManaged && (
              <div className="mt-5 grid gap-2">
                <button disabled={planPending || cancelPending || resumePending} onClick={() => onChangePlan(alternatePlan)} className="w-full rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-left text-sm text-white hover:bg-white/[.08] disabled:opacity-55">
                  <span className="font-semibold">Switch to {alternatePlan}</span>
                  <span className="block text-slate-400 text-[11px] mt-0.5">Stripe applies any required prorated credit or charge.</span>
                </button>
                {status.cancelAtPeriodEnd ? (
                  <button disabled={resumePending || planPending} onClick={onResume} className="rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-55">{resumePending ? "Resuming…" : "Resume subscription"}</button>
                ) : (
                  <button disabled={cancelPending || planPending} onClick={onCancel} className="rounded-xl border border-rose-300/35 bg-rose-300/[.08] px-4 py-3 text-sm font-semibold text-rose-100 disabled:opacity-55">{cancelPending ? "Scheduling cancellation…" : "Cancel at period end"}</button>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-[.16em] font-bold">Payment method</p>
                {status.paymentMethod ? (
                  <p className="text-white text-sm mt-2 capitalize">{status.paymentMethod.brand} •••• {status.paymentMethod.last4}<span className="text-slate-500 ml-2">exp {status.paymentMethod.expMonth}/{status.paymentMethod.expYear}</span></p>
                ) : <p className="text-slate-400 text-xs mt-2">No card summary is available.</p>}
              </div>
              {stripeManaged && <button onClick={onUpdatePayment} disabled={paymentPending} className="rounded-lg border border-emerald-300/25 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-55">{paymentPending ? "Preparing…" : status.paymentMethod ? "Update" : "Add card"}</button>}
            </div>
            <p className="text-slate-500 text-[11px] mt-3 flex gap-1.5"><ShieldCheck size={13} className="text-emerald-300 shrink-0" /> Payment details are securely collected by Stripe.</p>
          </section>

          <InvoiceHistory invoices={status.invoices} />
        </>
      )}
    </div>
  );
}

function PaymentMethodForm({ onComplete, isCompleting }: { onComplete: (setupIntentId: string) => void; isCompleting: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const result = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/account` },
      redirect: "if_required",
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Stripe could not verify this payment method.");
      return;
    }
    if (result.setupIntent?.id) onComplete(result.setupIntent.id);
  };

  return <form onSubmit={submit}>
    <PaymentElement options={{ layout: "tabs" }} />
    {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}
    <button disabled={!stripe || !elements || submitting || isCompleting} className="mt-5 w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-55">{submitting || isCompleting ? "Saving securely…" : "Save payment method"}</button>
  </form>;
}

function StripeStatusNotice({ status }: { status: BillingStatus }) {
  if (status.accessState === "grace") return <Notice tone="warning"><strong>Payment needs attention.</strong> Stripe is retrying your renewal, and Pro remains active during this grace period. Update your payment method to keep access uninterrupted.</Notice>;
  if (status.cancelAtPeriodEnd) return <Notice tone="warning"><strong>Cancellation scheduled.</strong> You keep Pro access until {formatDate(status.periodEndsAt)}. Resume anytime before then.</Notice>;
  if (status.accessState === "canceled" || status.accessState === "unpaid" || status.accessState === "incomplete") return <Notice tone="error"><strong>Stripe subscription inactive.</strong> Your billing controls are unavailable for this subscription. Choose a plan to start a new Pro subscription.</Notice>;
  return null;
}

function InvoiceHistory({ invoices }: { invoices: BillingStatus["invoices"] }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
    <div className="flex items-center justify-between mb-4"><div><p className="text-slate-500 text-[10px] uppercase tracking-[.16em] font-bold">Billing history</p><h2 className="text-white font-semibold text-sm mt-1">Invoices &amp; receipts</h2></div><FileDown size={18} className="text-slate-500" /></div>
    {invoices.length === 0 ? <p className="text-slate-400 text-xs">Your Stripe invoices will appear here after a payment is recorded.</p> : <div className="divide-y divide-white/[.07]">{invoices.map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="text-white text-xs font-semibold">{formatMoney(invoice.amountPaid, invoice.currency)}</p><p className="text-slate-500 text-[11px] mt-0.5">{formatDate(invoice.createdAt)} · {invoice.status ?? "issued"}</p></div><a href={`/api/stripe/invoices/${invoice.id}/document`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-200 hover:text-emerald-100">View <ExternalLink size={12} /></a></div>)}</div>}
  </section>;
}

function InfoTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-white/[.07] bg-slate-950/20 p-3"><div className="text-slate-500 flex items-center gap-1.5 text-[10px] uppercase tracking-wide">{icon}{label}</div><p className="text-slate-100 font-semibold mt-1.5">{value}</p></div>;
}

function Notice({ children, tone, onDismiss }: { children: React.ReactNode; tone: "success" | "warning" | "error"; onDismiss?: () => void }) {
  const toneClass = tone === "success" ? "border-emerald-300/25 bg-emerald-300/[.08] text-emerald-100" : tone === "warning" ? "border-amber-300/25 bg-amber-300/[.08] text-amber-50" : "border-rose-300/25 bg-rose-300/[.08] text-rose-50";
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? AlertCircle : AlertCircle;
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-xs leading-relaxed flex gap-2 ${toneClass}`} role={tone === "error" ? "alert" : "status"}><Icon size={16} className="shrink-0 mt-0.5" /><div className="flex-1">{children}</div>{onDismiss && <button onClick={onDismiss} aria-label="Dismiss notice" className="opacity-70 hover:opacity-100"><X size={15} /></button>}</div>;
}

function LoadingCard() {
  return <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5 space-y-4 animate-pulse"><div className="h-3 w-24 rounded bg-white/10" /><div className="h-8 w-44 rounded bg-white/10" /><div className="h-20 rounded-xl bg-white/[.06]" /></div>;
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[.06] p-5"><div className="flex items-start gap-3"><AlertCircle size={18} className="text-rose-300 mt-0.5" /><div><h2 className="text-white font-semibold text-sm">Could not load billing details</h2><p className="text-slate-400 text-xs mt-1">No billing changes were made. Try again before managing your subscription.</p></div></div><button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white"><RefreshCw size={13} /> Try again</button></div>;
}

function accessDescription(status: BillingStatus) {
  if (status.provider === "complimentary") return "Complimentary access";
  if (status.provider === "test") return "Test access";
  if (status.provider === "whop") return `${status.plan ?? "Legacy"} plan managed by Whop`;
  if (status.provider === "stripe") return status.cancelAtPeriodEnd ? `Access ends ${formatDate(status.periodEndsAt)}` : `${status.plan ?? "Stripe"} plan`;
  return "Essential forecast access";
}