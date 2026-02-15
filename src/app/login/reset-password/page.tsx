"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // The auth callback route redirected here after exchanging the recovery code
    // for a session, so the user should already be authenticated.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect after a short delay
    setTimeout(() => {
      router.push("/");
    }, 2000);
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
              Password updated
            </h2>
            <p className="mt-2 text-center text-sm text-muted">
              Your password has been reset successfully. Redirecting you now...
            </p>

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
              Set new password
            </h2>
            <p className="mt-1 text-sm text-muted">
              Choose a strong password for your account.
            </p>
          </div>

          {!sessionReady && !error ? (
            <div className="flex items-center justify-center py-8">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-copper-600/30 border-t-copper-600" />
              <span className="ml-3 text-sm text-muted">Verifying reset link...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium uppercase tracking-wider text-muted"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    disabled={!sessionReady}
                    className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium uppercase tracking-wider text-muted"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={8}
                  disabled={!sessionReady}
                  className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !sessionReady}
                className="w-full cursor-pointer rounded-lg bg-copper-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_-5px_var(--copper-600)] transition-all duration-300 hover:bg-copper-700 hover:shadow-[0_0_40px_-5px_var(--copper-600)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Updating...
                  </span>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          )}

          <div className="mt-6 h-0.5 w-full bg-gradient-to-r from-vibranium via-copper-light to-copper-600 opacity-30" />
        </div>
      </div>
    </div>
  );
}
