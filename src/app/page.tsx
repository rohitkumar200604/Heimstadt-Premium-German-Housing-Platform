"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/utils/supabase/client";

const CITIES = [
  {
    nameDe: "Berlin",
    nameEn: "Berlin",
    count: "2.450",
    img: "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8QmVybGlufGVufDB8fDB8fHww",
  },
  {
    nameDe: "München",
    nameEn: "Munich",
    count: "1.820",
    img: "https://images.unsplash.com/photo-1649609765902-254a227dc960?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8bXVuaWNofGVufDB8fDB8fHww",
  },
  {
    nameDe: "Hamburg",
    nameEn: "Hamburg",
    count: "1.560",
    img: "https://images.unsplash.com/photo-1580674631903-7817e4f8a722?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGhhbWJ1cmd8ZW58MHx8MHx8fDA%3D",
  },
  {
    nameDe: "Frankfurt",
    nameEn: "Frankfurt",
    count: "1.240",
    img: "https://plus.unsplash.com/premium_photo-1719843507763-9dcd405f9619?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZnJhbmtmdXJ0fGVufDB8fDB8fHww",
  },
  {
    nameDe: "Köln",
    nameEn: "Cologne",
    count: "1.100",
    img: "https://images.unsplash.com/photo-1600081925754-e32c08c14c19?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fEslQzMlQjZsbnxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    nameDe: "Düsseldorf",
    nameEn: "Düsseldorf",
    count: "950",
    img: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=600&q=80",
  },
  {
    nameDe: "Stuttgart",
    nameEn: "Stuttgart",
    count: "880",
    img: "https://images.unsplash.com/photo-1600081926892-4530ddcb3af7?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8RCVDMyVCQ3NzZWxkb3JmfGVufDB8fDB8fHww",
  },
  {
    nameDe: "Leipzig",
    nameEn: "Leipzig",
    count: "720",
    img: "https://images.unsplash.com/photo-1616001029681-ff04e6bfc6c9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8TGVpcHppZyUyMExlaXB6aWd8ZW58MHx8MHx8fDA%3D",
  },
];

const getTestimonials = (language: string, t: any) => [
  {
    quote: language === "de"
      ? "Der Suchprozess war unglaublich einfach. Innerhalb einer Woche hatte ich meine Traumwohnung in Berlin gefunden."
      : "The search process was incredibly easy. Within a week, I found my dream apartment in Berlin.",
    name: "Maximilian K.",
    role: `${t("testimonialRoleTenant")} Berlin`,
    initials: "MK",
  },
  {
    quote: language === "de"
      ? "Als Vermieter schätze ich besonders die Vorauswahl der Interessenten. Das spart mir extrem viel Zeit und Nerven."
      : "As a landlord, I particularly appreciate the pre-selection of applicants. This saves me a lot of time and hassle.",
    name: "Sabine H.",
    role: `${t("testimonialRoleLandlord")} München`,
    initials: "SH",
  },
  {
    quote: language === "de"
      ? "Kompetent, zuverlässig und sehr modern. Die Besichtigung per 3D-Rundgang war für mich als Pendler ideal."
      : "Competent, reliable, and very modern. The 3D virtual tour viewing was ideal for me as a commuter.",
    name: "Thomas L.",
    role: `${t("testimonialRoleTenant")} Hamburg`,
    initials: "TL",
  },
  {
    quote: language === "de"
      ? "Die Plattform hat uns geholfen, eine tolle Wohnung in der Nähe des Bankenviertels zu mieten. Der Prozess war transparent und schnell."
      : "The platform helped us rent a great apartment near the banking district. The process was transparent and fast.",
    name: "Laura M.",
    role: `${t("testimonialRoleTenant")} Frankfurt`,
    initials: "LM",
  },
  {
    quote: language === "de"
      ? "Sehr benutzerfreundlich! Als Student war es schwer, Wohnungen zu finden, aber hier hatte ich nach drei Bewerbungen Erfolg."
      : "Very user-friendly! As a student, it was hard to find apartments, but here I succeeded after three applications.",
    name: "Andreas B.",
    role: `${t("testimonialRoleTenant")} Köln`,
    initials: "AB",
  },
  {
    quote: language === "de"
      ? "Die Qualität der Inserate ist hervorragend. Keine Betrugsversuche, alles echt und verifiziert. Absolut empfehlenswert."
      : "The quality of the listings is outstanding. No scams, everything real and verified. Highly recommended.",
    name: "Elena R.",
    role: `${t("testimonialRoleLandlord")} Stuttgart`,
    initials: "ER",
  },
];

