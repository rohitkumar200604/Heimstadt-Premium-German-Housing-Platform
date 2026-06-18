"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/utils/supabase/client";
import Footer from "@/components/layout/Footer";
import { getDisplayPhoto } from "@/utils/get-display-photo";

// ── Reusable dropdown wrapper ──────────────────────────────────────────────
function Dropdown({
  label,
  icon,
  badge,
  children,
  id,
  align = "left",
}: {
  label: string;
  icon: string;
  badge?: number;
  children: React.ReactNode;
  id: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="sm:relative flex-shrink-0">
      <button
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-label-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
          open || (badge && badge > 0)
            ? "bg-primary text-on-primary border-primary shadow-sm"
            : "bg-white border-outline-variant text-on-surface hover:border-primary hover:bg-surface-container"
        }`}
      >
        <span className="material-symbols-outlined text-[17px]">{icon}</span>
        <span>{label}</span>
        {badge ? (
          <span className="bg-white text-primary text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {badge}
          </span>
        ) : (
          <span className="material-symbols-outlined text-[15px] opacity-70">
            {open ? "expand_less" : "expand_more"}
          </span>
        )}
      </button>
      {open && (
        <div className={`absolute top-full left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 mt-2 z-50 bg-white border border-outline-variant rounded-2xl shadow-2xl w-[92vw] sm:min-w-[320px] sm:w-auto max-h-[80vh] overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${
          align === "left" ? "sm:left-0" : "sm:right-0"
        }`}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Filter checkbox item ───────────────────────────────────────────────────
function FilterCheck({
  id,
  label,
  icon,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  icon: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={`fc-${id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container cursor-pointer transition-colors"
    >
      <input
        id={`fc-${id}`}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-primary w-4 h-4 rounded"
      />
      <span className="material-symbols-outlined text-[18px] text-secondary">{icon}</span>
      <span className="text-label-sm text-on-surface font-medium">{label}</span>
    </label>
  );
}

const cityMappings: Record<string, string[]> = {
  "munich": ["münchen", "munich"],
  "münchen": ["münchen", "munich"],
  "cologne": ["köln", "cologne"],
  "köln": ["köln", "cologne"],
  "nuremberg": ["nürnberg", "nuremberg"],
  "nürnberg": ["nürnberg", "nuremberg"],
  "hanover": ["hannover", "hanover"],
  "hannover": ["hannover", "hanover"],
  "dusseldorf": ["düsseldorf", "dusseldorf"],
  "düsseldorf": ["düsseldorf", "dusseldorf"],
  "brunswick": ["braunschweig", "brunswick"],
  "braunschweig": ["braunschweig", "brunswick"],
  "constance": ["konstanz", "constance"],
  "konstanz": ["konstanz", "constance"]
};

const getSearchCities = (query: string): string[] => {
  const normalized = query.trim().toLowerCase();
  if (cityMappings[normalized]) {
    return cityMappings[normalized];
  }
  return [query.trim()];
};

