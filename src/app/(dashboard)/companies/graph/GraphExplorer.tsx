"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Loader2, AlertCircle, ZoomIn, ZoomOut } from "lucide-react";
import type { GraphNode, GraphEdge } from "@/lib/neo4j-api";

interface GraphExplorerProps {
  initialAvailable: boolean;
  initialCompanyId?: string;
  initialCompanyName?: string;
}

interface ForceNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

const SOURCE_COLORS: Record<string, string> = {
  yep: "#a4785a",
  bizcommunity: "#3b82f6",
  bestdirectory: "#22c55e",
};

export function GraphExplorer({ initialAvailable, initialCompanyId, initialCompanyName }: GraphExplorerProps) {
  const [available] = useState(initialAvailable);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; city: string | null; province: string | null; source: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [depth, setDepth] = useState(1);
  const [nodes, setNodes] = useState<ForceNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(false);

  // Debounced company search
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(q)}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } catch {
        // silently ignore
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // Fetch graph data for a company
  const loadGraph = useCallback(
    async (companyId: string) => {
      setSelectedCompany(companyId);
      setSearchResults([]);
      setSearchQuery("");
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/companies/graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, depth }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed to load graph" }));
          throw new Error(err.error || "Failed to load graph");
        }
        const data = await res.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load graph data");
        setNodes([]);
        setEdges([]);
      } finally {
        setLoading(false);
      }
    },
    [depth]
  );

  // Re-load when depth changes
  useEffect(() => {
    if (selectedCompany) loadGraph(selectedCompany);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth]);

  // Auto-load when navigating from list/detail page with companyId param
  useEffect(() => {
    if (initialCompanyId && !initialLoadRef.current) {
      initialLoadRef.current = true;
      if (initialCompanyName) {
        setSearchQuery(initialCompanyName);
      }
      loadGraph(initialCompanyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCompanyId]);

  // Simple force simulation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Initialize positions
    const simNodes: ForceNode[] = nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (Math.cos((i / nodes.length) * Math.PI * 2) * Math.min(width, height)) / 3,
      y: height / 2 + (Math.sin((i / nodes.length) * Math.PI * 2) * Math.min(width, height)) / 3,
      vx: 0,
      vy: 0,
    }));

    // Center node (first = selected company)
    if (simNodes.length > 0) {
      simNodes[0].x = width / 2;
      simNodes[0].y = height / 2;
    }

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    let animFrame: number;
    let iteration = 0;
    const maxIterations = 200;

    function simulate() {
      if (iteration >= maxIterations) {
        draw();
        return;
      }
      iteration++;

      const alpha = 1 - iteration / maxIterations;

      // Repulsion
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = (b.x ?? 0) - (a.x ?? 0);
          const dy = (b.y ?? 0) - (a.y ?? 0);
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = (300 * alpha) / (dist * dist);
          a.vx! -= (dx / dist) * force;
          a.vy! -= (dy / dist) * force;
          b.vx! += (dx / dist) * force;
          b.vy! += (dy / dist) * force;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;
        const dx = (t.x ?? 0) - (s.x ?? 0);
        const dy = (t.y ?? 0) - (s.y ?? 0);
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = ((dist - 100) * 0.01) * alpha;
        s.vx! += (dx / dist) * force;
        s.vy! += (dy / dist) * force;
        t.vx! -= (dx / dist) * force;
        t.vy! -= (dy / dist) * force;
      }

      // Center gravity
      for (const n of simNodes) {
        n.vx! += ((width / 2) - (n.x ?? 0)) * 0.001 * alpha;
        n.vy! += ((height / 2) - (n.y ?? 0)) * 0.001 * alpha;
      }

      // Apply velocities with damping
      for (const n of simNodes) {
        n.vx! *= 0.8;
        n.vy! *= 0.8;
        n.x = Math.max(20, Math.min(width - 20, (n.x ?? 0) + n.vx!));
        n.y = Math.max(20, Math.min(height - 20, (n.y ?? 0) + n.vy!));
      }

      draw();
      animFrame = requestAnimationFrame(simulate);
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      ctx.strokeStyle = "rgba(164, 120, 90, 0.3)";
      ctx.lineWidth = 1;
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;
        ctx.beginPath();
        ctx.moveTo(s.x ?? 0, s.y ?? 0);
        ctx.lineTo(t.x ?? 0, t.y ?? 0);
        ctx.stroke();
      }

      // Draw nodes
      for (let i = 0; i < simNodes.length; i++) {
        const n = simNodes[i];
        const isCenter = i === 0;
        const radius = isCenter ? 10 : 6;
        const color = SOURCE_COLORS[n.source] ?? "#888";

        ctx.beginPath();
        ctx.arc(n.x ?? 0, n.y ?? 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (isCenter) {
          ctx.strokeStyle = "#d4a574";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `${isCenter ? 12 : 10}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(
          n.name.length > 20 ? n.name.slice(0, 20) + "…" : n.name,
          n.x ?? 0,
          (n.y ?? 0) + radius + 14
        );
      }
    }

    simulate();
    return () => cancelAnimationFrame(animFrame);
  }, [nodes, edges]);

  if (!available) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertCircle className="h-12 w-12 text-muted" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Graph Database Not Connected
          </h2>
          <p className="mt-1 text-sm text-muted max-w-md">
            Neo4j is not configured. Set <code className="text-copper-light">NEO4J_URI</code>,{" "}
            <code className="text-copper-light">NEO4J_USER</code>, and{" "}
            <code className="text-copper-light">NEO4J_PASSWORD</code> environment variables to enable
            the graph explorer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search company to explore…"
            className="w-full rounded-md border border-border bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted"
          />
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-surface shadow-lg max-h-64 overflow-auto">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => loadGraph(r.id)}
                  className="w-full px-3 py-2 text-left hover:bg-surface-hover transition-colors flex items-center justify-between"
                >
                  <span className="text-sm text-foreground">{r.name}</span>
                  <span className="text-xs text-muted">
                    {r.city}{r.province ? `, ${r.province}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted" />
          )}
        </div>

        {/* Depth slider */}
        <div className="flex items-center gap-2">
          <ZoomOut className="h-4 w-4 text-muted" />
          <input
            type="range"
            min={1}
            max={3}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-20 accent-copper-600"
          />
          <ZoomIn className="h-4 w-4 text-muted" />
          <span className="text-xs text-muted">{depth} hop{depth > 1 ? "s" : ""}</span>
        </div>

        {/* Stats */}
        {nodes.length > 0 && (
          <div className="text-xs text-muted">
            {nodes.length} nodes · {edges.length} edges
          </div>
        )}
      </div>

      {/* ── Canvas area ── */}
      <div className="relative flex-1 rounded-lg border border-border bg-surface overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-copper-600" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!selectedCompany && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted">Search for a company to explore its graph</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ display: nodes.length > 0 ? "block" : "none" }}
        />
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="font-medium">Sources:</span>
        {Object.entries(SOURCE_COLORS).map(([source, color]) => (
          <span key={source} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            {source}
          </span>
        ))}
      </div>
    </div>
  );
}
