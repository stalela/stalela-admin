"use client";

import { useState, useCallback, useEffect } from "react";
import {
  X,
  RefreshCw,
  Loader2,
  Clock,
  ExternalLink,
  Users,
  Building2,
  Calendar,
  MapPin,
  Tag,
  AlertCircle,
} from "lucide-react";
import type { LinkedInProfile } from "@/app/api/companies/linkedin/route";

interface LinkedInDrawerProps {
  companyId: string;
  companyName: string;
  open: boolean;
  onClose: () => void;
}

export function LinkedInDrawer({
  companyId,
  companyName,
  open,
  onClose,
}: LinkedInDrawerProps) {
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/companies/linkedin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, force }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error || `Error ${res.status}`);
        }

        const data = await res.json();
        setProfile(data.profile);
        setCached(data.cached ?? false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch LinkedIn data");
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  // Auto-fetch on open when no profile is loaded
  useEffect(() => {
    if (open && !profile && !loading && !error) {
      fetchProfile(false);
    }
  }, [open, profile, loading, error, fetchProfile]);

  // Reset state when companyId changes
  useEffect(() => {
    setProfile(null);
    setCached(false);
    setError(null);
  }, [companyId]);

  // ESC key handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-background transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <LinkedInIcon className="h-5 w-5 shrink-0 text-[#0A66C2]" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                LinkedIn Profile
              </h2>
              <p className="text-xs text-muted truncate">{companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching LinkedIn…
              </span>
            )}
            {cached && profile?.created_at && (
              <span className="flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3 w-3" />
                {new Date(profile.created_at).toLocaleDateString("en-ZA")}
              </span>
            )}
            {profile && !loading && (
              <button
                onClick={() => fetchProfile(true)}
                className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-copper-light transition-colors"
                title="Refresh LinkedIn data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                {error}
                <button
                  onClick={() => fetchProfile(false)}
                  className="ml-2 underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-6 py-16">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#0A66C2]/20 animate-ping" />
                <div className="relative rounded-full bg-surface-elevated p-4">
                  <LinkedInIcon className="h-8 w-8 text-[#0A66C2]" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Searching LinkedIn for {companyName}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Using AI-powered web search to locate the company profile…
                </p>
              </div>
            </div>
          )}

          {/* Not found */}
          {!loading && profile && !profile.found && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="rounded-full bg-surface-elevated p-4">
                <LinkedInIcon className="h-8 w-8 text-muted" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No LinkedIn page found
                </p>
                {profile.not_found_reason && (
                  <p className="mt-1 text-xs text-muted max-w-xs">
                    {profile.not_found_reason}
                  </p>
                )}
              </div>
              <button
                onClick={() => fetchProfile(true)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-copper-light transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !profile && !error && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <LinkedInIcon className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">
                Click to find LinkedIn company profile
              </p>
            </div>
          )}

          {/* Profile data */}
          {!loading && profile?.found && (
            <div className="space-y-5">
              {/* LinkedIn URL */}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-[#0A66C2]/30 bg-[#0A66C2]/10 px-4 py-3 text-sm text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors"
                >
                  <LinkedInIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{profile.linkedin_url}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              )}

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                {profile.company_size && (
                  <ProfileField
                    icon={Users}
                    label="Company size"
                    value={profile.company_size}
                  />
                )}
                {profile.followers && (
                  <ProfileField
                    icon={Users}
                    label="Followers"
                    value={profile.followers}
                  />
                )}
                {profile.industry && (
                  <ProfileField
                    icon={Building2}
                    label="Industry"
                    value={profile.industry}
                  />
                )}
                {profile.founded && (
                  <ProfileField
                    icon={Calendar}
                    label="Founded"
                    value={profile.founded}
                  />
                )}
                {profile.headquarters && (
                  <ProfileField
                    icon={MapPin}
                    label="Headquarters"
                    value={profile.headquarters}
                  />
                )}
              </div>

              {/* About */}
              {profile.about && (
                <div className="rounded-lg border border-border bg-surface-elevated p-4">
                  <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wide">
                    About
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {profile.about}
                  </p>
                </div>
              )}

              {/* Specialties */}
              {profile.specialties.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="h-3.5 w-3.5 text-muted" />
                    <p className="text-xs text-muted font-medium uppercase tracking-wide">
                      Specialties
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-xs text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key People */}
              {profile.key_people.length > 0 && (
                <div>
                  <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">
                    Key People
                  </p>
                  <div className="space-y-2">
                    {profile.key_people.map((person, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {person.name}
                          </p>
                          <p className="text-xs text-muted">{person.title}</p>
                        </div>
                        {person.linkedin_url && (
                          <a
                            href={person.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted hover:text-[#0A66C2] transition-colors"
                            title="View LinkedIn profile"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enriched timestamp */}
              <p className="text-xs text-muted text-right">
                {cached ? "Cached" : "Fetched"}{" "}
                {new Date(profile.created_at).toLocaleString("en-ZA")}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Compact field display used in the 2-column grid. */
function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted" />
        <p className="text-xs text-muted">{label}</p>
      </div>
      <p className="text-sm text-foreground font-medium">{value}</p>
    </div>
  );
}

/** Inline LinkedIn SVG icon (lucide-react doesn't include LinkedIn). */
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LinkedIn"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
