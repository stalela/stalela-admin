"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Zap, ArrowRight, ArrowLeft, Loader2, CheckCircle2, BarChart3, Crown, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

const INDUSTRIES = [
  "E-commerce / Retail",
  "SaaS / Technology",
  "Agency / Marketing",
  "Finance / Fintech",
  "Healthcare",
  "Education",
  "Real Estate",
  "Food & Beverage",
  "Travel & Hospitality",
  "Professional Services",
  "Non-profit",
  "Other",
];

const PLATFORMS = [
  { id: "meta", name: "Meta (Facebook & Instagram)", icon: "📘" },
  { id: "google", name: "Google Ads", icon: "🔍" },
  { id: "linkedin", name: "LinkedIn Ads", icon: "💼" },
  { id: "tiktok", name: "TikTok Ads", icon: "🎵" },
  { id: "x", name: "X (Twitter) Ads", icon: "𝕏" },
];

interface OnboardingProps {
  tenantId: string;
  tenantName: string;
}

export default function OnboardingWizard({ tenantId, tenantName }: OnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditProgress, setAuditProgress] = useState("");
  const [auditId, setAuditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleStartAudit() {
    if (!websiteUrl.trim()) {
      setError("Please enter your website URL.");
      return;
    }

    // Normalize URL
    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    setError("");
    setLoading(true);
    setAuditProgress("Saving your details...");

    try {
      // Save website URL and industry to tenant
      const supabase = createClient();
      await supabase
        .from("tenants")
        .update({
          website_url: url,
          onboarding_status: "website",
          settings: { industry, platforms_interested: selectedPlatforms },
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenantId);

      setAuditProgress("Crawling your website...");

      // Start the audit via SSE
      const res = await fetch("/api/marketing/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tenant_id: tenantId, industry }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Audit failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let reportId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.status) {
                setAuditProgress(parsed.status);
              }
              if (parsed.audit_id) {
                reportId = parsed.audit_id;
                setAuditId(parsed.audit_id);
              }
            } catch {
              // partial JSON, skip
            }
          }
        }
      }

      // Mark onboarding complete
      await supabase
        .from("tenants")
        .update({
          onboarding_status: "complete",
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenantId);

      setAuditProgress("Your audit is ready!");
      setLoading(false);

      // Redirect to report after brief delay
      setTimeout(() => {
        if (reportId) {
          router.push(`/marketing/reports/${reportId}`);
        } else {
          router.push("/marketing");
        }
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setStep(1);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                step >= s
                  ? "bg-copper-600 text-white"
                  : "bg-surface-elevated text-muted"
              }`}
            >
              {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`h-0.5 w-12 rounded-full transition-colors ${
                  step > s ? "bg-copper-600" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Website & Industry */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-copper-600/10">
              <Globe className="h-8 w-8 text-copper-light" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Welcome to {tenantName}!
            </h2>
            <p className="mt-2 text-sm text-muted">
              Let&apos;s start by analyzing your website. We&apos;ll generate a comprehensive
              audit report with insights and recommendations.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                Your Website
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors"
              >
                <option value="">Select your industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!websiteUrl.trim()}
              className="flex items-center gap-2 rounded-lg bg-copper-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-copper-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Platform Interest */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-vibranium/10">
              <BarChart3 className="h-8 w-8 text-vibranium" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Which platforms do you advertise on?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Select all that apply. You can connect them later.
            </p>
          </div>

          <div className="space-y-3">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`flex w-full items-center gap-4 rounded-lg border px-4 py-3.5 text-left transition-all ${
                  selectedPlatforms.includes(platform.id)
                    ? "border-copper-600 bg-copper-600/10"
                    : "border-border bg-surface-elevated hover:border-border/80"
                }`}
              >
                <span className="text-xl">{platform.icon}</span>
                <span className="text-sm font-medium text-foreground">
                  {platform.name}
                </span>
                {selectedPlatforms.includes(platform.id) && (
                  <CheckCircle2 className="ml-auto h-5 w-5 text-copper-light" />
                )}
              </button>
            ))}
            <p className="text-center text-xs text-muted">
              You can connect your ad accounts in{" "}
              <a href="/marketing/connections" className="text-copper-light hover:underline">
                Platform Connections
              </a>{" "}
              after completing the audit.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 rounded-lg bg-copper-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-copper-700 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Plan Selection */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-copper-600/10">
              <CreditCard className="h-8 w-8 text-copper-light" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Choose your plan
            </h2>
            <p className="mt-2 text-sm text-muted">
              Start free or unlock the full power of Lalela with Premium.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Free plan */}
            <div className="rounded-xl border border-border bg-surface-elevated p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Free</h3>
                <p className="text-2xl font-bold text-foreground mt-1">
                  R0<span className="text-sm font-normal text-muted">/month</span>
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Website audit &amp; report
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Platform connections
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Competitor analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  3 visible leads per batch
                </li>
              </ul>
              <button
                onClick={() => setStep(4)}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Continue Free
              </button>
            </div>

            {/* Premium plan */}
            <div className="relative rounded-xl border-2 border-copper-600 bg-surface-elevated p-6 space-y-4">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-copper-600 px-3 py-0.5 text-xs font-bold text-white">
                Recommended
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Crown className="h-5 w-5 text-copper-light" />
                  Premium
                </h3>
                <p className="text-2xl font-bold text-foreground mt-1">
                  R300<span className="text-sm font-normal text-muted">/month</span>
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-copper-light shrink-0" />
                  Everything in Free
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-copper-light shrink-0" />
                  <strong className="text-foreground">All leads unlocked</strong> — no blur
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-copper-light shrink-0" />
                  Up to <strong className="text-foreground">500 leads/month</strong>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-copper-light shrink-0" />
                  Full contact details &amp; outreach
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-copper-light shrink-0" />
                  Priority support
                </li>
              </ul>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/marketing/billing/checkout", { method: "POST" });
                    const data = await res.json();
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      setError(data.error || "Checkout failed");
                    }
                  } catch {
                    setError("Could not start checkout. Please try again.");
                  }
                }}
                className="w-full rounded-lg bg-copper-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-copper-700"
              >
                Upgrade Now
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="text-sm text-muted transition-colors hover:text-foreground underline"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Generating Audit */}
      {step === 4 && (
        <div className="space-y-6 text-center">
          {!loading && !auditId && (
            <div className="space-y-4">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-copper-600/10">
                <Zap className="h-10 w-10 text-copper-light" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Ready to generate your audit?
              </h2>
              <p className="text-sm text-muted">
                We&apos;ll analyze your website and generate a comprehensive report
                with insights and recommendations.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleStartAudit}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-copper-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-copper-700 disabled:opacity-50"
                >
                  <Zap className="h-4 w-4" />
                  Generate My Audit
                </button>
              </div>
            </div>
          )}

          {(loading || auditId) && (
            <>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-copper-600/10">
                {loading ? (
                  <Loader2 className="h-10 w-10 animate-spin text-copper-light" />
                ) : (
                  <CheckCircle2 className="h-10 w-10 text-success" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {loading
                    ? "Analyzing your website..."
                    : "Audit Complete!"}
                </h2>
                <p className="mt-2 text-sm text-muted">{auditProgress}</p>
              </div>
            </>
          )}

          {/* Progress steps */}
          {loading && (
            <div className="mx-auto max-w-sm space-y-3 text-left">
              {[
                "Crawling your website",
                "Extracting brand elements",
                "Analyzing market positioning",
                "Evaluating ad readiness",
                "Generating recommendations",
              ].map((label, i) => {
                const progressSteps = [
                  "Crawling your website...",
                  "Extracting brand elements...",
                  "Analyzing market positioning...",
                  "Evaluating ad readiness...",
                  "Generating recommendations...",
                ];
                const currentIdx = progressSteps.findIndex((s) =>
                  auditProgress.toLowerCase().includes(s.split("...")[0].toLowerCase().slice(0, 10))
                );
                const isComplete = i < currentIdx;
                const isCurrent = i === currentIdx;

                return (
                  <div key={label} className="flex items-center gap-3">
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : isCurrent ? (
                      <Loader2 className="h-5 w-5 animate-spin text-copper-light" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-border" />
                    )}
                    <span
                      className={`text-sm ${
                        isComplete
                          ? "text-muted line-through"
                          : isCurrent
                            ? "text-foreground font-medium"
                            : "text-muted/50"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