function promiseTimeout<T>(promise: any, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Database query timed out"));
    }, ms);

    Promise.resolve(promise)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function SuchePageContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const stadtParam = searchParams.get("stadt") || "";
  const zimmerParam = searchParams.get("zimmer") || "all";
  const preisParam = searchParams.get("preis") || "";

  const hasSearched = stadtParam.trim() !== "";

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!stadtParam.trim());
  const [view, setView] = useState<"grid" | "list">("grid");

  // ── Filter state ──────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(stadtParam);
  const [priceRange, setPriceRange] = useState(preisParam || "");
  const [propertyType, setPropertyType] = useState(zimmerParam);
  const [distance, setDistance] = useState("any");
  const [sort, setSort] = useState("newest");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  const moveInParam = searchParams.get("moveIn") || "";
  const moveOutParam = searchParams.get("moveOut") || "";
  const [moveInDate, setMoveInDate] = useState(moveInParam);
  const [moveOutDate, setMoveOutDate] = useState(moveOutParam);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("heimat_favorites");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load favorites", e);
      }
    }
  }, []);

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("heimat_favorites", JSON.stringify(next));
  };

  // Sync searchInput with URL param on mount / param change
  useEffect(() => {
    setSearchInput(stadtParam);
    setMoveInDate(searchParams.get("moveIn") || "");
    setMoveOutDate(searchParams.get("moveOut") || "");
  }, [stadtParam, searchParams]);

  // Push URL when city search is submitted
  const applySearch = useCallback(() => {
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("stadt", searchInput.trim());
    if (propertyType && propertyType !== "all") params.set("zimmer", propertyType);
    if (priceRange) params.set("preis", priceRange);
    if (moveInDate) params.set("moveIn", moveInDate);
    if (moveOutDate) params.set("moveOut", moveOutDate);
    router.push(`/suche?${params.toString()}`);
  }, [searchInput, propertyType, priceRange, moveInDate, moveOutDate, router]);

  const amenityFilters = [
    { id: "furnished", label: language === "de" ? "Möbliert" : "Furnished", icon: "weekend" },
    { id: "balcony", label: language === "de" ? "Balkon" : "Balcony", icon: "balcony" },
    { id: "kitchen", label: language === "de" ? "Einbauküche" : "Fitted Kitchen", icon: "countertops" },
    { id: "laundry", label: language === "de" ? "Waschraum" : "Laundry", icon: "local_laundry_service" },
    { id: "parking", label: language === "de" ? "Parkplatz" : "Parking", icon: "local_parking" },
    { id: "pets", label: language === "de" ? "Haustiere erlaubt" : "Pets Allowed", icon: "pets" },
    { id: "wheelchair", label: language === "de" ? "Barrierefrei" : "Wheelchair Access", icon: "accessible" },
  ];

  const toggleFilter = (id: string) =>
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );

  const priceBands = [
    { value: "", label: language === "de" ? "Jeder Preis" : "Any price" },
    { value: "500", label: "< 500 €" },
    { value: "700", label: "< 700 €" },
    { value: "1000", label: "< 1.000 €" },
    { value: "1500", label: "< 1.500 €" },
    { value: "2000", label: "< 2.000 €" },
    { value: "3000", label: "< 3.000 €" },
  ];

  const typeOptions = [
    { value: "all", label: language === "de" ? "Alle Typen" : "All Types" },
    { value: "1", label: language === "de" ? "1 Zimmer" : "1 Room"},
    { value: "2", label: language === "de" ? "2 Zimmer" : "2 Room"},
    { value: "3", label: language === "de" ? "3 Zimmer" : "3 Room"},
    { value: "4", label: language === "de" ? "4+ Zimmer" : "4+ Room" },
    { value: "house", label: language === "de" ? "Haus" : "House" },
    { value: "shared", label: language === "de" ? "WG" : "Shared Apartment" },
  ];

  const distanceOptions = [
    { value: "any", label: language === "de" ? "Jede Entfernung" : "Any distance" },
    { value: "1", label: "< 1 km" },
    { value: "5", label: "< 5 km" },
    { value: "10", label: "< 10 km" },
    { value: "20", label: "< 20 km" },
    { value: "50", label: "< 50 km" },
  ];

  const sortOptions = [
    { value: "newest", label: language === "de" ? "Neueste zuerst" : "Newest first" },
    { value: "price_asc", label: language === "de" ? "Preis: aufsteigend" : "Price: low to high" },
    { value: "price_desc", label: language === "de" ? "Preis: absteigend" : "Price: high to low" },
    { value: "size_desc", label: language === "de" ? "Größe: absteigend" : "Size: largest first" },
    { value: "rooms_asc", label: language === "de" ? "Zimmer: aufsteigend" : "Rooms: fewest first" },
    { value: "relevance", label: language === "de" ? "Relevanz" : "Best match" },
  ];

  const activeBadgeCount = activeFilters.length;

  // ── Data fetching ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasSearched) {
      setListings([]);
      setLoading(false);
      return;
    }

    const fetchListings = async () => {
      setLoading(true);

      const mockListings: any[] = [
        {
          id: "berlin-studio",
          title: language === "de" ? "Helles Studio-Apartment nahe Alexanderplatz" : "Bright Studio Apartment near Alexanderplatz",
          city: "Berlin", street: "Karl-Liebknecht-Str. 12", zip: "10178",
          rooms: 1, size_sqm: 38, rent_cold: 720, rent_utilities: 80, rent_heating: 70,
          pets_allowed: true, furnished: false,
          amenities: ["balcony", "kitchen"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "munich-expat",
          title: language === "de" ? "Premium 3-Zimmer-Wohnung am Englischen Garten" : "Premium 3-Room Apartment at Englischen Garten",
          city: "München", street: "Königinstraße 44", zip: "80539",
          rooms: 3, size_sqm: 82, rent_cold: 1650, rent_utilities: 150, rent_heating: 110,
          pets_allowed: false, furnished: true,
          amenities: ["kitchen", "parking"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "hamburg-loft",
          title: language === "de" ? "Stilvolles Loft in der Speicherstadt" : "Stylish Loft in Speicherstadt",
          city: "Hamburg", street: "Am Sandtorkai 10", zip: "20457",
          rooms: 2, size_sqm: 65, rent_cold: 1120, rent_utilities: 110, rent_heating: 90,
          pets_allowed: true, furnished: true,
          amenities: ["balcony", "kitchen", "laundry"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "berlin-wg",
          title: language === "de" ? "Gemütliches Zimmer in Studenten-WG" : "Cozy Room in Student Shared Apartment",
          city: "Berlin", street: "Königin-Luise-Str. 15", zip: "14195",
          rooms: 1, size_sqm: 20, rent_cold: 450, rent_utilities: 60, rent_heating: 40,
          pets_allowed: true, furnished: false,
          amenities: ["kitchen"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "cologne-studio",
          title: language === "de" ? "Modernes Studio im Herzen Kölns" : "Modern Studio in Cologne City Centre",
          city: "Köln", street: "Schildergasse 8", zip: "50667",
          rooms: 1, size_sqm: 32, rent_cold: 680, rent_utilities: 75, rent_heating: 55,
          pets_allowed: false, furnished: true,
          amenities: ["kitchen", "wheelchair"],
          status: "active",
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
      ];

      const applyInMemoryFilters = () => {
        let f = [...mockListings];
        if (stadtParam) {
          const targetCities = getSearchCities(stadtParam);
          f = f.filter(l => targetCities.some(tc => l.city.toLowerCase().includes(tc.toLowerCase())));
        }
        if (propertyType !== "all") {
          if (propertyType === "house") f = f.filter(l => l.id.includes("house") || l.id.includes("haus"));
          else if (propertyType === "shared") f = f.filter(l => l.id.includes("wg") || l.id.includes("shared"));
          else f = f.filter(l => l.rooms >= parseFloat(propertyType));
        }
        if (priceRange) f = f.filter(l => l.rent_cold <= parseFloat(priceRange));
        if (moveInDate) {
          f = f.filter(l => !l.available_from || new Date(l.available_from) <= new Date(moveInDate));
        }
        if (activeFilters.includes("furnished")) f = f.filter(l => l.furnished === true);
        if (activeFilters.includes("balcony")) f = f.filter(l => l.amenities.includes("balcony"));
        if (activeFilters.includes("kitchen")) f = f.filter(l => l.amenities.includes("kitchen"));
        if (activeFilters.includes("laundry")) f = f.filter(l => l.amenities.includes("laundry"));
        if (activeFilters.includes("parking")) f = f.filter(l => l.amenities.includes("parking"));
        if (activeFilters.includes("pets")) f = f.filter(l => l.pets_allowed === true);
        if (activeFilters.includes("wheelchair")) f = f.filter(l => l.amenities.includes("wheelchair"));
        // Sorting
        if (sort === "price_asc") f.sort((a, b) => a.rent_cold - b.rent_cold);
        else if (sort === "price_desc") f.sort((a, b) => b.rent_cold - a.rent_cold);
        else if (sort === "size_desc") f.sort((a, b) => b.size_sqm - a.size_sqm);
        else if (sort === "rooms_asc") f.sort((a, b) => a.rooms - b.rooms);
        setListings(f);
      };

      try {
        const isConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co" &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "mock-anon-key";

        if (!isConfigured) { applyInMemoryFilters(); return; }

        let query = supabase.from("properties").select(`*, property_photos(cdn_url,is_primary)`).eq("status", "active");
        if (stadtParam) {
          const targetCities = getSearchCities(stadtParam);
          if (targetCities.length > 1) {
            const orQuery = targetCities.map(tc => `city.ilike.%${tc}%`).join(",");
            query = query.or(orQuery);
          } else {
            query = query.ilike("city", `%${stadtParam}%`);
          }
        }
        if (propertyType !== "all") {
          if (propertyType === "house") query = query.eq("property_type", "house");
          else if (propertyType === "shared") query = query.eq("property_type", "sharedRoom");
          else query = query.gte("rooms", parseFloat(propertyType));
        }
        if (priceRange) query = query.lte("rent_cold", parseFloat(priceRange));
        if (moveInDate) query = query.lte("available_from", moveInDate);
        if (activeFilters.includes("furnished")) query = query.eq("furnished", true);
        if (activeFilters.includes("balcony")) query = query.contains("amenities", ["balcony"]);
        if (activeFilters.includes("kitchen")) query = query.contains("amenities", ["kitchen"]);
        if (activeFilters.includes("laundry")) query = query.contains("amenities", ["laundry"]);
        if (activeFilters.includes("parking")) query = query.contains("amenities", ["parking"]);
        if (activeFilters.includes("pets")) query = query.eq("pets_allowed", true);
        if (activeFilters.includes("wheelchair")) query = query.eq("wheelchair_accessible", true);
        if (sort === "newest") query = query.order("created_at", { ascending: false });
        else if (sort === "price_asc") query = query.order("rent_cold", { ascending: true });
        else if (sort === "price_desc") query = query.order("rent_cold", { ascending: false });
        else if (sort === "size_desc") query = query.order("size_sqm", { ascending: false });
        else if (sort === "rooms_asc") query = query.order("rooms", { ascending: true });

        const { data, error } = await promiseTimeout(query, 3000) as any;
        if (error) throw error;
        if (data && data.length > 0) setListings(data);
        else { console.log("No active DB properties, using mock data."); applyInMemoryFilters(); }
      } catch (err) {
        console.warn("Supabase failed, using mock data:", err);
        applyInMemoryFilters();
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [stadtParam, propertyType, priceRange, activeFilters, sort, language, hasSearched, moveInDate, moveOutDate]);

  useEffect(() => {
    if (hasSearched) {
      localStorage.setItem("heimat_has_searched", "true");
    }
  }, [hasSearched]);

  const getPrimaryPhoto = (l: any) => {
    if (l.property_photos?.length > 0) {
      const p = l.property_photos.find((ph: any) => ph.is_primary);
      return getDisplayPhoto(p ? p.cdn_url : l.property_photos[0].cdn_url);
    }
    return "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80";
  };

  const currentPriceLabel = priceRange
    ? `< ${priceRange} €`
    : (language === "de" ? "Preis" : "Price");
  const currentTypeLabel = typeOptions.find(t => t.value === propertyType)?.label || (language === "de" ? "Typ" : "Type");
  const currentDistLabel = distanceOptions.find(d => d.value === distance)?.label || (language === "de" ? "Entfernung" : "Distance");
  const currentSortLabel = sortOptions.find(s => s.value === sort)?.label || (language === "de" ? "Sortierung" : "Sort");

  return (
    <div className="flex flex-col w-full h-[calc(100vh-65px)]">

      {/* ── Filter Toolbar ─────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-outline-variant px-4 md:px-8 py-3 z-40 sticky top-[65px] shadow-sm">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-2">

          {/* Row 1: City search — full width on all screens */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                search
              </span>
              <input
                id="suche-city-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder={language === "de" ? "Stadt oder Adresse suchen…" : "Search city or address…"}
                className="w-full pl-9 pr-9 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-label-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(""); router.push("/suche"); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
            {/* Search button — always visible next to input */}
            <button
              id="btn-suche-search"
              onClick={applySearch}
              disabled={searchInput.trim() === ""}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-label-sm font-bold transition-all flex-shrink-0 shadow-sm ${
                searchInput.trim() === ""
                  ? "bg-outline-variant text-on-surface-variant cursor-not-allowed opacity-50"
                  : "bg-primary text-on-primary hover:opacity-90 active:scale-95 cursor-pointer"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">search</span>
              <span className="hidden sm:block">{language === "de" ? "Suchen" : "Search"}</span>
            </button>
          </div>

          {/* Row 2: Filters + Sort — flex-wrap to ensure absolute dropdowns are visible on mobile */}
          <div className="relative flex flex-wrap items-center gap-2 pb-0.5 -mx-1 px-1 overflow-visible">

            {/* ── Unified Filters dropdown ─────────── */}
            {(() => {
              const totalBadge =
                activeFilters.length +
                (priceRange ? 1 : 0) +
                (propertyType !== "all" ? 1 : 0) +
                (distance !== "any" ? 1 : 0) +
                (moveInDate ? 1 : 0) +
                (moveOutDate ? 1 : 0);

              const clearAll = () => {
                setActiveFilters([]);
                setPriceRange("");
                setPropertyType("all");
                setDistance("any");
                setMoveInDate("");
                setMoveOutDate("");
              };

              return (
                <Dropdown
                  id="dd-filters"
                  label={language === "de" ? "Filter" : "Filters"}
                  icon="tune"
                  badge={totalBadge || undefined}
                >
                  {/* ── Amenities ── */}
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {language === "de" ? "Ausstattung & Merkmale" : "Amenities & Features"}
                    </p>
                  </div>
                  <div className="pb-1">
                    {amenityFilters.map(({ id, label, icon }) => (
                      <FilterCheck
                        key={id}
                        id={id}
                        label={label}
                        icon={icon}
                        checked={activeFilters.includes(id)}
                        onChange={() => toggleFilter(id)}
                      />
                    ))}
                  </div>

                  {/* ── Price Range Slider ── */}
                  <div className="border-t border-outline-variant mx-4" />
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        {language === "de" ? "Maximale Warmmiete" : "Max. Rent (warm)"}
                      </p>
                      <span className="text-label-sm font-bold text-primary">
                        {priceRange ? `${priceRange} €` : (language === "de" ? "Jeder Preis" : "Any price")}
                      </span>
                    </div>
                    <div className="px-1 py-3">
                      <input
                        type="range"
                        min="200"
                        max="5000"
                        step="50"
                        value={priceRange || "5000"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPriceRange(val === "5000" ? "" : val);
                        }}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent"
                        style={{ background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${((parseFloat(priceRange || "5000") - 200) / 4800) * 100}%, var(--color-outline-variant) ${((parseFloat(priceRange || "5000") - 200) / 4800) * 100}%, var(--color-outline-variant) 100%)` }}
                      />
                      <div className="flex justify-between text-[10px] text-on-surface-variant/70 mt-1 font-semibold">
                        <span>200 €</span>
                        <span>1.500 €</span>
                        <span>3.000 €</span>
                        <span>5.000 €+</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Rental Period (Dates) ── */}
                  <div className="border-t border-outline-variant mx-4" />
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {language === "de" ? "Mietzeitraum" : "Rental Period"}
                    </p>
                  </div>
                  <div className="px-4 pb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-on-surface-variant/70">{language === "de" ? "Einzug" : "Move in"}</span>
                        <input
                          type="date"
                          value={moveInDate}
                          onChange={(e) => setMoveInDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-[13px] font-semibold text-on-surface focus:outline-none"
                          style={{ colorScheme: "light" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-on-surface-variant/70">{language === "de" ? "Auszug" : "Move out"}</span>
                        <input
                          type="date"
                          value={moveOutDate}
                          onChange={(e) => setMoveOutDate(e.target.value)}
                          className="w-full px-2 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-[13px] font-semibold text-on-surface focus:outline-none"
                          style={{ colorScheme: "light" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Property Type ── */}
                  <div className="border-t border-outline-variant mx-4" />
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {language === "de" ? "Wohnungstyp" : "Property Type"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 px-3 pb-2">
                    {typeOptions.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setPropertyType(value)}
                        className={`px-3 py-2 rounded-lg text-label-sm text-left transition-all border cursor-pointer ${
                          propertyType === value
                            ? "bg-primary text-on-primary border-primary font-bold"
                            : "border-outline-variant text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* ── Distance ── */}
                  <div className="border-t border-outline-variant mx-4" />
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {language === "de" ? "Entfernung vom Zentrum" : "Distance from Centre"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 px-3 pb-3">
                    {distanceOptions.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setDistance(value)}
                        className={`px-3 py-2 rounded-lg text-label-sm text-left transition-all border cursor-pointer ${
                          distance === value
                            ? "bg-primary text-on-primary border-primary font-bold"
                            : "border-outline-variant text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* ── Footer: clear all ── */}
                  {totalBadge > 0 && (
                    <div className="border-t border-outline-variant px-4 py-3 flex justify-between items-center">
                      <span className="text-[12px] text-on-surface-variant">
                        {totalBadge} {language === "de" ? "aktiv" : "active"}
                      </span>
                      <button
                        onClick={clearAll}
                        className="text-[12px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        {language === "de" ? "Alle zurücksetzen" : "Clear all"}
                      </button>
                    </div>
                  )}
                </Dropdown>
              );
            })()}

            {/* Divider */}
            <div className="h-7 w-px bg-outline-variant flex-shrink-0" />

            {/* ── Sort By dropdown ── */}
            <Dropdown
              id="dd-sort"
              label={language === "de" ? "Sortierung" : "Sort"}
              icon="swap_vert"
              align="right"
            >
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {language === "de" ? "Sortieren nach" : "Sort by"}
                </p>
              </div>
              <div className="pb-3">
                {sortOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSort(value)}
                    className={`w-full text-left px-4 py-2.5 text-label-sm hover:bg-surface-container transition-colors flex items-center justify-between ${
                      sort === value ? "text-primary font-bold bg-primary/5" : "text-on-surface"
                    }`}
                  >
                    <span>{label}</span>
                    {sort === value && <span className="material-symbols-outlined text-[16px] text-primary">check</span>}
                  </button>
                ))}
              </div>
            </Dropdown>

            {/* Active filter quick-clear badge */}
            {(activeFilters.length + (priceRange ? 1 : 0) + (propertyType !== "all" ? 1 : 0) + (distance !== "any" ? 1 : 0) + (moveInDate ? 1 : 0) + (moveOutDate ? 1 : 0)) > 0 && (
              <button
                onClick={() => {
                  setActiveFilters([]);
                  setPriceRange("");
                  setPropertyType("all");
                  setDistance("any");
                  setMoveInDate("");
                  setMoveOutDate("");
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-bold text-error border border-error/30 bg-error/5 hover:bg-error/10 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[14px]">filter_list_off</span>
                {language === "de" ? "Filter löschen" : "Clear filters"}
              </button>
            )}
          </div>
        </div>
      </section>


      {/* ── Split View ─────────────────────────────────────────────────── */}
      <div className="flex flex-grow overflow-hidden">
        {/* Map */}
        <aside className="hidden md:block w-full md:w-[40%] relative bg-surface-dim flex-shrink-0 border-r border-outline-variant">
          <div className="absolute inset-0 w-full h-full">
            <iframe
              title="Google Maps"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${encodeURIComponent(
                stadtParam ? `${stadtParam}, Germany` : "Germany"
              )}&t=&z=${stadtParam ? 12 : 9}&ie=UTF8&iwloc=&output=embed`}
              className="w-full h-full grayscale-[15%] contrast-[105%] opacity-90 transition-opacity duration-300"
            />
          </div>
        </aside>

        {/* Listings */}
        <section className="w-full md:w-[60%] overflow-y-auto custom-scrollbar bg-background px-4 sm:px-6 md:px-[48px] py-5 md:py-8">
          <div className="flex justify-between items-center mb-5 md:mb-8 flex-wrap gap-3">
            <div className="min-w-0">
              <h1 className="text-[20px] md:text-headline-lg text-primary font-bold leading-snug truncate">
                {hasSearched
                  ? (stadtParam
                    ? (language === "de" ? `Wohnungen in ${stadtParam}` : `Apartments in ${stadtParam}`)
                    : (language === "de" ? "Gefilterte Wohnungen" : "Filtered Apartments"))
                  : (language === "de" ? "Wo möchtest du wohnen?" : "Where do you want to live?")}
              </h1>
              <p className="text-[13px] md:text-body-md text-on-surface-variant mt-0.5">
                {hasSearched
                  ? <>{listings.length} {t("resultsFound")}{sort !== "newest" && <span className="ml-2 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{currentSortLabel}</span>}</>
                  : (language === "de" ? "Gib eine Stadt ein, um Inserate freizuschalten." : "Enter a city to unlock listings.")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                id="view-grid"
                onClick={() => setView("grid")}
                className={`p-2 border rounded-lg transition-colors cursor-pointer ${view === "grid" ? "bg-surface-container border-primary" : "border-outline-variant hover:bg-surface-container"}`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
              </button>
              <button
                id="view-list"
                onClick={() => setView("list")}
                className={`p-2 border rounded-lg transition-colors cursor-pointer ${view === "list" ? "bg-surface-container border-primary" : "border-outline-variant hover:bg-surface-container"}`}
              >
                <span className="material-symbols-outlined text-[20px]">view_list</span>
              </button>
            </div>
          </div>

          {/* Active filter pills — horizontally scrollable on mobile */}
          {(activeBadgeCount > 0 || priceRange || propertyType !== "all" || distance !== "any" || moveInDate || moveOutDate) && (
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
              {activeFilters.map((f) => {
                const af = amenityFilters.find(a => a.id === f);
                return af ? (
                  <span key={f} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20">
                    <span className="material-symbols-outlined text-[13px]">{af.icon}</span>
                    {af.label}
                    <button onClick={() => toggleFilter(f)} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                  </span>
                ) : null;
              })}
              {priceRange && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20">
                  <span className="material-symbols-outlined text-[13px]">euro</span>
                  {currentPriceLabel}
                  <button onClick={() => setPriceRange("")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {propertyType !== "all" && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20">
                  <span className="material-symbols-outlined text-[13px]">apartment</span>
                  {currentTypeLabel}
                  <button onClick={() => setPropertyType("all")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {distance !== "any" && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20">
                  <span className="material-symbols-outlined text-[13px]">near_me</span>
                  {currentDistLabel}
                  <button onClick={() => setDistance("any")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {moveInDate && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20">
                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                  {language === "de" ? `Einzug: ${moveInDate}` : `Move in: ${moveInDate}`}
                  <button onClick={() => setMoveInDate("")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {moveOutDate && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20">
                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                  {language === "de" ? `Auszug: ${moveOutDate}` : `Move out: ${moveOutDate}`}
                  <button onClick={() => setMoveOutDate("")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-24 w-full">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
                <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
                <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
              </div>
            </div>
          ) : !hasSearched ? (
            /* ── Empty state: no input given yet ── */
            <div className="flex flex-col items-center justify-center py-20 w-full text-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-2 animate-bounce">
                <span className="material-symbols-outlined text-primary text-[42px]" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
              </div>
              <div>
                <h2 className="text-headline-md font-bold text-primary mb-2">
                  {language === "de" ? "Wo möchtest du wohnen?" : "Where do you want to live?"}
                </h2>
                <p className="text-body-md text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  {language === "de"
                    ? "Gib eine Stadt in das Suchfeld ein, um passende Inserate freizuschalten."
                    : "Enter a city in the search bar above to unlock matching listings."}
                </p>
              </div>
              <button
                onClick={() => document.getElementById("suche-city-search")?.focus()}
                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-bold text-label-md hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
                {language === "de" ? "Stadt eingeben" : "Enter a city"}
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-24 text-on-surface-variant text-body-md w-full border-2 border-dashed border-outline-variant/40 rounded-2xl bg-white">
              {language === "de" ? "Keine Objekte gefunden. Bitte Filter anpassen." : "No listings found. Try adjusting your filters."}
            </div>
          ) : (
            <div className={`grid gap-4 md:gap-6 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2" : "grid-cols-1"}`}>
              {listings.map((l) => (
                <article
                  key={l.id}
                  className="group bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <Link href={`/objekt/${l.id}`}>
                    {/* Image */}
                    <div className="relative h-44 sm:h-52 md:h-56 overflow-hidden bg-surface-container flex items-center justify-center">
                      <img
                        src={getPrimaryPhoto(l)}
                        alt={l.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {/* Gradient overlay for readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                      {/* Furnished badge */}
                      {l.furnished && (
                        <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">weekend</span>
                          {language === "de" ? "Möbliert" : "Furnished"}
                        </span>
                      )}
                      <button
                        id={`fav-${l.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(l.id);
                        }}
                        className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-full hover:bg-white transition-colors cursor-pointer group/fav"
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] transition-colors ${
                            favorites.includes(l.id)
                              ? "text-red-500"
                              : "text-on-surface-variant group-hover/fav:text-red-400"
                          }`}
                          style={{ fontVariationSettings: favorites.includes(l.id) ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          favorite
                        </span>
                      </button>
                    </div>
                    {/* Card body */}
                    <div className="p-4 md:p-5">
                      <h3 className="text-[15px] md:text-headline-md text-primary leading-tight font-bold mb-0.5 line-clamp-1">{l.title}</h3>
                      <p className="text-[12px] md:text-body-md text-on-surface-variant mb-3 line-clamp-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        {l.street}, {l.zip} {l.city}
                      </p>
                      {/* Stats row */}
                      <div className="flex items-center divide-x divide-outline-variant/40 mb-3">
                        {[
                          { label: t("rentWarm"), value: `${Math.round(parseFloat(l.rent_cold) + parseFloat(l.rent_utilities) + parseFloat(l.rent_heating))} €`, bold: true },
                          { label: t("area"), value: `${l.size_sqm} m²` },
                          { label: t("rooms"), value: l.rooms },
                        ].map(({ label, value, bold }, i) => (
                          <div key={label} className={`flex flex-col ${i === 0 ? "pr-4" : "px-4"}`}>
                            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">{label}</span>
                            <span className={`text-[15px] md:text-[17px] leading-6 ${bold ? "text-primary font-bold" : "text-on-surface font-semibold"}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                      {/* Amenity tags — scrollable on mobile */}
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                        {l.amenities && l.amenities.slice(0, 4).map((tag: string) => (
                          <span key={tag} className="flex-shrink-0 bg-surface-variant text-on-surface-variant px-2.5 py-0.5 rounded-lg text-[11px] font-semibold capitalize">
                            {tag}
                          </span>
                        ))}
                        {l.amenities && l.amenities.length > 4 && (
                          <span className="flex-shrink-0 bg-surface-variant text-on-surface-variant px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
                            +{l.amenities.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-12 flex justify-center items-center gap-4 pb-8">
            <button disabled className="p-2 border border-outline-variant rounded-full hover:bg-surface-container transition-colors disabled:opacity-30 cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full font-semibold transition-colors cursor-pointer bg-primary text-on-primary">1</button>
            </div>
            <button disabled className="p-2 border border-outline-variant rounded-full hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-30">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          <Footer />
        </section>
      </div>
    </div>
  );
}

export default function SuchePage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex flex-col items-center justify-center min-h-[600px] bg-[#f8f9ff]">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
            <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
            <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-[15px] text-[#002046] font-extrabold uppercase tracking-[0.25em] animate-pulse font-sans">
              Heimstadt
            </p>
            <p className="text-[9px] text-[#002046]/60 uppercase tracking-[0.3em] font-bold font-sans">
              Exklusive Wohnungen
            </p>
          </div>
        </div>
      </div>
    }>
      <SuchePageContent />
    </Suspense>
  );
}

