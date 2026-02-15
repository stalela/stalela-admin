"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, Eye, EyeOff, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          tenant_name: companyName.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
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
              <Megaphone className="absolute inset-0 m-auto h-7 w-7 text-copper-light" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-foreground">
              STALELA
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted">
              Marketing Platform
            </p>
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
              We&apos;ve sent a verification link to{" "}
              <span className="font-medium text-copper-light">{email}</span>.
              Click the link to activate your{" "}
              <span className="font-medium text-foreground">{companyName}</span>{" "}
              account.
            </p>

            <div className="mt-6 rounded-lg border border-border bg-surface-elevated p-4 text-xs text-muted">
              <p>
                <strong className="text-foreground">Didn&apos;t receive it?</strong>{" "}
                Check your spam folder. The email comes from Stalela.
              </p>
            </div>

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
      {/* Background geometric pattern */}
      <div className="absolute inset-0 wakanda-lines opacity-30" />

      {/* Radial glow behind the card */}
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-copper-600/5 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-vibranium/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo & brand */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-4">
            <Hexagon className="h-16 w-16 text-copper-600" strokeWidth={1} />
            <Megaphone className="absolute inset-0 m-auto h-7 w-7 text-copper-light" />
            {/* Orbiting accent */}
            <div className="absolute -inset-3 animate-[spin_20s_linear_infinite] rounded-full border border-dashed border-copper-600/20" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-foreground">
            STALELA
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted">
            Marketing Platform
          </p>
        </div>

        {/* Signup card */}
        <div className="wakanda-border rounded-2xl bg-surface p-8">
          {/* Accent line at top */}
          <div className="mb-6 h-0.5 w-full bg-gradient-to-r from-copper-600 via-copper-light to-vibranium opacity-60" />

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-muted">
              Get started with AI-powered ad management for your agency or business.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company name */}
            <div className="space-y-1.5">
              <label
                htmlFor="company"
                className="block text-xs font-medium uppercase tracking-wider text-muted"
              >
                Company / Agency Name
              </label>
              <input
                id="company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Marketing"
                required
                className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors"
              />
            </div>

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider text-muted"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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

            {/* Confirm password */}
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
                placeholder="Repeat your password"
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
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>

            <p className="text-center text-xs text-muted/60">
              By signing up you agree to our terms of service and privacy policy.
            </p>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-surface px-2 text-muted">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                const supabase = createClient();
                const tenantParam = companyName.trim()
                  ? `?tenant_name=${encodeURIComponent(companyName.trim())}`
                  : "";
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback${tenantParam}`,
                  },
                });
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm font-medium text-foreground hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-sm text-muted hover:text-copper-600 transition-colors"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>

          {/* Bottom accent */}
          <div className="mt-6 h-0.5 w-full bg-gradient-to-r from-vibranium via-copper-light to-copper-600 opacity-30" />
        </div>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-muted/60">
          Stalela Marketing — AI-powered advertising platform
        </p>
      </div>
    </div>
  );
}
