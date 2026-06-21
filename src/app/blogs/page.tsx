"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/utils/supabase/client";
import Footer from "@/components/layout/Footer";

// Curated beautiful placeholder images for users to choose from
const CURATED_IMAGES = [
  {
    id: "berlin",
    nameDe: "Berlin Apartment",
    nameEn: "Berlin Apartment",
    url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "modern",
    nameDe: "Moderne Architektur",
    nameEn: "Modern Architecture",
    url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "cozy",
    nameDe: "Gemütliches Zimmer",
    nameEn: "Cozy Room",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "munich",
    nameDe: "München Stadtbild",
    nameEn: "Munich Cityscape",
    url: "https://images.unsplash.com/photo-1649609765902-254a227dc960?w=800&auto=format&fit=crop&q=80",
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
      ? "Der Vermieter war sehr freundlich und der 3D-Rundgang hat exakt der Realität entsprochen. Die Lage im Glockenbachviertel ist unschlagbar!"
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

export default function BlogPage() {
  const { language, t } = useLanguage();
  const { user, profile } = useAuth();

  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | "all">("all");

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState("");
  const [selectedImage, setSelectedImage] = useState(CURATED_IMAGES[0].url);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch blogs on load
  const fetchBlogs = async () => {
    setLoading(true);
    try {
      let dbBlogs: any[] = [];
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("blogs")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("Error fetching blogs:", error);
        } else if (data) {
          dbBlogs = data;
        }
      }
      const mockList = getMockBlogs(language);
      setBlogs([...dbBlogs, ...mockList]);
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
      setBlogs(getMockBlogs(language));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [language]);

  // Pre-fill author name if user profile details load
  useEffect(() => {
    if (profile?.full_name) {
      setAuthorName(profile.full_name);
    } else if (user?.email) {
      setAuthorName(user.email.split("@")[0]);
    }
  }, [profile, user]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPlaceName("");
    setRating(5);
    // Keep authorName if profile loaded, else reset
    if (!profile?.full_name && !user?.email) {
      setAuthorName("");
    }
    setSelectedImage(CURATED_IMAGES[0].url);
    setCustomImageUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !placeName.trim() || !authorName.trim()) {
      window.alert(
        language === "de"
          ? "Bitte füllen Sie alle erforderlichen Felder aus."
          : "Please fill in all required fields."
      );
      return;
    }

    setSubmitting(true);
    const finalImage = customImageUrl.trim() || selectedImage;

    const newPost = {
      title: title.trim(),
      content: content.trim(),
      rating,
      place_name: placeName.trim(),
      author_name: authorName.trim(),
      author_id: user?.id || null,
      author_avatar: profile?.avatar_url || null,
      image_url: finalImage || null,
    };

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from("blogs").insert(newPost);
        if (error) throw error;
        
        window.alert(
          language === "de"
            ? "Erfolgreich! Dein Erfahrungsbericht wurde hochgeladen."
            : "Success! Your experience has been published."
        );
        fetchBlogs();
        setIsModalOpen(false);
        resetForm();
      } else {
        // Local mockup state fallback if not configured
        console.warn("Supabase not configured. Mocking database submission.");
        setBlogs((prev) => [
          {
            ...newPost,
            id: Math.random().toString(),
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        window.alert(
          language === "de"
            ? "Erfolgreich eingereicht! (Lokal simuliert - kein Supabase konfiguriert)"
            : "Successfully submitted! (Locally simulated - no Supabase configured)"
        );
        setIsModalOpen(false);
        resetForm();
      }
    } catch (err: any) {
      console.error("Error submitting blog:", err);
      window.alert(
        language === "de"
          ? `Fehler beim Veröffentlichen: ${err.message}`
          : `Error publishing experience: ${err.message}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.place_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = selectedRating === "all" || blog.rating === selectedRating;
    return matchesSearch && matchesRating;
  });

  const renderStars = (num: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <span
          key={i}
          className={`material-symbols-outlined text-[18px] ${
            i < num ? "text-secondary-fixed-dim" : "text-outline-variant/40"
          }`}
          style={i < num ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          star
        </span>
      ));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      <div className="bg-[#f8f9ff] min-h-screen py-12 flex flex-col">
        {/* Page Hero Header */}
        <section className="relative bg-gradient-to-br from-[#002046] to-[#003875] text-white py-16 px-5 md:px-[48px] overflow-hidden mb-12 shadow-inner">
          {/* Subtle absolute grid decoration */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          <div className="relative z-10 max-w-[1280px] mx-auto text-center space-y-4">
            <h1 className="text-display-sm md:text-display-lg font-black tracking-tight drop-shadow-md">
              {t("blogTitle")}
            </h1>
            <p className="text-body-lg text-white/80 max-w-xl mx-auto">
              {t("blogSubtitle")}
            </p>
          </div>
        </section>

        {/* Content Container */}
        <div className="max-w-[1280px] mx-auto px-5 md:px-[48px] w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Blog Feed */}
          <main className="lg:col-span-8 space-y-6 order-2 lg:order-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 rounded-full border-[3px] border-[#002046]/10 border-t-[#002046] animate-spin" />
                <p className="text-body-md text-on-surface-variant font-medium">
                  {language === "de" ? "Erfahrungsberichte werden geladen..." : "Loading experiences..."}
                </p>
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
                <span className="material-symbols-outlined text-[64px] text-outline-variant">
                  rate_review
                </span>
                <h3 className="text-headline-md text-primary font-bold">
                  {language === "de" ? "Noch keine Berichte" : "No experiences yet"}
                </h3>
                <p className="text-body-md text-on-surface-variant max-w-md">
                  {language === "de"
                    ? "Es wurden bisher keine Erfahrungsberichte geteilt. Teile als Erster deine Erlebnisse über Häuser oder Städte!"
                    : "No experiences have been shared yet. Be the first to tell others about your stays and adventures!"}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-primary text-white px-6 py-3 rounded-full font-bold text-label-md hover:opacity-90 active:scale-95 transition-all shadow-md mt-2 cursor-pointer"
                >
                  {t("writeBlogBtn")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredBlogs.map((blog) => (
                  <article
                    key={blog.id}
                    className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
                  >
                    {blog.image_url && (
                      <div className="aspect-[16/10] overflow-hidden relative">
                        <img
                          src={blog.image_url}
                          alt={blog.place_name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm text-white text-[12px] px-3 py-1 rounded-full font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {blog.place_name}
                        </div>
                      </div>
                    )}
                    <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-0.5">
                            {renderStars(blog.rating)}
                          </div>
                          <span className="text-[11px] text-on-surface-variant/80 font-medium">
                            {new Date(blog.created_at).toLocaleDateString(
                              language === "de" ? "de-DE" : "en-US",
                              { month: "short", year: "numeric" }
                            )}
                          </span>
                        </div>
                        <h3 className="text-headline-sm text-primary font-extrabold line-clamp-1 leading-snug">
                          {blog.title}
                        </h3>
                        <p className="text-body-md text-on-surface-variant line-clamp-4 leading-relaxed font-sans">
                          {blog.content}
                        </p>
                      </div>

                      {/* Author Info */}
                      <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/30 mt-auto">
                        {blog.author_avatar ? (
                          <img
                            src={blog.author_avatar}
                            alt={blog.author_name}
                            className="w-10 h-10 rounded-full object-cover border border-outline-variant"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[13px]">
                            {getInitials(blog.author_name)}
                          </div>
                        )}
                        <div>
                          <p className="text-label-md text-primary font-bold">{blog.author_name}</p>
                          <p className="text-[10px] text-on-surface-variant/70 uppercase tracking-wider font-semibold">
                            {blog.author_id ? (language === "de" ? "Verifizierter Nutzer" : "Verified User") : (language === "de" ? "Gast" : "Guest")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>

          {/* Right: Sidebar with filters & write CTA */}
          <aside className="lg:col-span-4 space-y-6 order-1 lg:order-2 lg:sticky lg:top-24">
            {/* Share CTA Widget */}
            <div className="bg-gradient-to-br from-[#f07d00] to-[#d97000] text-white p-6 rounded-2xl shadow-md space-y-4">
              <h3 className="text-[20px] font-black">
                {language === "de" ? "Teile deine Erfahrung!" : "Share Your Story!"}
              </h3>
              <p className="text-body-sm opacity-90 leading-relaxed">
                {language === "de"
                  ? "Hast du ein tolles Zimmer bewohnt oder eine Stadt besucht? Berichte anderen Nutzern davon und hilf ihnen bei der Suche."
                  : "Did you live in a cozy apartment or visit a beautiful city? Tell other community members how it felt!"}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-white text-[#d97000] py-3 rounded-xl font-extrabold text-label-md hover:bg-opacity-95 active:scale-98 transition-all shadow-md cursor-pointer text-center block"
              >
                {t("writeBlogBtn")}
              </button>
            </div>

            {/* Filter Dashboard */}
            <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm space-y-6">
              <h3 className="text-headline-sm text-primary font-bold border-b border-outline-variant/40 pb-3">
                {language === "de" ? "Filtern & Suchen" : "Filter & Search"}
              </h3>

              {/* Text Search */}
              <div className="space-y-2">
                <label className="block text-label-sm text-on-surface-variant ml-1 font-semibold">
                  {language === "de" ? "Stichwort suchen" : "Keyword search"}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[20px] pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === "de" ? "z.B. Berlin, modern..." : "e.g., Berlin, cozy..."}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body-md"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary cursor-pointer flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rating filter */}
              <div className="space-y-3">
                <label className="block text-label-sm text-on-surface-variant ml-1 font-semibold">
                  {language === "de" ? "Bewertung" : "Rating"}
                </label>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedRating("all")}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-label-sm font-semibold transition-all border flex justify-between items-center ${
                      selectedRating === "all"
                        ? "bg-primary/5 border-primary text-primary"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    <span>{language === "de" ? "Alle Bewertungen" : "All ratings"}</span>
                    <span className="text-[12px] opacity-75">({blogs.length})</span>
                  </button>
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = blogs.filter((b) => b.rating === stars).length;
                    return (
                      <button
                        key={stars}
                        onClick={() => setSelectedRating(stars)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-label-sm font-semibold transition-all border flex items-center justify-between ${
                          selectedRating === stars
                            ? "bg-primary/5 border-primary text-primary"
                            : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-body-md font-bold">{stars}</span>
                          <span className="material-symbols-outlined text-secondary-fixed-dim text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        </div>
                        <span className="text-[12px] opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />

      {/* Share Experience modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-outline-variant overflow-hidden transform animate-[slideDown_0.25s_ease-out] max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/40 bg-surface-container-low flex justify-between items-center">
              <h3 className="text-headline-sm text-primary font-black">
                {t("writeBlogBtn")}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-grow custom-scrollbar">
              {/* Place/House Name */}
              <div className="space-y-1.5">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {language === "de" ? "Unterkunft / Ort *" : "Accommodation / Place *"}
                </label>
                <input
                  type="text"
                  required
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder={language === "de" ? "z.B. Tiergarten Premium Loft, Berlin" : "e.g., Tiergarten Premium Loft, Berlin"}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-body-md"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {language === "de" ? "Titel des Berichts *" : "Title of your experience *"}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === "de" ? "z.B. Ein unvergesslicher Aufenthalt!" : "e.g., An unforgettable stay!"}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-body-md"
                />
              </div>

              {/* Author name */}
              <div className="space-y-1.5">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {language === "de" ? "Ihr Name *" : "Your Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={language === "de" ? "z.B. Lisa M." : "e.g., Lisa M."}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-body-md"
                />
                {!user && (
                  <p className="text-[10px] text-secondary font-semibold">
                    {language === "de"
                      ? "Hinweis: Sie sind als Gast eingeloggt. Melden Sie sich an, um Ihren verifizierten Account zu nutzen."
                      : "Note: You are posting as a guest. Log in to show your verified user badge."}
                  </p>
                )}
              </div>

              {/* Star Rating Select */}
              <div className="space-y-1.5">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {language === "de" ? "Bewertung *" : "Rating *"}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="hover:scale-115 transition-transform cursor-pointer"
                    >
                      <span
                        className={`material-symbols-outlined text-[32px] ${
                          star <= rating ? "text-secondary-fixed-dim" : "text-outline-variant/40"
                        }`}
                        style={star <= rating ? { fontVariationSettings: "'FILL' 1" } : {}}
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
                  {language === "de" ? "Deine Erfahrung & Gefühle *" : "Your Experience & Feelings *"}
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={language === "de" ? "Wie hast du dich gefühlt? Wie war die Nachbarschaft, die Ausstattung, die Anbindung?" : "How did you feel? How was the neighborhood, amenities, transit?"}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-body-md font-sans"
                />
              </div>

              {/* Photo Selector */}
              <div className="space-y-2">
                <label className="block text-label-sm text-on-surface-variant font-bold">
                  {language === "de" ? "Bild auswählen" : "Choose a Cover Photo"}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CURATED_IMAGES.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        setSelectedImage(img.url);
                        setCustomImageUrl(""); // reset custom URL to prioritize curated click
                      }}
                      className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedImage === img.url && !customImageUrl
                          ? "border-[#f07d00] scale-95 shadow-md"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img.url} alt={img.nameEn} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 hover:bg-transparent" />
                    </button>
                  ))}
                </div>

                {/* Custom Image URL Option */}
                <div className="space-y-1 mt-2">
                  <span className="text-[11px] text-on-surface-variant/80 font-bold block">
                    {language === "de" ? "Oder eigene Bild-URL eingeben:" : "Or enter your own image URL:"}
                  </span>
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-[13px]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border border-outline-variant py-3 rounded-xl font-bold text-label-md text-on-surface-variant hover:bg-surface-container-low active:scale-98 transition-all cursor-pointer text-center"
                >
                  {language === "de" ? "Abbrechen" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-label-md hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-[2px] border-white/20 border-t-white animate-spin" />
                      <span>{language === "de" ? "Wird gesendet..." : "Submitting..."}</span>
                    </>
                  ) : (
                    <span>{language === "de" ? "Veröffentlichen" : "Publish"}</span>
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
