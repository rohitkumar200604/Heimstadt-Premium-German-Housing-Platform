"use client";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { supabase, isSupabaseConfigured } from "@/utils/supabase/client";
import Footer from "@/components/layout/Footer";
import { getDisplayPhoto } from "@/utils/get-display-photo";
import { normalizeCityName } from "@/utils/translations";
import dynamic from "next/dynamic";

const PropertyMap = dynamic(() => import("./PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container-low">
      <div className="w-8 h-8 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin" />
    </div>
  ),
});

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
        <div className={`absolute top-full left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 mt-2 z-50 bg-white border border-outline-variant rounded-2xl shadow-2xl w-[92vw] sm:min-w-[320px] sm:w-auto max-h-[calc(100vh-220px)] overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${
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

const CITY_NEIGHBORHOODS: Record<string, string[]> = {
  berlin: [
    "Mitte", "Friedrichshain", "Kreuzberg", "Prenzlauer Berg", "Neukölln",
    "Charlottenburg", "Wilmersdorf", "Schöneberg", "Tempelhof", "Moabit",
    "Wedding", "Pankow", "Lichtenberg", "Steglitz", "Zehlendorf", "Spandau",
    "Reinickendorf", "Treptow", "Köpenick"
  ],
  münchen: [
    "Altstadt-Lehel", "Ludwigsvorstadt-Isarvorstadt", "Maxvorstadt",
    "Schwabing", "Au-Haidhausen", "Sendling", "Schwanthalerhöhe",
    "Neuhausen-Nymphenburg", "Bogenhausen", "Trudering-Riem", "Ramersdorf-Perlach",
    "Obergiesing", "Untergiesing", "Thalkirchen", "Hadern", "Laim"
  ],
  munich: [
    "Altstadt-Lehel", "Ludwigsvorstadt-Isarvorstadt", "Maxvorstadt",
    "Schwabing", "Au-Haidhausen", "Sendling", "Schwanthalerhöhe",
    "Neuhausen-Nymphenburg", "Bogenhausen", "Trudering-Riem", "Ramersdorf-Perlach",
    "Obergiesing", "Untergiesing", "Thalkirchen", "Hadern", "Laim"
  ],
  hamburg: [
    "Altona", "Bergedorf", "Eimsbüttel", "Hamburg-Mitte", "Hamburg-Nord",
    "Harburg", "Wandsbek", "St. Pauli", "Speicherstadt", "Winterhude",
    "Eppendorf", "Sternschanze", "Barmbek"
  ],
  köln: [
    "Innenstadt", "Rodenkirchen", "Lindenthal", "Ehrenfeld", "Nippes",
    "Chorweiler", "Porz", "Kalk", "Mülheim", "Deutz"
  ],
  cologne: [
    "Innenstadt", "Rodenkirchen", "Lindenthal", "Ehrenfeld", "Nippes",
    "Chorweiler", "Porz", "Kalk", "Mülheim", "Deutz"
  ],
  frankfurt: [
    "Altstadt", "Innenstadt", "Bahnhofsviertel", "Westend", "Nordend",
    "Ostend", "Sachsenhausen", "Bornheim", "Gallus", "Bockenheim"
  ],
  stuttgart: [
    "Stuttgart-Mitte", "Stuttgart-Nord", "Stuttgart-Ost", "Stuttgart-Süd",
    "Stuttgart-West", "Bad Cannstatt", "Degerloch", "Möhringen"
  ]
};

const ALL_SUGGESTIONS = [
  { de: "Berlin", en: "Berlin" },
  { de: "München", en: "Munich" },
  { de: "Hamburg", en: "Hamburg" },
  { de: "Frankfurt", en: "Frankfurt" },
  { de: "Köln", en: "Cologne" },
  { de: "Düsseldorf", en: "Düsseldorf" },
  { de: "Stuttgart", en: "Stuttgart" },
  { de: "Leipzig", en: "Leipzig" },
  { de: "Nürnberg", en: "Nuremberg" },
  { de: "Hannover", en: "Hanover" },
  { de: "Braunschweig", en: "Brunswick" },
  { de: "Konstanz", en: "Constance" },
  { de: "Bremen", en: "Bremen" },
  { de: "Dresden", en: "Dresden" },
  { de: "Essen", en: "Essen" },
  { de: "Dortmund", en: "Dortmund" },
  { de: "Duisburg", en: "Duisburg" },
  { de: "Bochum", en: "Bochum" },
  { de: "Wuppertal", en: "Wuppertal" },
  { de: "Bielefeld", en: "Bielefeld" },
  { de: "Bonn", en: "Bonn" },
  { de: "Münster", en: "Münster" },
  { de: "Karlsruhe", en: "Karlsruhe" },
  { de: "Mannheim", en: "Mannheim" },
  { de: "Augsburg", en: "Augsburg" },
  { de: "Wiesbaden", en: "Wiesbaden" },
  { de: "Gelsenkirchen", en: "Gelsenkirchen" },
  { de: "Mönchengladbach", en: "Mönchengladbach" },
  { de: "Chemnitz", en: "Chemnitz" },
  { de: "Aachen", en: "Aachen" },
  { de: "Halle", en: "Halle" },
  { de: "Magdeburg", en: "Magdeburg" },
  { de: "Freiburg", en: "Freiburg" },
  { de: "Krefeld", en: "Krefeld" },
  { de: "Lübeck", en: "Lübeck" },
  { de: "Mainz", en: "Mainz" },
  { de: "Erfurt", en: "Erfurt" },
  { de: "Rostock", en: "Rostock" },
  { de: "Kassel", en: "Kassel" },
  { de: "Potsdam", en: "Potsdam" },
  { de: "Saarbrücken", en: "Saarbrücken" },
  { de: "Hamm", en: "Hamm" },
  { de: "Ludwigshafen", en: "Ludwigshafen" },
  { de: "Mülheim", en: "Mülheim" },
  { de: "Oldenburg", en: "Oldenburg" },
  { de: "Osnabrück", en: "Osnabrück" },
  { de: "Leverkusen", en: "Leverkusen" },
  { de: "Solingen", en: "Solingen" },
  { de: "Heidelberg", en: "Heidelberg" },
  { de: "Darmstadt", en: "Darmstadt" },
  { de: "Alexanderplatz, Berlin", en: "Alexanderplatz, Berlin" },
  { de: "Englischer Garten, München", en: "Englischer Garten, Munich" },
  { de: "Speicherstadt, Hamburg", en: "Speicherstadt, Hamburg" },
  { de: "Glockenbachviertel, München", en: "Glockenbachviertel, Munich" },
  { de: "Schildergasse, Köln", en: "Schildergasse, Cologne" },
];

const getSearchCities = (query: string): string[] => {
  const normalized = query.trim().toLowerCase();
  if (cityMappings[normalized]) {
    return cityMappings[normalized];
  }
  return [query.trim()];
};

function promiseTimeout<T>(promise: any, ms: number): Promise<T> {
  const finalMs = Math.max(ms, 20000); // Safe minimum of 20 seconds for cold starts / slow DB instances
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Database query timed out"));
    }, finalMs);

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
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const stadtParam = searchParams.get("stadt") || "";
  const zimmerParam = searchParams.get("zimmer") || "all";
  const preisParam = searchParams.get("preis") || "";

  const hasSearched = stadtParam.trim() !== "" || searchParams.get("wishlist") === "true";
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!stadtParam.trim() || searchParams.get("wishlist") === "true");

  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [savedFiltersLoading, setSavedFiltersLoading] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [isSavingFilter, setIsSavingFilter] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(stadtParam);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [priceRange, setPriceRange] = useState(preisParam || "");
  const [propertyType, setPropertyType] = useState(zimmerParam);
  const [distance, setDistance] = useState("any");
  const [sort, setSort] = useState("newest");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [topPlaces, setTopPlaces] = useState<any[]>([]);
  const [topPlacesLoading, setTopPlacesLoading] = useState(true);

  const moveInParam = searchParams.get("moveIn") || "";
  const moveOutParam = searchParams.get("moveOut") || "";
  const [moveInDate, setMoveInDate] = useState(moveInParam);
  const [moveOutDate, setMoveOutDate] = useState(moveOutParam);

  const furnitureParam = searchParams.get("furniture") || "";
  const [furnitureFurnished, setFurnitureFurnished] = useState(furnitureParam.split(",").includes("furnished"));
  const [furnitureUnfurnished, setFurnitureUnfurnished] = useState(furnitureParam.split(",").includes("unfurnished"));

  const roommatesParam = searchParams.get("roommates") || "regardless";
  const [roommatesGender, setRoommatesGender] = useState(roommatesParam);

  const ratingParam = searchParams.get("rating") || "any";
  const [landlordRating, setLandlordRating] = useState(ratingParam);

  const wgSizeParam = searchParams.get("wgSize") || "regardless";
  const [wgSize, setWgSize] = useState(wgSizeParam);

  // ── New filter state ─────────────────────────────────────────────────
  const neighborhoodParam = searchParams.get("neighborhoods") || "";
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(
    neighborhoodParam ? neighborhoodParam.split(",") : []
  );
  const [billsIncluded, setBillsIncluded] = useState(searchParams.get("billsIncluded") === "true");
  const [noDeposit, setNoDeposit] = useState(searchParams.get("noDeposit") === "true");
  const bedroomsParam = searchParams.get("bedrooms") || "";
  const [selectedBedrooms, setSelectedBedrooms] = useState<string[]>(
    bedroomsParam ? bedroomsParam.split(",") : []
  );
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");

  // ── Additional new filters ────────────────────────────────────────────
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [roomCount, setRoomCount] = useState(1);
  const [singleBeds, setSingleBeds] = useState(0);
  const [doubleBeds, setDoubleBeds] = useState(0);
  const [rentCalculation, setRentCalculation] = useState<string[]>([]);
  const [smokingAllowed, setSmokingAllowed] = useState("any");
  const [registrationPossible, setRegistrationPossible] = useState("any");
  const [suitableForCouples, setSuitableForCouples] = useState(false);

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

  // Fetch saved filters when user changes
  useEffect(() => {
    if (!user) {
      setSavedFilters([]);
      return;
    }
    const loadSavedFilters = async () => {
      setSavedFiltersLoading(true);
      try {
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from("saved_filters")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (!error && data) {
            setSavedFilters(data);
            setSavedFiltersLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Supabase load saved_filters failed, using localStorage fallback:", e);
      }
      
      const saved = localStorage.getItem(`heimat_saved_filters_${user.id}`);
      if (saved) {
        try {
          setSavedFilters(JSON.parse(saved));
        } catch (e) {}
      }
      setSavedFiltersLoading(false);
    };
    loadSavedFilters();
  }, [user]);

  const handleSaveFilter = async () => {
    if (!user) {
      (window as any).alert(t("saveSearchLoginError"), () => {
        router.push("/auth/register");
      });
      return;
    }
    if (!newFilterName.trim()) return;
    setIsSavingFilter(true);

    const filterObj = {
      city: searchInput,
      maxPrice: priceRange ? parseInt(priceRange) : null,
      rooms: propertyType !== "all" ? propertyType : null,
      moveIn: moveInDate || null,
      moveOut: moveOutDate || null,
      furnished: furnitureFurnished ? true : furnitureUnfurnished ? false : null,
      petsAllowed: activeFilters.includes("pets_allowed") ? true : null,
      amenities: activeFilters,
      wgSize: wgSize !== "regardless" ? wgSize : null,
      roommates: roommatesGender !== "regardless" ? roommatesGender : null,
      rating: landlordRating !== "any" ? landlordRating : null
    };

    const newFilter = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      user_id: user.id,
      name: newFilterName.trim(),
      filters: filterObj,
      created_at: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("saved_filters")
          .insert({
            user_id: user.id,
            name: newFilterName.trim(),
            filters: filterObj
          })
          .select()
          .single();
        if (!error && data) {
          setSavedFilters(prev => [data, ...prev]);
          setNewFilterName("");
          setIsSavingFilter(false);
          return;
        } else {
          console.error("Supabase insert error:", error);
        }
      }
    } catch (e) {
      console.warn("Supabase insert saved_filters failed, using localStorage fallback:", e);
    }

    // Local Storage Fallback
    const saved = localStorage.getItem(`heimat_saved_filters_${user.id}`);
    let list = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {}
    }
    const updated = [newFilter, ...list];
    localStorage.setItem(`heimat_saved_filters_${user.id}`, JSON.stringify(updated));
    setSavedFilters(updated);
    setNewFilterName("");
    setIsSavingFilter(false);
  };

  const handleDeleteFilter = async (id: string) => {
    if (!user) return;
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("saved_filters")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (!error) {
          setSavedFilters(prev => prev.filter(f => f.id !== id));
          return;
        }
      }
    } catch (e) {
      console.warn("Supabase delete saved_filters failed, using localStorage fallback:", e);
    }

    // Local Storage Fallback
    const saved = localStorage.getItem(`heimat_saved_filters_${user.id}`);
    if (saved) {
      try {
        const list = JSON.parse(saved) as any[];
        const updated = list.filter(f => f.id !== id);
        localStorage.setItem(`heimat_saved_filters_${user.id}`, JSON.stringify(updated));
        setSavedFilters(updated);
      } catch (e) {}
    }
  };

  const handleApplySavedFilter = (filter: any) => {
    const f = filter.filters;
    setSearchInput(f.city || "");
    setPriceRange(f.maxPrice ? String(f.maxPrice) : "");
    setPropertyType(f.rooms || "all");
    setMoveInDate(f.moveIn || "");
    setMoveOutDate(f.moveOut || "");
    setFurnitureFurnished(f.furnished === true);
    setFurnitureUnfurnished(f.furnished === false);
    setWgSize(f.wgSize || "regardless");
    setRoommatesGender(f.roommates || "regardless");
    setLandlordRating(f.rating || "any");
    setActiveFilters(f.amenities || []);

    // Also push the parameters to URL
    const params = new URLSearchParams();
    if (f.city) params.set("stadt", f.city);
    if (f.rooms) params.set("zimmer", f.rooms);
    if (f.maxPrice) params.set("preis", String(f.maxPrice));
    if (f.moveIn) params.set("moveIn", f.moveIn);
    if (f.moveOut) params.set("moveOut", f.moveOut);

    const furList: string[] = [];
    if (f.furnished === true) furList.push("furnished");
    if (f.furnished === false) furList.push("unfurnished");
    if (furList.length > 0) params.set("furniture", furList.join(","));

    if (f.roommates && f.roommates !== "regardless") params.set("roommates", f.roommates);
    if (f.rating && f.rating !== "any") params.set("rating", f.rating);
    if (f.wgSize && f.wgSize !== "regardless") params.set("wgSize", f.wgSize);

    router.push(`/suche?${params.toString()}`);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (val: string) => {
    setSearchInput(val);
    if (!val.trim()) {
      setFilteredCities([]);
      setShowSuggestions(false);
      return;
    }

    const matches = ALL_SUGGESTIONS.filter(
      (c) =>
        c.de.toLowerCase().includes(val.toLowerCase()) ||
        c.en.toLowerCase().includes(val.toLowerCase())
    ).map((c) => (language === "de" ? c.de : c.en));

    setFilteredCities(matches);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (city: string) => {
    setSearchInput(city);
    setShowSuggestions(false);
    
    // Immediately apply search when suggestion is selected
    const params = new URLSearchParams();
    if (city.trim()) params.set("stadt", city.trim());
    if (propertyType && propertyType !== "all") params.set("zimmer", propertyType);
    if (priceRange) params.set("preis", priceRange);
    if (moveInDate) params.set("moveIn", moveInDate);
    if (moveOutDate) params.set("moveOut", moveOutDate);

    const furList: string[] = [];
    if (furnitureFurnished) furList.push("furnished");
    if (furnitureUnfurnished) furList.push("unfurnished");
    if (furList.length > 0) params.set("furniture", furList.join(","));

    if (roommatesGender && roommatesGender !== "regardless") params.set("roommates", roommatesGender);
    if (landlordRating && landlordRating !== "any") params.set("rating", landlordRating);
    if (wgSize && wgSize !== "regardless") params.set("wgSize", wgSize);

    const wishlistParam = searchParams.get("wishlist");
    if (wishlistParam) params.set("wishlist", wishlistParam);

    router.push(`/suche?${params.toString()}`);
  };

  useEffect(() => {
    const fetchTopPlaces = async () => {
      setTopPlacesLoading(true);
      try {
        let dbPlaces: any[] = [];
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from("properties")
            .select(`*, property_photos(cdn_url,is_primary)`)
            .eq("status", "active");
          if (!error && data) {
            dbPlaces = data;
          }
        }
        
        const fallbackListings: any[] = [
          {
            id: "berlin-studio",
            title: language === "de" ? "Helles Studio-Apartment nahe Alexanderplatz" : "Bright Studio Apartment near Alexanderplatz",
            city: "Berlin", street: "Karl-Liebknecht-Str. 12", zip: "10178",
            rooms: 1, size_sqm: 38, rent_cold: 720, rent_utilities: 80, rent_heating: 70,
            pets_allowed: true, furnished: false,
            amenities: ["balcony", "kitchen"],
            status: "active",
            landlord_rating: 4.5,
            is_new_landlord: false,
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
            landlord_rating: 3.8,
            is_new_landlord: false,
            property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80", is_primary: true }]
          },
          {
            id: "hamburg-loft",
            title: language === "de" ? "Stilvolles Loft in der Speicherstadt" : "Stylish Loft in Speicherstadt",
            city: "Hamburg", street: "Am Sandtorkai 10", zip: "20457",
            rooms: 2, size_sqm: 65, rent_cold: 1120, rent_utilities: 110, rent_heating: 90,
            pets_allowed: true, furnished: true,
            amenities: ["balcony", "kitchen", "laundry"],
            status: "active",
            landlord_rating: 4.8,
            is_new_landlord: false,
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
            roommate_gender: "masculine",
            wg_size: 3,
            landlord_rating: 4.2,
            is_new_landlord: false,
            property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80", is_primary: true }]
          },
          {
            id: "munich-wg-female",
            title: language === "de" ? "Zimmer in netter Mädels-WG am Harras" : "Room in nice female shared apartment at Harras",
            city: "München", street: "Albert-Roßhaupter-Str. 10", zip: "81369",
            rooms: 1, size_sqm: 18, rent_cold: 520, rent_utilities: 50, rent_heating: 35,
            pets_allowed: false, furnished: true,
            amenities: ["kitchen", "laundry"],
            status: "active",
            roommate_gender: "female",
            wg_size: 4,
            landlord_rating: 4.0,
            is_new_landlord: false,
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
            landlord_rating: 4.6,
            is_new_landlord: true,
            property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80", is_primary: true }]
          }
        ];

        const combined = [...dbPlaces, ...fallbackListings];
        const unique = combined.filter((v, i, self) => self.findIndex(t => t.id === v.id) === i);
        setTopPlaces(unique);
      } catch (err) {
        console.error("Error fetching top places:", err);
      } finally {
        setTopPlacesLoading(false);
      }
    };
    fetchTopPlaces();
  }, [language]);

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("heimat_favorites", JSON.stringify(next));
  };

  // Sync searchInput with URL param on mount / param change
  useEffect(() => {
    const isWishlist = searchParams.get("wishlist") === "true";
    if (isWishlist) {
      setSearchInput("");
      setPriceRange("");
      setPropertyType("all");
      setDistance("any");
      setMoveInDate("");
      setMoveOutDate("");
      setFurnitureFurnished(false);
      setFurnitureUnfurnished(false);
      setRoommatesGender("regardless");
      setLandlordRating("any");
      setWgSize("regardless");
      setSelectedNeighborhoods([]);
      setBillsIncluded(false);
      setNoDeposit(false);
      setSelectedBedrooms([]);
      setActiveFilters([]);
    } else {
      setSearchInput(stadtParam);
      setPriceRange(preisParam || "");
      setPropertyType(zimmerParam);
      setMoveInDate(searchParams.get("moveIn") || "");
      setMoveOutDate(searchParams.get("moveOut") || "");
      const furParam = searchParams.get("furniture") || "";
      setFurnitureFurnished(furParam.split(",").includes("furnished"));
      setFurnitureUnfurnished(furParam.split(",").includes("unfurnished"));
      setRoommatesGender(searchParams.get("roommates") || "regardless");
      setLandlordRating(searchParams.get("rating") || "any");
      setWgSize(searchParams.get("wgSize") || "regardless");
      setSelectedNeighborhoods(neighborhoodParam ? neighborhoodParam.split(",") : []);
      setBillsIncluded(searchParams.get("billsIncluded") === "true");
      setNoDeposit(searchParams.get("noDeposit") === "true");
      setSelectedBedrooms(bedroomsParam ? bedroomsParam.split(",") : []);
    }
  }, [stadtParam, zimmerParam, preisParam, neighborhoodParam, bedroomsParam, searchParams]);

  // Push URL when city search is submitted
  const applySearch = useCallback(() => {
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("stadt", searchInput.trim());
    if (propertyType && propertyType !== "all") params.set("zimmer", propertyType);
    if (priceRange) params.set("preis", priceRange);
    if (moveInDate) params.set("moveIn", moveInDate);
    if (moveOutDate) params.set("moveOut", moveOutDate);

    const furList: string[] = [];
    if (furnitureFurnished) furList.push("furnished");
    if (furnitureUnfurnished) furList.push("unfurnished");
    if (furList.length > 0) params.set("furniture", furList.join(","));

    if (roommatesGender && roommatesGender !== "regardless") params.set("roommates", roommatesGender);
    if (landlordRating && landlordRating !== "any") params.set("rating", landlordRating);
    if (wgSize && wgSize !== "regardless") params.set("wgSize", wgSize);

    const wishlistParam = searchParams.get("wishlist");
    if (wishlistParam) params.set("wishlist", wishlistParam);

    router.push(`/suche?${params.toString()}`);
  }, [
    searchInput,
    propertyType,
    priceRange,
    moveInDate,
    moveOutDate,
    furnitureFurnished,
    furnitureUnfurnished,
    roommatesGender,
    landlordRating,
    wgSize,
    router,
    searchParams,
  ]);

  const amenityFilters = [
    { id: "balcony", label: t("balcony"), icon: "balcony" },
    { id: "kitchen", label: t("kitchen"), icon: "countertops" },
    { id: "laundry", label: t("laundry"), icon: "local_laundry_service" },
    { id: "parking", label: t("parkingSpot"), icon: "local_parking" },
    { id: "pets", label: t("petsAllowed"), icon: "pets" },
    { id: "wheelchair", label: t("wheelchair"), icon: "accessible" },
    { id: "elevator", label: t("elevator"), icon: "elevator" },
    { id: "garden", label: t("garden"), icon: "yard" },
    { id: "cellar", label: t("cellar"), icon: "inventory_2" },
    { id: "air_conditioning", label: t("airConditioning"), icon: "ac_unit" },
    { id: "wifi", label: "WiFi", icon: "wifi" },
    { id: "dishwasher", label: t("dishwasher"), icon: "countertops" },
    { id: "washing_machine", label: t("washingMachine"), icon: "local_laundry_service" },
    { id: "tv", label: t("tv"), icon: "tv" },
  ];

  const toggleFilter = (id: string) =>
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );

  const priceBands = [
    { value: "", label: t("anyPrice") },
    { value: "500", label: "< 500 €" },
    { value: "700", label: "< 700 €" },
    { value: "1000", label: "< 1.000 €" },
    { value: "1500", label: "< 1.500 €" },
    { value: "2000", label: "< 2.000 €" },
    { value: "3000", label: "< 3.000 €" },
  ];

  const typeOptions = [
    { value: "all", label: t("allTypes"), icon: "home" },
    { value: "shared_room", label: t("sharedRoom"), icon: "group" },
    { value: "private_room", label: t("privateRoom"), icon: "person" },
    { value: "studio", label: "Studio", icon: "apartment" },
    { value: "apartment", label: t("apartment"), icon: "domain" },
    { value: "student_residence", label: t("studentResidence"), icon: "school" },
    { value: "house", label: t("house"), icon: "house" },
    { value: "shared", label: t("sharedApartment"), icon: "groups" },
  ];

  const bedroomOptions = [
    { value: "1", label: t("bedroom1") },
    { value: "2", label: t("bedroom2") },
    { value: "3", label: t("bedroom3") },
    { value: "4", label: t("bedroom4plus") },
  ];

  const getNeighborhoodList = () => {
    const cityKey = stadtParam.trim().toLowerCase();
    if (CITY_NEIGHBORHOODS[cityKey]) {
      return CITY_NEIGHBORHOODS[cityKey];
    }
    
    // Fallback: extract unique street names (neighborhood hints) from current listings
    if (listings && listings.length > 0) {
      const extracted = new Set<string>();
      listings.forEach(l => {
        if (l.street) {
          const streetName = l.street.replace(/\d+$/, "").trim();
          if (streetName) extracted.add(streetName);
        }
      });
      if (extracted.size > 0) {
        return Array.from(extracted);
      }
    }
    
    return CITY_NEIGHBORHOODS["berlin"];
  };

  const toggleNeighborhood = (n: string) => {
    setSelectedNeighborhoods(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  };

  const toggleBedroom = (b: string) => {
    setSelectedBedrooms(prev =>
      prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
    );
  };

  const distanceOptions = [
    { value: "any", label: t("anyDistance") },
    { value: "1", label: "< 1 km" },
    { value: "5", label: "< 5 km" },
    { value: "10", label: "< 10 km" },
    { value: "20", label: "< 20 km" },
    { value: "50", label: "< 50 km" },
  ];

  const sortOptions = [
    { value: "newest", label: t("newestFirst") },
    { value: "price_asc", label: t("priceLowHigh") },
    { value: "price_desc", label: t("priceHighLow") },
    { value: "size_desc", label: t("sizeLargest") },
    { value: "rooms_asc", label: t("roomsFewest") },
    { value: "relevance", label: t("bestMatch") },
  ];

  const totalBadge =
    activeFilters.length +
    (priceRange ? 1 : 0) +
    (propertyType !== "all" ? 1 : 0) +
    (distance !== "any" ? 1 : 0) +
    (moveInDate ? 1 : 0) +
    (moveOutDate ? 1 : 0) +
    (furnitureFurnished ? 1 : 0) +
    (furnitureUnfurnished ? 1 : 0) +
    (roommatesGender !== "regardless" ? 1 : 0) +
    (landlordRating !== "any" ? 1 : 0) +
    (wgSize !== "regardless" ? 1 : 0) +
    selectedNeighborhoods.length +
    (billsIncluded ? 1 : 0) +
    (noDeposit ? 1 : 0) +
    selectedBedrooms.length +
    (minSize ? 1 : 0) +
    (maxSize ? 1 : 0) +
    (roomCount > 1 ? 1 : 0) +
    (singleBeds > 0 ? 1 : 0) +
    (doubleBeds > 0 ? 1 : 0) +
    rentCalculation.length +
    (smokingAllowed !== "any" ? 1 : 0) +
    (registrationPossible !== "any" ? 1 : 0) +
    (suitableForCouples ? 1 : 0);

  const clearAll = () => {
    setActiveFilters([]);
    setPriceRange("");
    setPropertyType("all");
    setDistance("any");
    setMoveInDate("");
    setMoveOutDate("");
    setFurnitureFurnished(false);
    setFurnitureUnfurnished(false);
    setRoommatesGender("regardless");
    setLandlordRating("any");
    setWgSize("regardless");
    setSelectedNeighborhoods([]);
    setBillsIncluded(false);
    setNoDeposit(false);
    setSelectedBedrooms([]);
    setNeighborhoodSearch("");
    setMinSize("");
    setMaxSize("");
    setRoomCount(1);
    setSingleBeds(0);
    setDoubleBeds(0);
    setRentCalculation([]);
    setSmokingAllowed("any");
    setRegistrationPossible("any");
    setSuitableForCouples(false);
  };

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
          landlord_rating: 4.5,
          is_new_landlord: false,
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
          landlord_rating: 3.8,
          is_new_landlord: false,
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
          landlord_rating: 4.8,
          is_new_landlord: false,
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
          roommate_gender: "masculine",
          wg_size: 3,
          landlord_rating: 4.2,
          is_new_landlord: false,
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "munich-wg-female",
          title: language === "de" ? "Zimmer in netter Mädels-WG am Harras" : "Room in nice female shared apartment at Harras",
          city: "München", street: "Albert-Roßhaupter-Str. 10", zip: "81369",
          rooms: 1, size_sqm: 18, rent_cold: 520, rent_utilities: 50, rent_heating: 35,
          pets_allowed: false, furnished: true,
          amenities: ["kitchen", "laundry"],
          status: "active",
          roommate_gender: "female",
          wg_size: 4,
          landlord_rating: 4.0,
          is_new_landlord: false,
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
        {
          id: "hamburg-wg-large",
          title: language === "de" ? "Zimmer in riesiger Altbau-WG (12 Personen)" : "Room in huge historic shared apartment (12 people)",
          city: "Hamburg", street: "Grindelallee 88", zip: "20146",
          rooms: 1, size_sqm: 25, rent_cold: 600, rent_utilities: 70, rent_heating: 50,
          pets_allowed: true, furnished: false,
          amenities: ["kitchen", "balcony"],
          status: "active",
          roommate_gender: "regardless",
          wg_size: 12,
          landlord_rating: null,
          is_new_landlord: true,
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
          landlord_rating: null,
          is_new_landlord: true,
          property_photos: [{ cdn_url: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80", is_primary: true }]
        },
      ];

      const applyFiltersAndSort = (items: any[]) => {
        let f = [...items];
        if (searchParams.get("wishlist") === "true") {
          f = f.filter(l => favorites.includes(l.id));
        }
        if (stadtParam) {
          const targetCities = getSearchCities(stadtParam);
          f = f.filter(l => targetCities.some(tc => l.city.toLowerCase().includes(tc.toLowerCase())));
        }
        if (propertyType !== "all") {
          if (propertyType === "house") f = f.filter(l => l.property_type === "house" || l.id.includes("house") || l.id.includes("haus"));
          else if (propertyType === "shared") f = f.filter(l => l.property_type === "sharedRoom" || l.id.includes("wg") || l.id.includes("shared"));
          else f = f.filter(l => l.rooms >= parseFloat(propertyType));
        }
        if (priceRange) f = f.filter(l => l.rent_cold <= parseFloat(priceRange));
        
        // Neighborhoods filter
        if (selectedNeighborhoods.length > 0) {
          f = f.filter(l =>
            selectedNeighborhoods.some(n =>
              (l.street && l.street.toLowerCase().includes(n.toLowerCase())) ||
              (l.title && l.title.toLowerCase().includes(n.toLowerCase())) ||
              (l.description && l.description.toLowerCase().includes(n.toLowerCase()))
            )
          );
        }
        // Bedrooms filter
        if (selectedBedrooms.length > 0) {
          f = f.filter(l => selectedBedrooms.includes(String(Math.floor(l.rooms))));
        }
        // Bills Included filter
        if (billsIncluded) {
          f = f.filter(l => l.rent_utilities === 0 && l.rent_heating === 0);
        }
        // No Deposit filter
        if (noDeposit) {
          f = f.filter(l => l.deposit_months === 0);
        }
        if (moveInDate) {
          f = f.filter(l => !l.available_from || new Date(l.available_from) <= new Date(moveInDate));
        }
        // Furniture
        if (furnitureFurnished && !furnitureUnfurnished) {
          f = f.filter(l => l.furnished === true);
        } else if (furnitureUnfurnished && !furnitureFurnished) {
          f = f.filter(l => l.furnished === false);
        }
        // Roommates Gender
        if (roommatesGender !== "regardless") {
          f = f.filter(l => l.roommate_gender === roommatesGender);
        }
        // Landlord Rating
        if (landlordRating === "4_plus") {
          f = f.filter(l => l.landlord_rating >= 4);
        } else if (landlordRating === "3_plus") {
          f = f.filter(l => l.landlord_rating >= 3);
        } else if (landlordRating === "new") {
          f = f.filter(l => l.is_new_landlord === true || l.landlord_rating === undefined || l.landlord_rating === null);
        }
        // WG Size
        if (wgSize !== "regardless") {
          if (wgSize === "gt10") {
            f = f.filter(l => l.wg_size > 10);
          } else {
            f = f.filter(l => l.wg_size === parseInt(wgSize));
          }
        }

        if (activeFilters.includes("balcony")) f = f.filter(l => l.amenities?.includes("balcony"));
        if (activeFilters.includes("kitchen")) f = f.filter(l => l.amenities?.includes("kitchen"));
        if (activeFilters.includes("laundry")) f = f.filter(l => l.amenities?.includes("laundry"));
        if (activeFilters.includes("parking")) f = f.filter(l => l.amenities?.includes("parking"));
        if (activeFilters.includes("pets")) f = f.filter(l => l.pets_allowed === true);
        if (activeFilters.includes("wheelchair")) f = f.filter(l => l.amenities?.includes("wheelchair"));
        if (activeFilters.includes("elevator")) f = f.filter(l => l.amenities?.includes("elevator"));
        if (activeFilters.includes("garden")) f = f.filter(l => l.amenities?.includes("garden"));
        if (activeFilters.includes("cellar")) f = f.filter(l => l.amenities?.includes("cellar"));
        if (activeFilters.includes("air_conditioning")) f = f.filter(l => l.amenities?.includes("air_conditioning"));
        if (activeFilters.includes("wifi")) f = f.filter(l => l.amenities?.includes("wifi"));
        if (activeFilters.includes("dishwasher")) f = f.filter(l => l.amenities?.includes("dishwasher"));
        if (activeFilters.includes("washing_machine")) f = f.filter(l => l.amenities?.includes("washing_machine"));
        if (activeFilters.includes("tv")) f = f.filter(l => l.amenities?.includes("tv"));
        // Size filter
        if (minSize) f = f.filter(l => (l.size_sqm || 0) >= parseFloat(minSize));
        if (maxSize) f = f.filter(l => (l.size_sqm || 0) <= parseFloat(maxSize));
        // Room count filter
        if (roomCount > 1) f = f.filter(l => (l.rooms || 0) >= roomCount);
        // Single/Double beds
        if (singleBeds > 0) f = f.filter(l => (l.single_beds || 0) >= singleBeds);
        if (doubleBeds > 0) f = f.filter(l => (l.double_beds || 0) >= doubleBeds);
        // Rent calculation
        if (rentCalculation.length > 0) f = f.filter(l => !l.rent_calculation || rentCalculation.includes(l.rent_calculation));
        // Smoking
        if (smokingAllowed === "allowed") f = f.filter(l => l.smoking_allowed === true);
        if (smokingAllowed === "not_allowed") f = f.filter(l => l.smoking_allowed === false);
        // Registration
        if (registrationPossible === "possible") f = f.filter(l => l.registration_possible === true);
        if (registrationPossible === "not_possible") f = f.filter(l => l.registration_possible === false);
        // Couples
        if (suitableForCouples) f = f.filter(l => l.suitable_for_couples === true || (l.suitable_for && l.suitable_for.includes("couples")));

        // Sorting
        if (sort === "price_asc") f.sort((a, b) => a.rent_cold - b.rent_cold);
        else if (sort === "price_desc") f.sort((a, b) => b.rent_cold - a.rent_cold);
        else if (sort === "size_desc") f.sort((a, b) => b.size_sqm - a.size_sqm);
        else if (sort === "rooms_asc") f.sort((a, b) => a.rooms - b.rooms);

        return f;
      };

      const applyInMemoryFilters = () => {
        setListings(applyFiltersAndSort(mockListings));
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
        if (activeFilters.includes("balcony")) query = query.contains("amenities", ["balcony"]);
        if (activeFilters.includes("kitchen")) query = query.contains("amenities", ["kitchen"]);
        if (activeFilters.includes("laundry")) query = query.contains("amenities", ["laundry"]);
        if (activeFilters.includes("parking")) query = query.contains("amenities", ["parking"]);
        if (activeFilters.includes("pets")) query = query.eq("pets_allowed", true);
        if (activeFilters.includes("wheelchair")) query = query.eq("wheelchair_accessible", true);

        // Database-level furniture filter
        if (furnitureFurnished && !furnitureUnfurnished) {
          query = query.eq("furnished", true);
        } else if (furnitureUnfurnished && !furnitureFurnished) {
          query = query.eq("furnished", false);
        }

        if (sort === "newest") query = query.order("created_at", { ascending: false });
        else if (sort === "price_asc") query = query.order("rent_cold", { ascending: true });
        else if (sort === "price_desc") query = query.order("rent_cold", { ascending: false });
        else if (sort === "size_desc") query = query.order("size_sqm", { ascending: false });
        else if (sort === "rooms_asc") query = query.order("rooms", { ascending: true });

        const { data, error } = await promiseTimeout(query, 3000) as any;
        if (error) throw error;
        if (data && data.length > 0) setListings(applyFiltersAndSort(data));
        else { console.log("No active DB properties, using mock data."); applyInMemoryFilters(); }
      } catch (err) {
        console.warn("Supabase failed, using mock data:", err);
        applyInMemoryFilters();
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [
    stadtParam,
    propertyType,
    priceRange,
    activeFilters,
    sort,
    language,
    hasSearched,
    moveInDate,
    moveOutDate,
    furnitureFurnished,
    furnitureUnfurnished,
    roommatesGender,
    landlordRating,
    wgSize,
    favorites,
    searchParams,
  ]);

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
    ? `< ${formatPrice(parseFloat(priceRange))}`
    : t("price");
  const currentTypeLabel = typeOptions.find(t => t.value === propertyType)?.label || t("type");
  const currentDistLabel = distanceOptions.find(d => d.value === distance)?.label || t("distance");
  const currentSortLabel = sortOptions.find(s => s.value === sort)?.label || t("sort");

  return (
    <div className="flex flex-col w-full h-[calc(100vh-65px)]">

      {/* ── Filter Toolbar ─────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-outline-variant px-4 md:px-8 py-3 z-40 sticky top-[65px] shadow-sm">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-2">

          {/* Row 1: City search & search button */}
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 min-w-0 relative" ref={suggestionsRef}>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                location_on
              </span>
              <input
                type="text"
                id="suche-city-search"
                value={searchInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => {
                  if (searchInput.trim() !== "") {
                    handleInputChange(searchInput);
                  } else {
                    const all = ALL_SUGGESTIONS.map((c) => (language === "de" ? c.de : c.en));
                    setFilteredCities(all);
                    setShowSuggestions(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySearch();
                    setShowSuggestions(false);
                  }
                }}
                placeholder={t("cityInputPlaceholder")}
                className="w-full pl-9 pr-9 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-label-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-[42px] font-semibold text-on-surface"
                autoComplete="off"
              />
              
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setFilteredCities(ALL_SUGGESTIONS.map((c) => (language === "de" ? c.de : c.en)));
                    
                    const params = new URLSearchParams();
                    if (propertyType && propertyType !== "all") params.set("zimmer", propertyType);
                    if (priceRange) params.set("preis", priceRange);
                    if (moveInDate) params.set("moveIn", moveInDate);
                    if (moveOutDate) params.set("moveOut", moveOutDate);

                    const furList: string[] = [];
                    if (furnitureFurnished) furList.push("furnished");
                    if (furnitureUnfurnished) furList.push("unfurnished");
                    if (furList.length > 0) params.set("furniture", furList.join(","));

                    if (roommatesGender && roommatesGender !== "regardless") params.set("roommates", roommatesGender);
                    if (landlordRating && landlordRating !== "any") params.set("rating", landlordRating);
                    if (wgSize && wgSize !== "regardless") params.set("wgSize", wgSize);

                    const wishlistParam = searchParams.get("wishlist");
                    if (wishlistParam) params.set("wishlist", wishlistParam);

                    router.push(`/suche?${params.toString()}`);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer flex items-center justify-center p-1 rounded-full hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}

              {showSuggestions && filteredCities.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-outline-variant rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                  <ul className="py-1.5">
                    {filteredCities.map((city) => (
                      <li key={city}>
                        <button
                          type="button"
                          onClick={() => handleSelectSuggestion(city)}
                          className="w-full text-left px-4 py-2.5 hover:bg-primary/5 text-primary text-[14px] font-bold transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] text-[#f07d00]">location_on</span>
                          <span>{city}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Search button */}
            <button
              id="btn-suche-search"
              onClick={applySearch}
              disabled={searchInput.trim() === ""}
              className={`flex items-center gap-1.5 px-4 rounded-xl text-label-sm font-bold transition-all h-[42px] shadow-sm flex-shrink-0 ${
                searchInput.trim() === ""
                  ? "bg-outline-variant text-on-surface-variant cursor-not-allowed opacity-50"
                  : "bg-primary text-on-primary hover:opacity-90 active:scale-95 cursor-pointer"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">search</span>
              <span className="hidden sm:block">{t("search")}</span>
            </button>
          </div>

          {/* Row 2: Filters + Sort — flex-wrap to ensure absolute dropdowns are visible on mobile */}
          <div className="relative flex flex-wrap items-center gap-2 pb-0.5 -mx-1 px-1 overflow-visible">

            {/* ── Unified Filters dropdown ─────────── */}
            <Dropdown
              id="dd-filters"
              label={t("allFilters")}
              icon="tune"
              badge={totalBadge || undefined}
            >
              {/* ── Size ── */}
              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("area")}
                </p>
              </div>
              <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-on-surface-variant/70">{t("minimum")}</span>
                  <div className="relative">
                    <select
                      value={minSize}
                      onChange={(e) => setMinSize(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-label-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                    >
                      {["", "10", "20", "30", "40", "50", "60", "70", "80", "100", "120", "150", "200"].map(v => (
                        <option key={v} value={v}>{v ? `${v}m²` : "0m²"}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[16px]">unfold_more</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-on-surface-variant/70">{t("maximum")}</span>
                  <div className="relative">
                    <select
                      value={maxSize}
                      onChange={(e) => setMaxSize(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-label-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                    >
                      {["", "20", "30", "40", "50", "60", "70", "80", "100", "120", "150", "200", "300"].map(v => (
                        <option key={v} value={v}>{v ? `${v}m²` : (t("noMaximum"))}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[16px]">unfold_more</span>
                  </div>
                </div>
              </div>

              {/* ── Rooms & Beds ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("roomsAndBeds")}
                </p>
              </div>
              <div className="px-4 pb-3 space-y-3">
                {/* Rooms counter */}
                <div className="flex items-center justify-between">
                  <span className="text-label-sm text-on-surface font-semibold">{t("rooms")}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRoomCount(c => Math.max(1, c - 1))}
                      className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer text-on-surface font-bold disabled:opacity-40"
                      disabled={roomCount <= 1}
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-6 text-center text-label-sm font-bold text-on-surface">{roomCount}</span>
                    <button
                      onClick={() => setRoomCount(c => c + 1)}
                      className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer text-on-surface font-bold"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
                {/* Single Beds counter */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">bed</span>
                    <span className="text-label-sm text-on-surface font-semibold">{t("singleBeds")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSingleBeds(c => Math.max(0, c - 1))}
                      className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer text-on-surface font-bold disabled:opacity-40"
                      disabled={singleBeds <= 0}
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-6 text-center text-label-sm font-bold text-on-surface">{singleBeds}</span>
                    <button
                      onClick={() => setSingleBeds(c => c + 1)}
                      className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer text-on-surface font-bold"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
                {/* Double Beds counter */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">king_bed</span>
                    <span className="text-label-sm text-on-surface font-semibold">{t("doubleBeds")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDoubleBeds(c => Math.max(0, c - 1))}
                      className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer text-on-surface font-bold disabled:opacity-40"
                      disabled={doubleBeds <= 0}
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-6 text-center text-label-sm font-bold text-on-surface">{doubleBeds}</span>
                    <button
                      onClick={() => setDoubleBeds(c => c + 1)}
                      className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer text-on-surface font-bold"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Amenities ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("amenitiesAndFeatures")}
                </p>
              </div>
              <div className="pb-1 grid grid-cols-2">
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

              {/* ── Furniture ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("furniture")}
                </p>
              </div>
              <div className="pb-2 flex flex-col">
                <label className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={furnitureFurnished}
                    onChange={() => setFurnitureFurnished(!furnitureFurnished)}
                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-label-sm text-on-surface font-medium">
                    {t("furnished")}
                  </span>
                </label>
                <label className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={furnitureUnfurnished}
                    onChange={() => setFurnitureUnfurnished(!furnitureUnfurnished)}
                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-label-sm text-on-surface font-medium">
                    {t("unfurnished")}
                  </span>
                </label>
              </div>

              {/* ── Price Range Slider ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-2">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    {t("maxRentWarm")}
                  </p>
                  <span className="text-label-sm font-bold text-primary">
                    {priceRange ? formatPrice(parseFloat(priceRange)) : (t("anyPrice"))}
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
                    <span>{formatPrice(200)}</span>
                    <span>{formatPrice(1500)}</span>
                    <span>{formatPrice(3000)}</span>
                    <span>{formatPrice(5000)}+</span>
                  </div>
                </div>
              </div>

              {/* ── Rental Period (Dates) ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("rentalPeriod")}
                </p>
              </div>
              <div className="px-4 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-on-surface-variant/70">{t("moveIn")}</span>
                    <input
                      type="date"
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-[13px] font-semibold text-on-surface focus:outline-none"
                      style={{ colorScheme: "light" }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-on-surface-variant/70">{t("moveOut")}</span>
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
                  {t("propertyType")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 px-3 pb-2">
                {typeOptions.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setPropertyType(value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-label-sm text-left transition-all border cursor-pointer ${
                      propertyType === value
                        ? "bg-primary text-on-primary border-primary font-bold"
                        : "border-outline-variant text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${propertyType === value ? "text-on-primary" : "text-on-surface-variant"}`}>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Bedroom sub-options (shown when Apartment is selected) */}
              {propertyType === "apartment" && (
                <div className="px-4 pb-3 pt-1">
                  <p className="text-[10px] font-bold text-on-surface-variant/70 mb-1.5">
                    {t("numberOfBedrooms")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {bedroomOptions.map(({ value, label }) => {
                      const isActive = selectedBedrooms.includes(value);
                      return (
                        <button
                          key={value}
                          onClick={() => toggleBedroom(value)}
                          className={`px-3 py-2 rounded-lg text-[12px] font-semibold transition-all border cursor-pointer ${
                            isActive
                              ? "bg-primary/10 text-primary border-primary"
                              : "border-outline-variant text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Shared apartment size ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("sharedApartmentSize")}
                </p>
              </div>
              <div className="px-4 pb-3 pt-1">
                <div className="relative">
                  <select
                    value={wgSize}
                    onChange={(e) => setWgSize(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-label-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                  >
                    {[
                      { value: "regardless", label: t("regardless") },
                      { value: "2", label: `2 ${t("personSharedApartment")}` },
                      { value: "3", label: `3 ${t("personSharedApartment")}` },
                      { value: "4", label: `4 ${t("personSharedApartment")}` },
                      { value: "5", label: `5 ${t("personSharedApartment")}` },
                      { value: "6", label: `6 ${t("personSharedApartment")}` },
                      { value: "7", label: `7 ${t("personSharedApartment")}` },
                      { value: "8", label: `8 ${t("personSharedApartment")}` },
                      { value: "9", label: `9 ${t("personSharedApartment")}` },
                      { value: "10", label: `10 ${t("personSharedApartment")}` },
                      { value: "gt10", label: t("moreThan10PersonSharedApartment") }
                    ].map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
                    unfold_more
                  </span>
                </div>
              </div>

              {/* ── Suitable For / Looking for roommates ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("suitableFor")}
                </p>
              </div>
              <div className="pb-1 flex flex-col gap-0.5">
                {[
                  { value: "regardless", label: t("regardless") },
                  { value: "masculine", label: t("male") },
                  { value: "female", label: t("female") }
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container cursor-pointer transition-colors select-none">
                    <input
                      type="radio"
                      name="roommatesGender"
                      value={opt.value}
                      checked={roommatesGender === opt.value}
                      onChange={() => setRoommatesGender(opt.value)}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="text-label-sm text-on-surface font-medium">{opt.label}</span>
                  </label>
                ))}
                {/* Couples option — consistent radio-style row */}
                <label className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container cursor-pointer transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={suitableForCouples}
                    onChange={() => setSuitableForCouples(!suitableForCouples)}
                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-label-sm text-on-surface font-medium">
                    {t("couples")}
                  </span>
                </label>
              </div>

              {/* ── Landlord rating ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("landlordRating")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 px-4 pb-3 pt-1">
                {[
                  { value: "any", label: t("anyRating"), icon: "*" },
                  { value: "4_plus", label: `4 ${t("orHigher")}`, icon: "★" },
                  { value: "3_plus", label: `3 ${t("orHigher")}`, icon: "☆" },
                  { value: "new", label: t("newLandlords"), icon: "👋" }
                ].map((opt) => {
                  const isActive = landlordRating === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setLandlordRating(opt.value)}
                      className={`flex items-center justify-start gap-2 px-3 py-2.5 rounded-xl border font-semibold text-label-sm transition-all cursor-pointer ${
                        isActive
                          ? "bg-surface-container-high border-primary text-primary"
                          : "bg-white border-outline-variant text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <span className={`text-[15px] ${opt.icon === "★" || opt.icon === "☆" ? "text-[#735c00]" : ""}`}>
                        {opt.icon}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── Bills & Deposit ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("billsAndDeposit")}
                </p>
              </div>
              <div className="pb-2 flex flex-col">
                <label className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={billsIncluded}
                    onChange={() => setBillsIncluded(!billsIncluded)}
                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">receipt_long</span>
                    <span className="text-label-sm text-on-surface font-medium">
                      {t("billsIncluded")}
                    </span>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={noDeposit}
                    onChange={() => setNoDeposit(!noDeposit)}
                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">money_off</span>
                    <span className="text-label-sm text-on-surface font-medium">
                      {t("noDeposit")}
                    </span>
                  </div>
                </label>
              </div>

              {/* ── Neighborhoods ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("neighborhoods")}
                </p>
                {selectedNeighborhoods.length > 0 && (
                  <button
                    onClick={() => setSelectedNeighborhoods([])}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    {t("clearAll")}
                  </button>
                )}
              </div>
              <div className="px-4 pb-2">
                <div className="relative mb-2">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">search</span>
                  <input
                    type="text"
                    value={neighborhoodSearch}
                    onChange={(e) => setNeighborhoodSearch(e.target.value)}
                    placeholder={t("searchNeighborhood")}
                    className="w-full pl-8 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-[12px] font-semibold text-on-surface focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="max-h-[180px] overflow-y-auto custom-scrollbar space-y-0.5">
                  {getNeighborhoodList()
                    .filter(n => neighborhoodSearch.trim() === "" || n.toLowerCase().includes(neighborhoodSearch.toLowerCase()))
                    .map((n) => {
                      const checked = selectedNeighborhoods.includes(n);
                      return (
                        <label
                          key={n}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors select-none ${
                            checked ? "bg-primary/5" : "hover:bg-surface-container-low"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleNeighborhood(n)}
                            className="accent-primary w-3.5 h-3.5 rounded cursor-pointer flex-shrink-0"
                          />
                          <span className={`text-[12px] font-medium truncate ${
                            checked ? "text-primary font-bold" : "text-on-surface"
                          }`}>
                            {n}
                          </span>
                        </label>
                      );
                    })}
                  {getNeighborhoodList().filter(n => neighborhoodSearch.trim() === "" || n.toLowerCase().includes(neighborhoodSearch.toLowerCase())).length === 0 && (
                    <p className="text-[11px] text-on-surface-variant/60 text-center py-3 italic">
                      {t("noNeighborhoodFound")}
                    </p>
                  )}
                </div>
                {selectedNeighborhoods.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-outline-variant/40">
                    {selectedNeighborhoods.map((n) => (
                      <span
                        key={n}
                        className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold border border-primary/20"
                      >
                        {n}
                        <button onClick={() => toggleNeighborhood(n)} className="cursor-pointer hover:opacity-70">
                          <span className="material-symbols-outlined text-[11px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Distance ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("distanceFromCentre")}
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

              {/* ── How Rent is Calculated ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("howRentIsCalculated")}
                </p>
                <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                  {t("rentCalcDescription")}
                </p>
              </div>
              <div className="px-4 pb-3 pt-2 grid grid-cols-2 gap-y-2.5 gap-x-4">
                {[
                  { value: "monthly", label: t("monthly") },
                  { value: "daily", label: t("daily") },
                  { value: "biweekly", label: t("every2Weeks") },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rentCalculation.includes(opt.value)}
                      onChange={() => setRentCalculation(prev =>
                        prev.includes(opt.value) ? prev.filter(x => x !== opt.value) : [...prev, opt.value]
                      )}
                      className="accent-primary w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-label-sm text-on-surface font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* ── Smoking ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("smoking")}
                </p>
              </div>
              <div className="pb-2 flex flex-col">
                {[
                  { value: "any", label: t("regardless") },
                  { value: "allowed", label: t("smokingAllowed") },
                  { value: "not_allowed", label: t("smokingNotAllowed") },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container cursor-pointer transition-colors select-none">
                    <input
                      type="radio"
                      name="smokingAllowed"
                      value={opt.value}
                      checked={smokingAllowed === opt.value}
                      onChange={() => setSmokingAllowed(opt.value)}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="text-label-sm text-on-surface font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* ── Registration ── */}
              <div className="border-t border-outline-variant mx-4" />
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("registration")}
                </p>
                <p className="text-[11px] text-on-surface-variant/70 mt-0.5 leading-relaxed">
                  {t("registrationDescription")}
                </p>
              </div>
              <div className="pb-2 flex flex-col pt-1">
                {[
                  { value: "any", label: t("regardless") },
                  { value: "possible", label: t("registrationPossible") },
                  { value: "not_possible", label: t("registrationNotPossible") },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-container cursor-pointer transition-colors select-none">
                    <input
                      type="radio"
                      name="registrationPossible"
                      value={opt.value}
                      checked={registrationPossible === opt.value}
                      onChange={() => setRegistrationPossible(opt.value)}
                      className="accent-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="text-label-sm text-on-surface font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* ── Footer: reset ── */}
              <div className="border-t border-outline-variant px-6 py-4 flex justify-between items-center bg-surface-container-lowest">
                <button
                  onClick={clearAll}
                  className="text-label-sm font-bold text-on-surface hover:text-primary underline cursor-pointer"
                >
                  {t("clearAll")}
                </button>
                <span className="text-[12px] text-on-surface-variant font-medium">
                  {totalBadge} {t("active")}
                </span>
              </div>
            </Dropdown>

            {/* Divider */}
            <div className="h-7 w-px bg-outline-variant flex-shrink-0" />

            {/* ── Sort By dropdown ── */}
            <Dropdown
              id="dd-sort"
              label={t("sort")}
              icon="swap_vert"
              align="right"
            >
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t("sortBy")}
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

            {/* ── Saved Searches dropdown ── */}
            <Dropdown
              id="dd-saved-filters"
              label={t("savedSearches")}
              icon="bookmarks"
              align="right"
            >
              <div className="p-4 w-[280px] sm:w-[320px] space-y-4">
                {/* Save current search form */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                    {t("saveCurrentSearch")}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t("searchName")}
                      value={newFilterName}
                      onChange={(e) => setNewFilterName(e.target.value)}
                      className="flex-1 h-9 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-label-sm focus:outline-none focus:border-primary text-[13px] text-on-surface"
                    />
                    <button
                      onClick={handleSaveFilter}
                      disabled={!newFilterName.trim() && !!user}
                      className="h-9 px-3 bg-primary text-on-primary rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isSavingFilter ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">save</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* List of saved searches */}
                <div className="space-y-2 pt-2 border-t border-outline-variant/60">
                  <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
                    {t("savedTemplates")}
                  </p>
                  {savedFiltersLoading ? (
                    <div className="flex justify-center py-4">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : savedFilters.length === 0 ? (
                    <p className="text-[12px] text-on-surface-variant/70 italic text-center py-2">
                      {t("noSavedSearches")}
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {savedFilters.map((filter) => (
                        <div
                          key={filter.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors group"
                        >
                          <button
                            onClick={() => handleApplySavedFilter(filter)}
                            className="flex-1 text-left text-label-sm font-bold text-primary hover:underline truncate mr-2"
                            title={filter.name}
                          >
                            {filter.name}
                          </button>
                          <button
                            onClick={() => handleDeleteFilter(filter.id)}
                            className="text-on-surface-variant hover:text-error cursor-pointer flex items-center justify-center p-1 rounded-md hover:bg-surface-container"
                            title={t("delete")}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Dropdown>

            {/* Active filter quick-clear badge */}
            {totalBadge > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-bold text-error border border-error/30 bg-error/5 hover:bg-error/10 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[14px]">filter_list_off</span>
                {t("clearFilters")}
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
            <PropertyMap listings={listings} stadtParam={stadtParam} />
          </div>
        </aside>

        {/* Listings */}
        <section className="w-full md:w-[60%] overflow-y-auto custom-scrollbar bg-background px-4 sm:px-6 md:px-[48px] py-5 md:py-8">
          <div className="flex justify-between items-center mb-5 md:mb-8 flex-wrap gap-3">
            <div className="min-w-0">
              <h1 className="text-[20px] md:text-headline-lg text-primary font-bold leading-snug truncate">
                {searchParams.get("wishlist") === "true"
                  ? t("myWishlist")
                  : hasSearched
                    ? (stadtParam
                      ? `${t("apartmentsIn")} ${stadtParam}`
                      : t("filteredApartments"))
                    : t("allAvailableAccommodations")}
              </h1>
              <p className="text-[13px] md:text-body-md text-on-surface-variant mt-0.5">
                {searchParams.get("wishlist") === "true"
                  ? `${listings.length} ${t("savedProperties")}`
                  : hasSearched
                    ? <>{listings.length} {t("resultsFound")}{sort !== "newest" && <span className="ml-2 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{currentSortLabel}</span>}</>
                    : t("exploreApartments")}
              </p>
            </div>
          </div>

          {/* Active filter pills — horizontally scrollable on mobile */}
          {totalBadge > 0 && (
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
              {activeFilters.map((f) => {
                const af = amenityFilters.find(a => a.id === f);
                return af ? (
                  <span key={f} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[13px]">{af.icon}</span>
                    {af.label}
                    <button onClick={() => toggleFilter(f)} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                  </span>
                ) : null;
              })}
              {furnitureFurnished && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">weekend</span>
                  {t("furnished")}
                  <button onClick={() => setFurnitureFurnished(false)} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {furnitureUnfurnished && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">check_box_outline_blank</span>
                  {t("unfurnished")}
                  <button onClick={() => setFurnitureUnfurnished(false)} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {priceRange && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">euro</span>
                  {currentPriceLabel}
                  <button onClick={() => setPriceRange("")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {propertyType !== "all" && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">apartment</span>
                  {currentTypeLabel}
                  <button onClick={() => setPropertyType("all")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {wgSize !== "regardless" && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">group</span>
                  {wgSize === "gt10" ? ">10s shared apartment" : `${wgSize}-person shared apartment`}
                  <button onClick={() => setWgSize("regardless")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {roommatesGender !== "regardless" && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">diversity_3</span>
                  {`${t("roommates")}: ${roommatesGender === "masculine" ? t("male") : roommatesGender === "female" ? t("female") : roommatesGender}`}
                  <button onClick={() => setRoommatesGender("regardless")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {landlordRating !== "any" && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">star</span>
                  {landlordRating === "4_plus" ? `${t("rating")}: 4+` : landlordRating === "3_plus" ? `${t("rating")}: 3+` : t("newLandlords")}
                  <button onClick={() => setLandlordRating("any")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {distance !== "any" && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">near_me</span>
                  {currentDistLabel}
                  <button onClick={() => setDistance("any")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {moveInDate && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                  {`${t("moveIn")}: ${moveInDate}`}
                  <button onClick={() => setMoveInDate("")} className="ml-1 cursor-pointer hover:opacity-70"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {moveOutDate && (
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[12px] font-bold border border-primary/20 flex-shrink-0 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                  {`${t("moveOut")}: ${moveOutDate}`}
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
            /* ── All available places grouped by city horizontal scroll ── */
            topPlacesLoading ? (
              <div className="flex justify-center items-center py-24 w-full">
                <div className="w-10 h-10 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-12">
                {Object.entries(
                  topPlaces.reduce<Record<string, any[]>>((acc, property) => {
                    const normalizedCity = (() => {
                      const city = property.city || "";
                      const normalized = city.trim().toLowerCase();
                      const cityGroups: Record<string, { de: string; en: string }> = {
                        "münchen": { de: "München", en: "Munich" },
                        "munich": { de: "München", en: "Munich" },
                        "köln": { de: "Köln", en: "Cologne" },
                        "cologne": { de: "Köln", en: "Cologne" },
                        "nürnberg": { de: "Nürnberg", en: "Nuremberg" },
                        "nuremberg": { de: "Nürnberg", en: "Nuremberg" },
                        "hannover": { de: "Hannover", en: "Hanover" },
                        "hanover": { de: "Hannover", en: "Hanover" },
                        "düsseldorf": { de: "Düsseldorf", en: "Düsseldorf" },
                        "dusseldorf": { de: "Düsseldorf", en: "Düsseldorf" },
                        "braunschweig": { de: "Braunschweig", en: "Brunswick" },
                        "brunswick": { de: "Braunschweig", en: "Brunswick" },
                        "konstanz": { de: "Konstanz", en: "Constance" },
                        "constance": { de: "Konstanz", en: "Constance" },
                      };
                      if (cityGroups[normalized]) {
                        return language === "de" ? cityGroups[normalized].de : cityGroups[normalized].en;
                      }
                      return city.charAt(0).toUpperCase() + city.slice(1);
                    })();

                    if (!acc[normalizedCity]) acc[normalizedCity] = [];
                    acc[normalizedCity].push(property);
                    return acc;
                  }, {})
                ).map(([city, properties]) => {
                  const cityKey = city.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <div key={city} className="w-full">
                      {/* Place/City Heading */}
                      <div className="mb-4">
                        <h3 className="text-[18px] md:text-[22px] text-primary font-black flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[#f07d00]">location_on</span>
                          {city}
                        </h3>
                        <p className="text-[12px] text-on-surface-variant font-semibold">
                          {`${t("availableAccommodationsIn")} ${city}`}
                        </p>
                      </div>

                      {/* Row Scroll with Arrows */}
                      <div className="relative group/slider-city w-full">
                        {/* Left Arrow Button */}
                        <button
                          onClick={() => {
                            const el = document.getElementById(`scroll-row-${cityKey}`);
                            if (el) el.scrollBy({ left: -320, behavior: "smooth" });
                          }}
                          aria-label="Scroll left"
                          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/95 backdrop-blur-md text-primary rounded-full shadow-lg border border-outline-variant hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none opacity-0 group-hover/slider-city:opacity-100 hidden md:flex"
                        >
                          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>

                        {/* Horizontal Scroll track */}
                        <div
                          id={`scroll-row-${cityKey}`}
                          className="flex overflow-x-auto gap-5 py-4 px-1 no-scrollbar w-full scroll-smooth"
                        >
                          {properties.map((l) => (
                            <div
                              key={l.id}
                              className="w-[285px] md:w-[320px] flex-shrink-0"
                            >
                              <article className="group bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 h-full flex flex-col justify-between">
                                <Link href={`/objekt/${l.id}`}>
                                  {/* Image */}
                                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container flex items-center justify-center">
                                    <img
                                      src={getPrimaryPhoto(l)}
                                      alt={l.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                    
                                    {/* Rating Badge */}
                                    {l.landlord_rating && (
                                      <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-outline-variant/30 flex items-center gap-1.5 font-bold text-primary text-[12px]">
                                        <span className="material-symbols-outlined text-[15px] text-[#f07d00] fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                        {l.landlord_rating.toFixed(1)}
                                      </span>
                                    )}

                                    {/* Wishlist Button */}
                                    <button
                                      id={`fav-top-${l.id}`}
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

                                  {/* Card Content */}
                                  <div className="p-4 flex flex-col justify-between flex-grow">
                                    <div>
                                      <h4 className="text-[15px] md:text-headline-md text-primary leading-tight font-bold mb-0.5 line-clamp-1 group-hover:text-[#f07d00] transition-colors">
                                        {l.title}
                                      </h4>
                                      {/* Subtitle / Place Name */}
                                      <p className="text-[12px] md:text-body-md text-on-surface-variant mb-3 line-clamp-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px] text-secondary">location_on</span>
                                        <span>{l.street}, {normalizeCityName(l.city, language)}</span>
                                      </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center divide-x divide-outline-variant/40 mt-auto pt-2">
                                      {[
                                        { label: t("rentWarm"), value: formatPrice(Math.round(parseFloat(l.rent_cold) + parseFloat(l.rent_utilities) + (l.rent_heating ? parseFloat(l.rent_heating) : 0))), bold: true },
                                        { label: t("area"), value: `${l.size_sqm} m²` },
                                        { label: t("rooms"), value: l.rooms },
                                      ].map(({ label, value, bold }, i) => (
                                        <div key={label} className={`flex flex-col ${i === 0 ? "pr-3" : "px-3"}`}>
                                          <span className="text-[9px] font-semibold text-on-surface-variant uppercase tracking-wide">{label}</span>
                                          <span className={`text-[13px] md:text-[15px] leading-5 ${bold ? "text-primary font-bold" : "text-on-surface font-semibold"}`}>{value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </Link>
                              </article>
                            </div>
                          ))}
                        </div>

                        {/* Right Arrow Button */}
                        <button
                          onClick={() => {
                            const el = document.getElementById(`scroll-row-${cityKey}`);
                            if (el) el.scrollBy({ left: 320, behavior: "smooth" });
                          }}
                          aria-label="Scroll right"
                          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/95 backdrop-blur-md text-primary rounded-full shadow-lg border border-outline-variant hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none opacity-0 group-hover/slider-city:opacity-100 hidden md:flex"
                        >
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : listings.length === 0 ? (
            <div className="text-center py-24 text-on-surface-variant text-body-md w-full border-2 border-dashed border-outline-variant/40 rounded-2xl bg-white">
              {t("noListingsFound")}
            </div>
          ) : (
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
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
                          {t("furnished")}
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
                        {l.street}, {l.zip} {normalizeCityName(l.city, language)}
                      </p>
                      {/* Stats row */}
                      <div className="flex items-center divide-x divide-outline-variant/40 mb-3">
                        {[
                          { label: t("rentWarm"), value: formatPrice(Math.round(parseFloat(l.rent_cold) + parseFloat(l.rent_utilities) + (l.rent_heating ? parseFloat(l.rent_heating) : 0))), bold: true },
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

