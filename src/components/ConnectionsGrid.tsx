"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plug,
  Unplug,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformConnection } from "@stalela/commons/types";

interface Platform {
  id: "meta" | "google" | "linkedin" | "tiktok" | "x";
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

const PLATFORMS: Platform[] = [
  {
    id: "meta",
    name: "Meta",
    description: "Facebook & Instagram Ads",
    icon: "📘",
    color: "from-blue-600/20 to-blue-500/5",
    features: ["Campaign sync", "Audience insights", "Ad creative library"],
  },
  {
    id: "google",
    name: "Google Ads",
    description: "Search, Display & YouTube",
    icon: "🔍",
    color: "from-emerald-600/20 to-emerald-500/5",
    features: ["Keyword performance", "Quality scores", "Conversion tracking"],
  },
  {
    id: "linkedin",
    name: "LinkedIn Ads",
    description: "B2B & Professional targeting",
    icon: "💼",
    color: "from-blue-500/20 to-blue-400/5",
    features: ["Company targeting", "Lead gen forms", "Job title targeting"],
  },
  {
    id: "tiktok",
    name: "TikTok Ads",
    description: "Short-form video ads",
    icon: "🎵",
    color: "from-pink-600/20 to-pink-500/5",
    features: ["Spark ads", "Creator insights", "Hashtag targeting"],
  },
  {
    id: "x",
    name: "X (Twitter)",
    description: "Promoted tweets & trends",
    icon: "𝕏",
    color: "from-neutral-600/20 to-neutral-500/5",
    features: ["Follower campaigns", "Trend targeting", "Twitter Cards"],
  },
];

const STATUS_CONFIG = {
  connected: {
    icon: CheckCircle2,
    label: "Connected",
    className: "text-success bg-success/10",
  },
  disconnected: {
    icon: Unplug,
    label: "Not connected",
    className: "text-muted bg-surface-elevated",
  },
  expired: {
    icon: Clock,
    label: "Token expired",
    className: "text-warning bg-warning/10",
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    className: "text-danger bg-danger/10",
  },
};

interface Props {
  tenantId: string;
  initialConnections: PlatformConnection[];
}

export default function ConnectionsGrid({ tenantId, initialConnections }: Props) {
  const router = useRouter();
  const [connections, setConnections] = useState<PlatformConnection[]>(initialConnections);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getConnection(platformId: string) {
    return connections.find((c) => c.platform === platformId);
  }

  async function handleConnect(platformId: string) {
    setShowModal(platformId);
    setAccountName("");
    setAccountId("");
    setError("");
  }

  async function submitConnect() {
    if (!showModal) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/marketing/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          platform: showModal,
          account_name: accountName.trim() || null,
          external_account_id: accountId.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to connect");
      }

      const connection = await res.json();
      setConnections((prev) => {
        const filtered = prev.filter((c) => c.platform !== showModal);
        return [...filtered, connection];
      });
      setShowModal(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(connectionId: string, platformId: string) {
    setConnectingPlatform(platformId);

    try {
      const res = await fetch(`/api/marketing/connections/${connectionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to disconnect");
      }

      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId ? { ...c, status: "disconnected" as const } : c
        )
      );
      router.refresh();
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      setConnectingPlatform(null);
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const conn = getConnection(platform.id);
          const isConnected = conn?.status === "connected";
          const status = conn?.status ?? "disconnected";
          const statusConfig = STATUS_CONFIG[status];
          const StatusIcon = statusConfig.icon;
          const isProcessing = connectingPlatform === platform.id;

          return (
            <div
              key={platform.id}
              className={cn(
                "group relative overflow-hidden rounded-xl border transition-all",
                isConnected
                  ? "border-success/30 bg-surface"
                  : "border-border bg-surface hover:border-border/80"
              )}
            >
              {/* Gradient top */}
              <div className={cn("h-1.5 bg-gradient-to-r", platform.color)} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {platform.name}
                      </h3>
                      <p className="text-xs text-muted">{platform.description}</p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      statusConfig.className
                    )}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusConfig.label}
                  </div>
                </div>

                {/* Account info */}
                {isConnected && conn?.account_name && (
                  <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-2">
                    <p className="text-xs text-muted">Account</p>
                    <p className="text-sm font-medium text-foreground">
                      {conn.account_name}
                    </p>
                    {conn.connected_at && (
                      <p className="mt-0.5 text-xs text-muted">
                        Connected{" "}
                        {new Date(conn.connected_at).toLocaleDateString("en-ZA")}
                      </p>
                    )}
                  </div>
                )}

                {/* Features */}
                <div className="mt-3 space-y-1">
                  {platform.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-xs text-muted"
                    >
                      <div
                        className={cn(
                          "h-1 w-1 rounded-full",
                          isConnected ? "bg-success" : "bg-border"
                        )}
                      />
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Action button */}
                <div className="mt-4">
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnect(conn!.id, platform.id)}
                      disabled={isProcessing}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unplug className="h-4 w-4" />
                      )}
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-copper-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-copper-700"
                    >
                      <Plug className="h-4 w-4" />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Connect {PLATFORMS.find((p) => p.id === showModal)?.name}
              </h3>
              <button
                onClick={() => setShowModal(null)}
                className="rounded-lg p-1 text-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-copper-600/20 bg-copper-600/5 px-4 py-3">
              <p className="text-sm text-copper-light">
                <strong>Coming soon:</strong> Direct OAuth integration is under development.
                For now, you can manually register your account details below.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="My Business Ad Account"
                  className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Account / Advertiser ID{" "}
                  <span className="normal-case tracking-normal text-muted/60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="act_123456789"
                  className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50"
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-danger/20 bg-danger/5 px-4 py-2.5 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(null)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={submitConnect}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-copper-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-copper-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4" />
                )}
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
