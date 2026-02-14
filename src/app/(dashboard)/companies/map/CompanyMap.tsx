"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapMarker {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  source: string;
  phone: string | null;
}

interface CompanyMapProps {
  initialMarkers: MapMarker[];
}

// South Africa center
const SA_CENTER: [number, number] = [-30.5595, 22.9375];
const SA_ZOOM = 6;

function createCopperIcon() {
  return L.divIcon({
    html: `<div style="
      background: #a4785a;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid #d4a574;
      box-shadow: 0 0 4px rgba(164, 120, 90, 0.5);
    "></div>`,
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function createClusterIcon(count: number) {
  const size = count < 100 ? 30 : count < 1000 ? 40 : 50;
  return L.divIcon({
    html: `<div style="
      background: rgba(164, 120, 90, 0.85);
      color: white;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size < 40 ? 11 : 13}px;
      font-weight: 600;
      border: 2px solid #d4a574;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${count >= 1000 ? `${Math.round(count / 1000)}k` : count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function CompanyMap({ initialMarkers }: CompanyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>(initialMarkers);
  const [loading, setLoading] = useState(false);
  const [markerCount, setMarkerCount] = useState(initialMarkers.length);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const loadingRef = useRef(false);

  const fetchMarkers = useCallback(
    async (bounds: L.LatLngBounds, source?: string) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);

      try {
        const params = new URLSearchParams({
          minLat: String(bounds.getSouth()),
          maxLat: String(bounds.getNorth()),
          minLng: String(bounds.getWest()),
          maxLng: String(bounds.getEast()),
        });
        if (source) params.set("source", source);

        const res = await fetch(`/api/companies/map?${params}`);
        if (res.ok) {
          const data = await res.json();
          setMarkers(data.markers);
          setMarkerCount(data.markers.length);
        }
      } catch {
        // Network error silently ignored
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    []
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: SA_CENTER,
      zoom: SA_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    map.on("moveend", () => {
      fetchMarkers(map.getBounds(), sourceFilter || undefined);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when source filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    fetchMarkers(map.getBounds(), sourceFilter || undefined);
  }, [sourceFilter, fetchMarkers]);

  // Render markers
  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const map = mapInstanceRef.current;
    if (!map) return;
    const zoom = map.getZoom();

    // At high zoom levels, render individual markers
    if (zoom >= 12) {
      const icon = createCopperIcon();
      for (const m of markers) {
        if (m.latitude == null || m.longitude == null) continue;
        const marker = L.marker([m.latitude, m.longitude], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 180px;">
            <strong style="font-size: 13px;">${m.name}</strong><br/>
            ${m.category ? `<span style="color: #999; font-size: 11px;">${m.category}</span><br/>` : ""}
            ${m.phone ? `<span style="font-size: 11px;">📞 ${m.phone}</span><br/>` : ""}
            <a href="/companies/${m.id}" style="color: #a4785a; font-size: 11px;">View details →</a>
          </div>
        `);
        layer.addLayer(marker);
      }
    } else {
      // At lower zoom, use grid-based clustering
      const gridSize = zoom < 8 ? 2 : zoom < 10 ? 1 : 0.5;
      const clusters: Record<
        string,
        { lat: number; lng: number; count: number; names: string[] }
      > = {};

      for (const m of markers) {
        if (m.latitude == null || m.longitude == null) continue;
        const key = `${Math.floor(m.latitude / gridSize)}_${Math.floor(m.longitude / gridSize)}`;
        if (!clusters[key]) {
          clusters[key] = {
            lat: m.latitude,
            lng: m.longitude,
            count: 0,
            names: [],
          };
        }
        clusters[key].count++;
        if (clusters[key].names.length < 3)
          clusters[key].names.push(m.name);
        // Running average for center
        const n = clusters[key].count;
        clusters[key].lat =
          clusters[key].lat * ((n - 1) / n) + m.latitude / n;
        clusters[key].lng =
          clusters[key].lng * ((n - 1) / n) + m.longitude / n;
      }

      for (const cluster of Object.values(clusters)) {
        const icon = createClusterIcon(cluster.count);
        const marker = L.marker([cluster.lat, cluster.lng], { icon });
        const preview = cluster.names.join(", ");
        const more =
          cluster.count > 3 ? ` +${cluster.count - 3} more` : "";
        marker.bindPopup(`
          <div style="font-family: sans-serif;">
            <strong>${cluster.count} companies</strong><br/>
            <span style="color: #999; font-size: 11px;">${preview}${more}</span>
          </div>
        `);
        layer.addLayer(marker);
      }
    }
  }, [markers]);

  return (
    <div className="relative h-full w-full">
      {/* Controls overlay */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground shadow-md"
        >
          <option value="">All sources</option>
          <option value="yep">Yep</option>
          <option value="bizcommunity">Bizcommunity</option>
          <option value="bestdirectory">BestDirectory</option>
        </select>

        <div className="rounded-md bg-surface border border-border px-3 py-1.5 text-sm text-muted shadow-md">
          {loading ? (
            <span className="animate-pulse">Loading…</span>
          ) : (
            <span>{markerCount.toLocaleString()} markers</span>
          )}
        </div>
      </div>

      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
