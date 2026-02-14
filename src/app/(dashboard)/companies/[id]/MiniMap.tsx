"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

export function MiniMap({ latitude, longitude, name }: MiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Custom copper-colored marker
    const icon = L.divIcon({
      html: `<div style="
        background: #a4785a;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid #d4a574;
        box-shadow: 0 0 8px rgba(164, 120, 90, 0.5);
      "></div>`,
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([latitude, longitude], { icon })
      .addTo(map)
      .bindPopup(name);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [latitude, longitude, name]);

  return (
    <div
      ref={mapRef}
      className="h-64 w-full rounded-lg overflow-hidden border border-border"
    />
  );
}
