"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { getDisplayPhoto } from "@/utils/get-display-photo";
import { normalizeCityName } from "@/utils/translations";

interface PropertyMapProps {
  listings: any[];
  stadtParam: string;
}

const getCityCenter = (city: string): [number, number] => {
  const normalized = city.trim().toLowerCase();
  switch (normalized) {
    case "berlin":
      return [52.5200, 13.4050];
    case "münchen":
    case "munich":
      return [48.1351, 11.5820];
    case "hamburg":
      return [53.5511, 9.9937];
    case "köln":
    case "cologne":
      return [50.9375, 6.9603];
    case "frankfurt":
      return [50.1109, 8.6821];
    case "düsseldorf":
    case "dusseldorf":
      return [51.2277, 6.7735];
    case "stuttgart":
      return [48.7758, 9.1829];
    case "leipzig":
      return [51.3397, 12.3731];
    default:
      return [51.1657, 10.4515]; // Center of Germany
  }
};

export default function PropertyMap({ listings, stadtParam }: PropertyMapProps) {
  const { language, t } = useLanguage();
  const { formatPrice, currency } = useCurrency();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let map: any = null;
    let L: any = null;

    const initMap = async () => {
      // Dynamic import to prevent SSR window issues
      L = await import("leaflet");

      // Inject Leaflet stylesheet dynamically if it hasn't been loaded yet
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!mapContainerRef.current) return;

      const center = getCityCenter(stadtParam);

      if (!mapInstanceRef.current) {
        // Create Leaflet map instance
        map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: true
        }).setView(center, stadtParam ? 12 : 10);

        L.control.zoom({ position: "topleft" }).addTo(map);

        // Google Maps Roadmap Tiles
        L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
          maxZoom: 20,
          attribution: "&copy; Google Maps"
        }).addTo(map);

        mapInstanceRef.current = map;
        markersGroupRef.current = L.layerGroup().addTo(map);
      } else {
        map = mapInstanceRef.current;
        map.setView(center, stadtParam ? 12 : 6.2);
      }

      const markersGroup = markersGroupRef.current;
      markersGroup.clearLayers();

      // Inject custom styling for Leaflet elements (only once)
      if (!document.getElementById("leaflet-custom-styles")) {
        const style = document.createElement("style");
        style.id = "leaflet-custom-styles";
        style.innerHTML = `
          .custom-price-marker {
            background: none !important;
            border: none !important;
          }
          .custom-price-tag {
            background-color: #522fc2;
            color: #ffffff;
            font-weight: 700;
            font-size: 13px;
            padding: 5px 12px;
            border-radius: 9999px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
            border: 1.5px solid #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            transition: all 0.15s ease;
            cursor: pointer;
          }
          .custom-price-tag:hover {
            transform: scale(1.08);
            background-color: #4322a3;
            box-shadow: 0 6px 14px rgba(0, 0, 0, 0.3);
          }
          .custom-leaflet-popup .leaflet-popup-content-wrapper {
            border-radius: 16px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
            border: 1px solid rgba(0,0,0,0.06);
            background: #ffffff;
          }
          .custom-leaflet-popup .leaflet-popup-content {
            margin: 0 !important;
            line-height: inherit;
            width: 240px !important;
          }
          .custom-leaflet-popup .leaflet-popup-tip-container {
            display: block;
          }
        `;
        document.head.appendChild(style);
      }

      // Add markers for properties
      listings.forEach((listing) => {
        // Fallback deterministic spread to prevent exact overlapping markers in same city when street coordinate is missing
        const cityCenter = getCityCenter(listing.city);
        let lat = listing.lat ? parseFloat(listing.lat) : 0;
        let lng = listing.lng ? parseFloat(listing.lng) : 0;
        if (!lat || !lng) {
          let hash = 0;
          const idStr = String(listing.id || "");
          for (let i = 0; i < idStr.length; i++) {
            hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
          }
          const offsetLat = (Math.sin(hash) * 10000 % 1) * 0.025;
          const offsetLng = (Math.sin(hash + 1) * 10000 % 1) * 0.025;
          lat = cityCenter[0] + offsetLat;
          lng = cityCenter[1] + offsetLng;
        }

        const rentTotal = Math.round(
          parseFloat(listing.rent_cold || 0) +
          parseFloat(listing.rent_utilities || 0) +
          parseFloat(listing.rent_heating || 0)
        );

        const priceIcon = L.divIcon({
          className: "custom-price-marker",
          html: `<div class="custom-price-tag">${formatPrice(rentTotal)}</div>`,
          iconSize: [85, 28], // increased width slightly to allow space for currency codes/symbols
          iconAnchor: [42, 14],
          popupAnchor: [0, -14]
        });

        // Photo check
        const photoUrl = listing.property_photos?.[0]?.cdn_url || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80";

        // Popup template matching user request
        const popupContent = `
          <div style="font-family: Inter, system-ui, -apple-system, sans-serif; width: 240px; overflow: hidden; background: #ffffff;">
            <div style="position: relative; height: 120px; width: 100%;">
              <img src="${getDisplayPhoto(photoUrl)}" alt="${listing.title}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div style="padding: 12px; display: flex; flex-direction: column; gap: 4px;">
              <h4 style="margin: 0 0 2px; font-size: 13px; font-weight: 700; color: #002046; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${listing.title}
              </h4>
              <p style="margin: 0 0 6px; font-size: 11px; color: #44474e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${listing.street || ""}, ${normalizeCityName(listing.city, language)}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 14px; color: #002046;">${formatPrice(rentTotal)} <span style="font-size: 10px; font-weight: 500; color: #44474e;">/ ${language === "de" ? "warm" : "warm"}</span></span>
                ${listing.landlord_rating ? `<span style="font-size: 11px; font-weight: bold; color: #735c00; display: inline-flex; align-items: center; gap: 2px;">★ ${listing.landlord_rating.toFixed(1)}</span>` : ""}
              </div>
              <div style="display: flex; gap: 6px; font-size: 11px; color: #44474e; margin-bottom: 10px; border-top: 1px solid #c4c6cf; padding-top: 6px;">
                <span>${listing.rooms} ${language === "de" ? "Zimmer" : "Rooms"}</span>
                <span>•</span>
                <span>${listing.size_sqm} m²</span>
              </div>
              <a href="/objekt/${listing.id}" style="display: block; width: 100%; text-align: center; background-color: #002046; color: #ffffff; border: none; padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; box-sizing: border-box; cursor: pointer; transition: opacity 0.2s;">
                ${language === "de" ? "Details anzeigen" : "View Details"}
              </a>
            </div>
          </div>
        `;

        const popup = L.popup({
          maxWidth: 240,
          minWidth: 240,
          closeButton: false,
          className: "custom-leaflet-popup"
        }).setContent(popupContent);

        const marker = L.marker([lat, lng], { icon: priceIcon }).addTo(markersGroup);
        marker.bindPopup(popup);
      });
    };

    initMap();

    return () => {
      // Map instance is kept alive or destroyed automatically. 
      // We don't call map.remove() here to avoid issues with React 18 strict mode double-invocations.
    };
  }, [listings, stadtParam, language, currency]);

  return <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />;
}
