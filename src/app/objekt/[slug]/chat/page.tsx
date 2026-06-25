"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";

interface ChatMessage {
  id: string;
  sender_id: string | null;
  recipient_id: string;
  body: string;
  sent_at: string;
}

export default function PropertyChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, loading: authLoading, isPremium } = useAuth();
  const { t, language } = useLanguage();

  const [property, setProperty] = useState<any>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [supportId, setSupportId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, chatLoading]);

  // Auth Guard redirect
  useEffect(() => {
    if (!authLoading && !isPremium) {
      router.push("/preise");
    }
  }, [authLoading, isPremium, router]);

  // Fetch Property Details
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      setLoadingProperty(true);

      const mocks: Record<string, any> = {
        "berlin-studio": {
          id: "berlin-studio",
          title: t("objektChat_brightStudioApartmentNearAlexa"),
          city: "Berlin",
          street: "Karl-Liebknecht-Str. 12",
        },
        "munich-expat": {
          id: "munich-expat",
          title: t("objektChat_premium3roomApartmentAtEnglisc"),
          city: "München",
          street: "Königinstraße 44",
        },
        "hamburg-loft": {
          id: "hamburg-loft",
          title: t("objektChat_stylishLoftInSpeicherstadt"),
          city: "Hamburg",
          street: "Am Sandtorkai 10",
        },
        "berlin-wg": {
          id: "berlin-wg",
          title: t("objektChat_cozyRoomInStudentSharedApartme"),
          city: "Berlin",
          street: "Königin-Luise-Str. 15",
        }
      };

      const defaultMock = {
        id: "mock-apply-87a",
        title: t("objektChat_bright3roomApartmentNearTierga"),
        street: "Torstraße 142",
        city: "Berlin",
      };

      try {
        const isConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co" &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "mock-anon-key";

        if (!isConfigured) {
          setProperty(mocks[slug] || defaultMock);
          return;
        }

        const { data, error } = await supabase
          .from("properties")
          .select("id, title, city, street")
          .eq("id", slug)
          .single();

        if (error) throw error;
        setProperty(data || mocks[slug] || defaultMock);
      } catch (err) {
        console.warn("Could not find property in Supabase, using mock fallback:", err);
        setProperty(mocks[slug] || defaultMock);
      } finally {
        setLoadingProperty(false);
      }
    };

    fetchPropertyDetails();
  }, [slug, language]);

  // Resolve a staff (admin/employee) profile to act as the support recipient.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, role")
        .in("role", ["admin", "employee"])
        .order("role")
        .limit(1)
        .maybeSingle();
      if (!cancelled) setSupportId(data?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch this tenant's message history with support, then keep it live.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, sent_at")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("sent_at", { ascending: true });
      if (!cancelled) {
        if (!error && data) setChatMessages(data as ChatMessage[]);
        setLoadingMessages(false);
      }
    }

    fetchMessages();

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          setChatMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new as ChatMessage]
          );
        }
      )
      .subscribe();

    // Safety-net poll in case realtime isn't enabled for this table yet.
    const pollId = setInterval(fetchMessages, 15000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(pollId);
    };
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading || !user || !supportId) return;

    setChatLoading(true);
    setChatInput("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id: supportId,
        body: text,
        channel: "chat_with_us",
        property_id: property?.id
      })
      .select("id, sender_id, recipient_id, body, sent_at")
      .single();

    if (!error && data) {
      setChatMessages((prev) => [...prev, data as ChatMessage]);
    } else {
      console.error("Failed to send support message:", error);
      setChatInput(text);
    }
    setChatLoading(false);
  };

  // Render Loader if Auth or Property Details are Loading
  if (authLoading || (loadingProperty && isPremium)) {
    return (
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
    );
  }

  // Double check protection check
  if (!isPremium) {
    return (
      <main className="max-w-[1280px] mx-auto px-5 md:px-[48px] py-16 flex flex-col items-center justify-center min-h-[600px] text-center gap-6">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner">
          <span className="material-symbols-outlined text-[48px]">lock</span>
        </div>
        <div>
          <h1 className="text-headline-lg font-bold text-primary mb-3">
            {t("objektChat_accessRestricted")}
          </h1>
          <p className="text-body-md text-on-surface-variant max-w-md">
            {t("objektChat_thisFeatureIsExclusivelyAvaila")}
          </p>
        </div>
        <button
          onClick={() => router.push("/preise")}
          className="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg"
        >
          {t("objektChat_unlockPremium")}
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-[1280px] mx-auto px-4 md:px-[48px] py-6 w-full flex-grow flex flex-col min-h-[calc(100vh-140px)]">
      {/* Back to Property Navigation Link */}
      <div className="mb-4">
        <Link
          href={`/objekt/${slug}`}
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-semibold text-[14px] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {t("objektChat_backToProperty")}
        </Link>
      </div>

      {/* Main Chat Area */}
      <div className="flex-grow border border-outline-variant/40 rounded-2xl overflow-hidden bg-surface-container-lowest shadow-lg flex flex-col h-[600px] md:h-[700px] relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Chat Header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between border-b border-outline-variant/20 shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-on-primary/10 rounded-full flex items-center justify-center text-on-primary relative">
              <span className="material-symbols-outlined text-[28px]">support_agent</span>
              <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-[#34a853] rounded-full border-2 border-primary ring-2 ring-primary-container" />
            </div>
            <div>
              <h3 className="font-bold text-on-primary text-[16px] leading-tight">
                Heimstadt Support Team
              </h3>
              <p className="text-[12px] text-on-primary/80 font-medium mt-0.5 flex items-center gap-1.5">
                {property ? property.title : (t("objektChat_questionsAboutProperty"))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-on-primary/10 text-on-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-[#34a853] rounded-full animate-pulse" />
            Online
          </div>
        </div>

        {/* Chat History View */}
        <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-surface-container-lowest max-h-[calc(100%-140px)] flex flex-col justify-start custom-scrollbar">
          {!loadingMessages && chatMessages.length === 0 && (
            <div className="self-center text-center max-w-sm py-8">
              <p className="text-body-md text-on-surface-variant">
                {t("objektChat_sendUsAMessageOurTeamWillReply")}
              </p>
            </div>
          )}

          {chatMessages.map((m) => {
            const isStaff = m.sender_id !== user?.id;
            const time = new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[80%] md:max-w-[70%] ${isStaff ? "self-start items-start animate-in slide-in-from-left-2 duration-300" : "self-end items-end animate-in slide-in-from-right-2 duration-300"}`}
              >
                <div
                  className={`p-4 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                    isStaff
                      ? "bg-surface-container-high text-on-surface rounded-tl-sm"
                      : "bg-primary text-on-primary rounded-tr-sm"
                  }`}
                >
                  {m.body}
                </div>
                <span className="text-[10px] text-on-surface-variant/60 font-semibold mt-1 px-1">
                  {time}
                </span>
              </div>
            );
          })}

          {chatLoading && (
            <div className="self-end flex flex-col items-end max-w-[80%] animate-pulse">
              <div className="bg-primary/60 p-4 rounded-2xl rounded-tr-sm flex items-center gap-1.5 h-[44px]">
                <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce delay-75" />
                <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce delay-150" />
                <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce delay-300" />
              </div>
              <span className="text-[10px] text-on-surface-variant/60 font-semibold mt-1 px-1">
                {t("objektChat_sending")}
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-outline-variant bg-surface-container-lowest flex gap-3 z-10 shadow-inner">
          <input
            id="chat-input-field"
            type="text"
            placeholder={t("objektChat_typeYourMessageHere")}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={chatLoading}
            autoComplete="off"
            className="flex-grow bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          <button
            id="chat-send-button"
            type="submit"
            disabled={!chatInput.trim() || chatLoading}
            className="bg-primary text-on-primary w-12 h-12 rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] transform rotate-[-30deg]">send</span>
          </button>
        </form>
      </div>
    </main>
  );
}