const getMockBlogs = (lang: string) => [
  {
    id: "mock-1",
    author_id: "mock-user-1",
    author_name: "Maximilian K.",
    author_avatar: null,
    title: lang === "de" ? "Traumhafte Zeit in Berlin-Mitte" : "Dream Stay in Berlin-Mitte",
    content: lang === "de" 
      ? "Die Wohnung war fantastisch gelegen, super hell und modern eingerichtet. Perfekt für Studierende und Expats! Die U-Bahn ist direkt vor der Tür." 
      : "The apartment was in a fantastic location, super bright and modernly furnished. Perfect for students and expats! The subway is right outside the door.",
    rating: 5,
    place_name: "Berlin Cozy Flat",
    image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80",
    created_at: "2026-05-15T12:00:00.000Z"
  },
  {
    id: "mock-2",
    author_id: "mock-user-2",
    author_name: "Sabine H.",
    author_avatar: null,
    title: lang === "de" ? "Wunderschönes Loft in München" : "Beautiful Loft in Munich",
    content: lang === "de"
      ? "Der Vermieter war sehr freundlich und der 3D-Rundgang hat exakt der Realität entsprochen. Die Lage im Glockenbachviertel is unschlagbar!"
      : "The landlord was very friendly and the 3D tour matched reality perfectly. The location in the Glockenbachviertel is unbeatable!",
    rating: 5,
    place_name: "Munich Modern Loft",
    image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
    created_at: "2026-06-01T14:30:00.000Z"
  },
  {
    id: "mock-3",
    author_id: null,
    author_name: "Thomas L.",
    author_avatar: null,
    title: lang === "de" ? "Perfekte Anbindung in Frankfurt" : "Perfect Transit in Frankfurt",
    content: lang === "de"
      ? "Sehr sauberes Zimmer, die Anbindung an die Innenstadt war hervorragend. Etwas laut wegen der Straße, aber das moderne Bad gleicht das aus."
      : "Very clean room, transit to the city center was excellent. A bit loud due to the street, but the modern bathroom makes up for it.",
    rating: 4,
    place_name: "Frankfurt Transit Apartment",
    image_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80",
    created_at: "2026-06-10T09:15:00.000Z"
  }
];

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

