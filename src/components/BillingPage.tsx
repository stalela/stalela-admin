"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Crown,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Mail,
  Loader2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const PREMIUM_MONTHLY_LEAD_CAP = 500;
const FREE_VISIBLE_LEADS = 3;

export default function BillingPage({
  plan,
  monthlyUsage,
  hasStripeCustomer,
}: {
  plan: string;
  monthlyUsage: number;
  hasStripeCustomer: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const justUpgraded = searchParams.get("success") === "true";

  const isPremium = plan === "premium" || plan === "enterprise";

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/billing/checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Could not start checkout");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handlePortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/billing/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Could not open billing portal");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {justUpgraded && (
        <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <div>
            <p className="font-medium text-foreground">
              Welcome to Lalela Premium!
            </p>
            <p className="text-sm text-muted">
              Your subscription is active. All leads are now unlocked.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current plan */}
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-copper-600/10">
              {isPremium ? (
                <Crown className="h-6 w-6 text-copper-light" />
              ) : (
                <CreditCard className="h-6 w-6 text-muted" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isPremium ? "Lalela Premium" : "Free Plan"}
              </h2>
              <p className="text-sm text-muted">
                {isPremium
                  ? "R300/month · All features unlocked"
                  : "Limited access · Upgrade anytime"}
              </p>
            </div>
          </div>

          {isPremium && hasStripeCustomer && (
            <Button
              variant="ghost"
              onClick={handlePortal}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Subscription
            </Button>
          )}
        </div>
      </Card>

      {/* Usage meter */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Monthly Lead Usage
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {monthlyUsage}
              </span>
              <span className="text-sm text-muted">
                / {isPremium ? PREMIUM_MONTHLY_LEAD_CAP : `${FREE_VISIBLE_LEADS} visible per batch`}
              </span>
            </div>
            {isPremium && (
              <div className="h-2 w-full rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-copper-600 transition-all"
                  style={{
                    width: `${Math.min(100, (monthlyUsage / PREMIUM_MONTHLY_LEAD_CAP) * 100)}%`,
                  }}
                />
              </div>
            )}
            {!isPremium && (
              <p className="text-xs text-muted mt-1">
                {monthlyUsage} leads generated this month. Only {FREE_VISIBLE_LEADS} per
                batch are visible on the free plan.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Upgrade CTA (free users only) */}
      {!isPremium && (
        <Card className="border-copper-600/30 bg-gradient-to-br from-surface to-copper-600/5">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-copper-600/10">
              <Crown className="h-8 w-8 text-copper-light" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground">
                Upgrade to Lalela Premium
              </h3>
              <p className="mt-1 text-sm text-muted">
                Unlock the full power of AI-driven lead generation for your
                business.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-copper-light shrink-0" />
                  See <strong className="text-foreground">all leads</strong> —
                  no blur or limits on visibility
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-copper-light shrink-0" />
                  Generate up to{" "}
                  <strong className="text-foreground">500 leads/month</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-copper-light shrink-0" />
                  Full contact details &amp; AI outreach suggestions
                </li>
              </ul>
              <div className="mt-6 flex items-center gap-3">
                <Button onClick={handleCheckout} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  Upgrade Now — R300/mo
                </Button>
                <span className="text-xs text-muted">
                  Cancel anytime. No commitment.
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Plan comparison */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Plan Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left font-medium text-muted">
                  Feature
                </th>
                <th className="py-2 px-4 text-center font-medium text-muted">
                  Free
                </th>
                <th className="py-2 pl-4 text-center font-medium text-copper-light">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody className="text-muted">
              {[
                ["Website Audit & Report", "checkmark", "checkmark"],
                ["Platform Connections", "checkmark", "checkmark"],
                ["Competitor Analysis", "checkmark", "checkmark"],
                ["AI Chat (Lalela)", "checkmark", "checkmark"],
                ["Lead Generation", `${FREE_VISIBLE_LEADS} visible / batch`, "All leads visible"],
                ["Monthly Lead Cap", "Unlimited batches", "500 leads"],
                ["Contact Details", "Limited", "Full access"],
                ["AI Outreach Suggestions", "Limited", "Full access"],
                ["Priority Support", "—", "checkmark"],
              ].map(([feature, free, premium]) => (
                <tr key={feature} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 text-foreground">{feature}</td>
                  <td className="py-2.5 px-4 text-center">
                    {free === "checkmark" ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                    ) : (
                      free
                    )}
                  </td>
                  <td className="py-2.5 pl-4 text-center">
                    {premium === "checkmark" ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-copper-light" />
                    ) : (
                      <span className="text-copper-light font-medium">
                        {premium}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
