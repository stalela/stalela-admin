"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback?type=recovery` }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background">
        <div className="absolute inset-0 wakanda-lines opacity-30" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper-600/5 blur-3xl" />

        <div className="relative z-10 w-full max-w-md px-6">
          <div className="mb-8 flex flex-col items-center">
            <div className="relative mb-4">
              <Hexagon className="h-16 w-16 text-copper-600" strokeWidth={1} />
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-copper-light">
                S
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-foreground">
              STALELA
            </h1>
          </div>

          <div className="wakanda-border rounded-2xl bg-surface p-8">
            <div className="mb-6 h-0.5 w-full bg-gradient-to-r from-copper-600 via-copper-light to-vibranium opacity-60" />

            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-center text-lg font-semibold text-foreground">
              Check your email
            </h2>
            <p className="mt-2 text-center text-sm text-muted">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-medium text-copper-light">{email}</span>.
            </p>

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/login")}
                className="text-sm text-muted hover:text-copper-600 transition-colors"
              >
                Back to sign in
              </button>
            </div>

            <div className="mt-6 h-0.5 w-full bg-gradient-to-r from-vibranium via-copper-light to-copper-600 opacity-30" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 wakanda-lines opacity-30" />
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper-600/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-4">
            <Hexagon className="h-16 w-16 text-copper-600" strokeWidth={1} />
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-copper-light">
              S
            </span>
            <div className="absolute -inset-3 animate-[spin_20s_linear_infinite] rounded-full border border-dashed border-copper-600/20" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-foreground">
            STALELA
          </h1>
        </div>

        <div className="wakanda-border rounded-2xl bg-surface p-8">
          <div className="mb-6 h-0.5 w-full bg-gradient-to-r from-copper-600 via-copper-light to-vibranium opacity-60" />

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Reset your password
            </h2>
            <p className="mt-1 text-sm text-muted">
              Enter the email address associated with your account and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wider text-muted"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-lg bg-copper-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_-5px_var(--copper-600)] transition-all duration-300 hover:bg-copper-700 hover:shadow-[0_0_40px_-5px_var(--copper-600)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="inline-flex items-center gap-1 text-sm text-muted hover:text-copper-600 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </div>
          </form>

          <div className="mt-6 h-0.5 w-full bg-gradient-to-r from-vibranium via-copper-light to-copper-600 opacity-30" />
        </div>
      </div>
    </div>
  );
}