export default function HomePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user, profile } = useAuth();
  const [stadt, setStadt] = useState("");
  const [zimmer, setZimmer] = useState("all");
  const [moveInDate, setMoveInDate] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [selectedPremiumPlan, setSelectedPremiumPlan] = useState<"1month" | "3months" | "12months">("3months");
  const citySliderRef = useRef<HTMLDivElement>(null);
  const reviewsSliderRef = useRef<HTMLDivElement>(null);

  // Autocomplete states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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
    setStadt(val);
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
    setStadt(city);
    setShowSuggestions(false);
  };

  // Blog states
  const [blogs, setBlogs] = useState<any[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogPlaceName, setBlogPlaceName] = useState("");
  const [blogRating, setBlogRating] = useState(5);
  const [blogAuthorName, setBlogAuthorName] = useState("");
  const [selectedBlogImage, setSelectedBlogImage] = useState("https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80");
  const [customBlogImageUrl, setCustomBlogImageUrl] = useState("");
  const [blogSubmitting, setBlogSubmitting] = useState(false);

  const fetchLatestBlogs = async () => {
    setBlogsLoading(true);
    try {
      let dbBlogs: any[] = [];
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("blogs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3);
        if (!error && data) {
          dbBlogs = data;
        }
      }
      const mockList = getMockBlogs(language);
      const combined = [...dbBlogs, ...mockList];
      setBlogs(combined.slice(0, 3));
    } catch (err) {
      console.error("Error fetching homepage blogs:", err);
      setBlogs(getMockBlogs(language).slice(0, 3));
    } finally {
      setBlogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestBlogs();
  }, [language]);

  // Pre-fill author name if user profile details load
  useEffect(() => {
    if (profile?.full_name) {
      setBlogAuthorName(profile.full_name);
    } else if (user?.email) {
      setBlogAuthorName(user.email.split("@")[0]);
    }
  }, [profile, user]);

  const resetBlogForm = () => {
    setBlogTitle("");
    setBlogContent("");
    setBlogPlaceName("");
    setBlogRating(5);
    if (!profile?.full_name && !user?.email) {
      setBlogAuthorName("");
    }
    setSelectedBlogImage("https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80");
    setCustomBlogImageUrl("");
  };

  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle.trim() || !blogContent.trim() || !blogPlaceName.trim() || !blogAuthorName.trim()) {
      window.alert(t("fillRequiredFields"));
      return;
    }

    setBlogSubmitting(true);
    const finalImage = customBlogImageUrl.trim() || selectedBlogImage;

    const newPost = {
      title: blogTitle.trim(),
      content: blogContent.trim(),
      rating: blogRating,
      place_name: blogPlaceName.trim(),
      author_name: blogAuthorName.trim(),
      author_id: user?.id || null,
      author_avatar: profile?.avatar_url || null,
      image_url: finalImage || null,
    };

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from("blogs").insert(newPost);
        if (error) throw error;
        
        window.alert(t("blogSuccess"));
        fetchLatestBlogs();
        setIsBlogModalOpen(false);
        resetBlogForm();
      } else {
        console.warn("Supabase not configured. Mocking homepage blog submission.");
        setBlogs((prev) => [
          {
            ...newPost,
            id: Math.random().toString(),
            created_at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 3));
        window.alert(t("blogSuccessLocal"));
        setIsBlogModalOpen(false);
        resetBlogForm();
      }
    } catch (err: any) {
      console.error("Error submitting homepage blog:", err);
      window.alert(`${t("publishError")}: ${err.message}`);
    } finally {
      setBlogSubmitting(false);
    }
  };

  // Auto-scroll logic for city slider (continuous marquee-like) with interaction yield and infinite seamless wrap
  useEffect(() => {
    const slider = citySliderRef.current;
    if (!slider) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 40; // Continuous scroll speed in pixels per second
    let isInteracting = false;
    let timeoutId: any = null;
    let scrollPos = slider.scrollLeft;

    const pauseAutoScroll = () => {
      isInteracting = true;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        isInteracting = false;
        lastTime = performance.now();
      }, 1500); // Resume auto scroll after 1.5 seconds of inactivity
    };

    slider.addEventListener("wheel", pauseAutoScroll, { passive: true });
    slider.addEventListener("touchstart", pauseAutoScroll, { passive: true });
    slider.addEventListener("touchmove", pauseAutoScroll, { passive: true });
    slider.addEventListener("touchend", pauseAutoScroll, { passive: true });

    const leftBtn = slider.parentElement?.querySelector("[aria-label='Scroll left']");
    const rightBtn = slider.parentElement?.querySelector("[aria-label='Scroll right']");
    leftBtn?.addEventListener("click", pauseAutoScroll);
    rightBtn?.addEventListener("click", pauseAutoScroll);

    const animate = () => {
      const time = performance.now();
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const halfWidth = slider.scrollWidth / 2;

      if (!isInteracting) {
        if (halfWidth > 0) {
          scrollPos += speed * delta;
          
          // Wrap around seamlessly without gaps
          if (scrollPos >= halfWidth) {
            scrollPos -= halfWidth;
          } else if (scrollPos <= 5) {
            scrollPos += halfWidth;
          }
          
          slider.scrollLeft = Math.round(scrollPos);
        }
      } else {
        // Keep scrollPos synced with manual actions
        scrollPos = slider.scrollLeft;
        // Even when interacting, handle wrap around so manual scroll feels infinite and gapless
        if (halfWidth > 0) {
          if (slider.scrollLeft >= halfWidth) {
            slider.scrollLeft -= halfWidth;
            scrollPos = slider.scrollLeft;
          } else if (slider.scrollLeft <= 5) {
            slider.scrollLeft += halfWidth;
            scrollPos = slider.scrollLeft;
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      slider.removeEventListener("wheel", pauseAutoScroll);
      slider.removeEventListener("touchstart", pauseAutoScroll);
      slider.removeEventListener("touchmove", pauseAutoScroll);
      slider.removeEventListener("touchend", pauseAutoScroll);
      leftBtn?.removeEventListener("click", pauseAutoScroll);
      rightBtn?.removeEventListener("click", pauseAutoScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Auto-scroll logic for reviews slider (continuous marquee-like) with interaction yield and infinite seamless wrap
  useEffect(() => {
    const slider = reviewsSliderRef.current;
    if (!slider) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 40; // Continuous scroll speed in pixels per second
    let isInteracting = false;
    let timeoutId: any = null;
    let scrollPos = slider.scrollLeft;

    const pauseAutoScroll = () => {
      isInteracting = true;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        isInteracting = false;
        lastTime = performance.now();
      }, 1500); // Resume auto scroll after 1.5 seconds of inactivity
    };

    slider.addEventListener("wheel", pauseAutoScroll, { passive: true });
    slider.addEventListener("touchstart", pauseAutoScroll, { passive: true });
    slider.addEventListener("touchmove", pauseAutoScroll, { passive: true });
    slider.addEventListener("touchend", pauseAutoScroll, { passive: true });

    const leftBtn = slider.parentElement?.querySelector("[aria-label='Scroll left']");
    const rightBtn = slider.parentElement?.querySelector("[aria-label='Scroll right']");
    leftBtn?.addEventListener("click", pauseAutoScroll);
    rightBtn?.addEventListener("click", pauseAutoScroll);

    const animate = () => {
      const time = performance.now();
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const halfWidth = slider.scrollWidth / 2;

      if (!isInteracting) {
        if (halfWidth > 0) {
          scrollPos += speed * delta;
          
          // Wrap around seamlessly without gaps
          if (scrollPos >= halfWidth) {
            scrollPos -= halfWidth;
          } else if (scrollPos <= 5) {
            scrollPos += halfWidth;
          }
          
          slider.scrollLeft = Math.round(scrollPos);
        }
      } else {
        // Keep scrollPos synced with manual actions
        scrollPos = slider.scrollLeft;
        // Even when interacting, handle wrap around so manual scroll feels infinite and gapless
        if (halfWidth > 0) {
          if (slider.scrollLeft >= halfWidth) {
            slider.scrollLeft -= halfWidth;
            scrollPos = slider.scrollLeft;
          } else if (slider.scrollLeft <= 5) {
            slider.scrollLeft += halfWidth;
            scrollPos = slider.scrollLeft;
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      slider.removeEventListener("wheel", pauseAutoScroll);
      slider.removeEventListener("touchstart", pauseAutoScroll);
      slider.removeEventListener("touchmove", pauseAutoScroll);
      slider.removeEventListener("touchend", pauseAutoScroll);
      leftBtn?.removeEventListener("click", pauseAutoScroll);
      rightBtn?.removeEventListener("click", pauseAutoScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);


  // Self-healing: Detect Google OAuth hash redirect landing on root domain and route to Auth Callback
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      if (window.location.hash.includes("access_token")) {
        router.replace(`/auth/callback${window.location.hash}`);
      }
    }
  }, [router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stadt.trim()) return;
    localStorage.setItem("heimat_has_searched", "true");
    const q = new URLSearchParams();
    q.set("stadt", stadt.trim());
    if (zimmer !== "all") q.set("zimmer", zimmer);
    if (moveInDate) q.set("moveIn", moveInDate);
    if (moveOutDate) q.set("moveOut", moveOutDate);
    router.push(`/suche?${q.toString()}`);
  };

  const stars = Array(5).fill(0);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative h-[870px] min-h-[600px] flex items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=80"
          alt="Moderne Architektur in Deutschland"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 w-full max-w-[1280px] px-5 md:px-[48px] text-center">
          <h1 className="text-display-lg-mobile md:text-display-lg text-white mb-12 drop-shadow-lg">
            {t("heroTitle")}
          </h1>

          {/* Search Card */}
          <form
            onSubmit={handleSearch}
            className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-2xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-8 gap-4 items-end">
              <div className="text-left sm:col-span-2 md:col-span-3 relative" ref={suggestionsRef}>
                <label className="block text-label-sm text-on-surface-variant mb-2 ml-1">
                  {t("searchCityLabel")}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">
                    location_on
                  </span>
                  <input
                    type="text"
                    value={stadt}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                      if (stadt.trim() !== "") {
                        handleInputChange(stadt);
                      } else {
                        const all = ALL_SUGGESTIONS.map((c) => (language === "de" || language === "fr" || language === "nl" || language === "pl" ? c.de : c.en));
                        setFilteredCities(all);
                        setShowSuggestions(true);
                      }
                    }}
                    id="search-city"
                    placeholder={t("cityInputPlaceholder")}
                    className="w-full pl-10 pr-4 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[16px] font-semibold text-on-surface h-[50px]"
                    autoComplete="off"
                  />
                </div>

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

              <div className="text-left sm:col-span-1 md:col-span-2">
                <label className="block text-label-sm text-on-surface-variant mb-2 ml-1">
                  {t("moveIn")}
                </label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[15px] font-semibold text-on-surface cursor-pointer h-[50px]"
                  style={{ colorScheme: "light" }}
                  id="search-move-in"
                />
              </div>

              <div className="text-left sm:col-span-1 md:col-span-2">
                <label className="block text-label-sm text-on-surface-variant mb-2 ml-1">
                  {t("moveOut")}
                </label>
                <input
                  type="date"
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[15px] font-semibold text-on-surface cursor-pointer h-[50px]"
                  style={{ colorScheme: "light" }}
                  id="search-move-out"
                />
              </div>

              <button
                type="submit"
                id="btn-search"
                disabled={stadt.trim() === ""}
                className={`h-[50px] rounded-lg text-label-md flex items-center justify-center gap-2 transition-all shadow-lg w-full font-semibold sm:col-span-2 md:col-span-1 ${
                  stadt.trim() === ""
                    ? "bg-outline-variant text-on-surface-variant cursor-not-allowed opacity-50"
                    : "bg-primary text-white hover:opacity-90 active:scale-95 cursor-pointer"
                }`}
              >
                <span className="material-symbols-outlined text-xl">search</span>
                <span>{t("searchBtn")}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Top-Städte ────────────────────────────────────── */}
      <section className="py-24 max-w-[1280px] mx-auto px-5 md:px-[48px] w-full">
        <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
          <div>
            <h2 className="text-headline-lg-mobile md:text-headline-lg text-primary mb-2">
              {t("topCitiesTitle")}
            </h2>
            <p className="text-body-md text-on-surface-variant">
              {t("topCitiesSubtitle")}
            </p>
          </div>
          <Link
            href="/suche"
            className="text-primary text-label-md border-b border-primary pb-1 hover:opacity-70 transition-opacity"
          >
            {t("viewAllCities")}
          </Link>
        </div>

        {/* Carousel Viewport Container */}
        <div className="relative w-full group/slider">
          {/* Viewport container */}
          <div
            ref={citySliderRef}
            className="flex overflow-x-auto gap-0 py-4 no-scrollbar w-full"
          >
            {[...CITIES, ...CITIES].map((item, idx) => {
              const cityName = language === "de" || language === "fr" || language === "nl" || language === "pl" ? item.nameDe : item.nameEn;
              return (
                <div
                  key={`${item.nameDe}-${idx}`}
                  className="w-[280px] md:w-[320px] flex-shrink-0 px-3"
                >
                  <button
                    id={`city-${item.nameDe.toLowerCase()}-${idx}`}
                    onClick={() => {
                      localStorage.setItem("heimat_has_searched", "true");
                      router.push(`/suche?stadt=${item.nameDe}`);
                    }}
                    className="group relative aspect-[4/5] w-full rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all text-left block"
                  >
                    <img
                      src={item.img}
                      alt={`${cityName} Stadtbild`}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 text-white">
                      <h3 className="text-headline-md">{cityName}</h3>
                      <p className="text-label-md opacity-90">{item.count} {t("objectsAvailable")}</p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Left Arrow Button */}
          <button
            onClick={() => {
              citySliderRef.current?.scrollBy({ left: -320, behavior: "smooth" });
            }}
            aria-label="Scroll left"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 bg-white/95 backdrop-blur-md text-primary rounded-full shadow-lg border border-outline-variant hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none opacity-100 md:opacity-0 md:group-hover/slider:opacity-100 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">chevron_left</span>
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={() => {
              citySliderRef.current?.scrollBy({ left: 320, behavior: "smooth" });
            }}
            aria-label="Scroll right"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 bg-white/95 backdrop-blur-md text-primary rounded-full shadow-lg border border-outline-variant hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none opacity-100 md:opacity-0 md:group-hover/slider:opacity-100 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">chevron_right</span>
          </button>
        </div>
      </section>



      {/* ── Mitgliedschaften ───────────────────────────────── */}
      <section className="py-24 max-w-[1280px] mx-auto px-5 md:px-[48px] w-full border-t border-outline-variant/30">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-secondary text-label-md tracking-wider uppercase block">
            {t("flexiblePlans")}
          </span>
          <h2 className="text-headline-lg-mobile md:text-headline-lg text-primary">
            {t("findHomeTitle")}
          </h2>
          <p className="text-body-md text-on-surface-variant">
            {t("findHomeSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Free Card */}
          <div className="lg:col-span-5 bg-white border border-outline-variant rounded-2xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-6">
              <div>
                <h3 className="text-[20px] font-bold text-primary">{t("freeMembership")}</h3>
                <p className="text-[14px] text-on-surface-variant mt-2">
                  {t("freeMembershipDesc")}
                </p>
                <div className="flex items-baseline gap-1 mt-6">
                  <span className="text-[40px] font-bold text-primary">{formatPrice(0)}</span>
                  <span className="text-on-surface-variant text-[14px]">/ {t("perMonthLabel")}</span>
                </div>
              </div>

              <ul className="space-y-4 text-[14px] text-on-surface-variant border-t border-outline-variant/40 pt-6">
                {[
                  { text: t("freeBrowse"), check: true },
                  { text: t("standardApplicant"), check: true },
                  { text: t("directChat"), check: false },
                  { text: t("validatedPortfolio"), check: false },
                ].map(({ text, check }, i) => (
                  <li key={i} className={`flex items-center gap-3 ${!check ? "text-outline-variant/60 line-through" : ""}`}>
                    <span className={`material-symbols-outlined text-[20px] ${check ? "text-[#137333]" : "text-outline-variant"}`}>
                      {check ? "check_circle" : "cancel"}
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button 
              onClick={() => router.push("/suche")}
              className="w-full border-2 border-primary text-primary py-3.5 rounded-xl font-bold hover:bg-primary/5 active:scale-98 transition-all mt-8 cursor-pointer text-center text-label-md"
            >
              {t("startFreeNow")}
            </button>
          </div>

          {/* Premium Card */}
          <div className="lg:col-span-7 bg-white border-2 border-[#f07d00] rounded-2xl p-8 flex flex-col justify-between shadow-lg relative bg-gradient-to-b from-white to-[#f07d00]/5">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-[#f07d00] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
              {t("highlyRecommended")}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-[20px] font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#f07d00]">workspace_premium</span>
                  Heimstadt Premium
                </h3>
                <p className="text-[14px] text-on-surface-variant mt-2">
                  {t("premiumDesc")}
                </p>
              </div>

              {/* Minified Pricing Cards from the reference image */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-outline-variant/40 pt-6">
                {[
                  { key: "1month", duration: t("billing1Month"), price: formatPrice(10.99), sub: "" },
                  { key: "3months", duration: t("billing3Months"), price: formatPrice(9.99), sub: t("perMonth"), featured: true },
                  { key: "12months", duration: t("billing12Months"), price: formatPrice(7.99), sub: t("perMonth") },
                ].map(({ key, duration, price, sub, featured }, i) => (
                  <div
                    key={key}
                    onClick={() => setSelectedPremiumPlan(key as any)}
                    className={`p-4 rounded-xl border relative flex flex-col justify-between text-center bg-white cursor-pointer transition-all hover:shadow-md ${
                      selectedPremiumPlan === key ? "border-[#f07d00] ring-1 ring-[#f07d00]" : "border-outline-variant hover:border-on-surface-variant"
                    }`}
                  >
                    {featured && (
                      <span className="absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2 bg-[#f07d00] text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm whitespace-nowrap">
                        {t("topSellersLabel")}
                      </span>
                    )}
                    <span className="text-[12px] font-bold text-on-surface-variant block mb-2">{duration}</span>
                    <div>
                      <span className="text-[18px] font-bold text-primary block">{price}</span>
                      {sub && <span className="text-[10px] text-on-surface-variant/80 font-medium block mt-0.5">{sub}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-on-surface-variant/80 italic">
                {t("pricingDisclaimer")}
              </p>

              {/* Premium Feature Checklist */}
              <div className="border-t border-outline-variant/40 pt-4 mt-4 space-y-3">
                <span className="text-[12px] font-bold text-primary uppercase tracking-wider block">
                  {t("whatsIncluded")}
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] text-on-surface-variant">
                  {[
                    { label: t("directChat") },
                    { label: t("validatedPortfolio") },
                    { label: t("priorityRequests") },
                    { label: t("unlimitedChat") },
                    { label: t("escrowGuarantee") }
                  ].map(({ label }, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#f07d00] text-[16px]">verified</span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => router.push(`/preise?plan=${selectedPremiumPlan}`)}
              className="w-full bg-[#f07d00] text-white py-4 rounded-full font-bold text-label-md hover:opacity-90 active:scale-98 transition-all mt-8 cursor-pointer shadow-md shadow-[#f07d00]/20 text-center block"
            >
              {t("getPremiumBtn")}
            </button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="py-24 max-w-[1280px] mx-auto px-5 md:px-[48px] w-full">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-primary text-center mb-16">
          {t("testimonialsTitle")}
        </h2>

        {/* Carousel Viewport Container */}
        <div className="relative w-full group/slider-reviews">
          {/* Viewport container */}
          <div
            ref={reviewsSliderRef}
            className="flex overflow-x-auto gap-0 py-4 no-scrollbar w-full"
          >
            {[...getTestimonials(language, t), ...getTestimonials(language, t)].map(({ quote, name, role, initials }, idx) => (
              <div
                key={`${name}-${idx}`}
                className="w-[290px] sm:w-[325px] md:w-[400px] flex-shrink-0 px-3 flex animate-[fadeIn_0.5s_ease-out]"
              >
                <div
                  className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-outline-variant hover:shadow-xl transition-all duration-300 w-full flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-0.5 mb-4">
                      {stars.map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-secondary-fixed-dim text-[20px] md:text-[22px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <p className="text-body-md text-on-surface italic mb-8 text-[14px] md:text-[16px] leading-relaxed font-sans">
                      &ldquo;{quote}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-4 font-sans">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary text-[12px] md:text-[14px] flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-label-md text-primary font-bold text-[13px] md:text-[14px]">{name}</p>
                      <p className="text-on-surface-variant text-[11px] md:text-[12px]">{role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => {
              reviewsSliderRef.current?.scrollBy({ left: -320, behavior: "smooth" });
            }}
            aria-label="Scroll left"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 bg-white/95 backdrop-blur-md text-primary rounded-full shadow-lg border border-outline-variant hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none opacity-100 md:opacity-0 md:group-hover/slider-reviews:opacity-100 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">chevron_left</span>
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => {
              reviewsSliderRef.current?.scrollBy({ left: 320, behavior: "smooth" });
            }}
            aria-label="Scroll right"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 bg-white/95 backdrop-blur-md text-primary rounded-full shadow-lg border border-outline-variant hover:bg-primary hover:text-white transition-all active:scale-90 flex items-center justify-center cursor-pointer select-none opacity-100 md:opacity-0 md:group-hover/slider-reviews:opacity-100 transition-opacity duration-200"
          >
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">chevron_right</span>
          </button>
        </div>
      </section>

      {/* ── Blog & Experiences ───────────────────────────────── */}
      <section className="py-24 max-w-[1280px] mx-auto px-5 md:px-[48px] w-full border-t border-outline-variant/30">
        <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
          <div>
            <span className="text-secondary text-label-md tracking-wider uppercase block mb-1">
              {t("userExperiences")}
            </span>
            <h2 className="text-headline-lg-mobile md:text-headline-lg text-primary">
              {t("realStories")}
            </h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsBlogModalOpen(true)}
              className="bg-primary text-white px-5 py-2.5 rounded-full text-label-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              {t("writeBlogBtn")}
            </button>
            <Link
              href="/blogs"
              className="border-2 border-primary text-primary px-5 py-2 rounded-full text-label-md font-bold hover:bg-primary/5 active:scale-95 transition-all text-center flex items-center"
            >
              {t("readAllStories")}
            </Link>
          </div>
        </div>

        {blogsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-10 h-10 rounded-full border-[3px] border-primary/10 border-t-primary animate-spin" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-3">
            <span className="material-symbols-outlined text-[48px] text-outline-variant">rate_review</span>
            <p className="text-body-md text-on-surface-variant font-medium">
              {t("noBlogsYet")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between p-6"
              >
                <div className="space-y-4">
                  {blog.image_url && (
                    <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-2 relative">
                      <img src={blog.image_url} alt={blog.place_name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-primary/95 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        {blog.place_name}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <span
                            key={i}
                            className={`material-symbols-outlined text-[16px] ${
                              i < blog.rating ? "text-secondary-fixed-dim" : "text-outline-variant/30"
                            }`}
                            style={i < blog.rating ? { fontVariationSettings: "'FILL' 1" } : {}}
                          >
                            star
                          </span>
                        ))}
                    </div>
                    <span className="text-[10px] text-on-surface-variant/80">
                      {new Date(blog.created_at).toLocaleDateString(language === "de" ? "de-DE" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : language === "it" ? "it-IT" : language === "nl" ? "nl-NL" : language === "pt" ? "pt-BR" : "en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-extrabold text-primary line-clamp-1 leading-snug">{blog.title}</h3>
                  <p className="text-body-md text-on-surface-variant line-clamp-3 leading-relaxed font-sans">{blog.content}</p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/30 mt-6">
                  {blog.author_avatar ? (
                    <img src={blog.author_avatar} alt={blog.author_name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[11px]">
                      {blog.author_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .substring(0, 2)}
                    </div>
                  )}
                  <div>
                    <p className="text-label-md text-primary font-bold text-[13px]">{blog.author_name}</p>
                    <p className="text-[9px] text-on-surface-variant/75 uppercase tracking-wider font-semibold">
                      {blog.author_id ? t("verifiedLabel") : t("guestLabel")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />

      {/* Mobile FAB */}
      <button
        id="fab-search"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform cursor-pointer"
        aria-label="Suchen"
      >
        <span className="material-symbols-outlined text-[24px]">search</span>
      </button>

      {/* Blog modal overlay */}
      {isBlogModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-outline-variant overflow-hidden transform animate-[slideDown_0.25s_ease-out] max-h-[90vh] flex flex-col text-left">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/40 bg-surface-container-low flex justify-between items-center">
              <h3 className="text-headline-sm text-primary font-black">
                {t("writeBlogBtn")}
              </h3>
              <button
                onClick={() => setIsBlogModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleBlogSubmit} className="p-6 overflow-y-auto space-y-4 flex-grow custom-scrollbar">
              {/* Place/House Name */}
              <div className="space-y-1.5">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {t("blogAccommodation")}
                </label>
                <input
                  type="text"
                  required
                  value={blogPlaceName}
                  onChange={(e) => setBlogPlaceName(e.target.value)}
                  placeholder={t("blogAccommodationPlaceholder")}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-body-md"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {t("blogTitle2")}
                </label>
                <input
                  type="text"
                  required
                  value={blogTitle}
                  onChange={(e) => setBlogTitle(e.target.value)}
                  placeholder={t("blogTitlePlaceholder")}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-body-md"
                />
              </div>

              {/* Author name */}
              <div className="space-y-1.5">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {t("yourName")}
                </label>
                <input
                  type="text"
                  required
                  value={blogAuthorName}
                  onChange={(e) => setBlogAuthorName(e.target.value)}
                  placeholder={t("yourNamePlaceholder")}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-body-md"
                />
                {!user && (
                  <p className="text-[10px] text-secondary font-semibold">
                    {t("guestNote")}
                  </p>
                )}
              </div>

              {/* Star Rating Select */}
              <div className="space-y-1.5">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {t("blogRating")}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setBlogRating(star)}
                      className="hover:scale-115 transition-transform cursor-pointer"
                    >
                      <span
                        className={`material-symbols-outlined text-[32px] ${
                          star <= blogRating ? "text-secondary-fixed-dim" : "text-outline-variant/40"
                        }`}
                        style={star <= blogRating ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Description */}
              <div className="space-y-1.5">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {t("blogExperience")}
                </label>
                <textarea
                  required
                  rows={4}
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  placeholder={t("blogExperiencePlaceholder")}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-body-md font-sans"
                />
              </div>

              {/* Photo Selector */}
              <div className="space-y-2">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {t("chooseCoverPhoto")}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "berlin", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80" },
                    { id: "modern", url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80" },
                    { id: "cozy", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80" },
                    { id: "munich", url: "https://images.unsplash.com/photo-1649609765902-254a227dc960?w=800&auto=format&fit=crop&q=80" },
                  ].map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        setSelectedBlogImage(img.url);
                        setCustomBlogImageUrl("");
                      }}
                      className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedBlogImage === img.url && !customBlogImageUrl
                          ? "border-[#f07d00] scale-95 shadow-md"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img.url} alt={img.id} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 hover:bg-transparent" />
                    </button>
                  ))}
                </div>

                {/* Custom Image URL Option */}
                <div className="space-y-1 mt-2">
                  <span className="text-[11px] text-on-surface-variant/80 font-bold block">
                    {t("orEnterImageUrl")}
                  </span>
                  <input
                    type="url"
                    value={customBlogImageUrl}
                    onChange={(e) => setCustomBlogImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-[13px]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBlogModalOpen(false)}
                  className="flex-1 border border-outline-variant py-3 rounded-xl font-bold text-label-md text-on-surface-variant hover:bg-surface-container-low active:scale-98 transition-all cursor-pointer text-center"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={blogSubmitting}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-label-md hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  {blogSubmitting ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-[2px] border-white/20 border-t-white animate-spin" />
                      <span>{t("submitting")}</span>
                    </>
                  ) : (
                    <span>{t("publish")}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
