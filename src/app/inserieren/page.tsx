"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import Footer from "@/components/layout/Footer";

export default function InserierenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { t, language } = useLanguage();
  const { user, profile, loading, signOut, session } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Load listing for editing if editId is provided
  useEffect(() => {
    if (!editId || !user) return;
    
    const loadListing = async () => {
      try {
        const { data: prop, error: propErr } = await supabase
          .from("properties")
          .select(`*, property_photos(*)`)
          .eq("id", editId)
          .single();

        if (propErr) throw propErr;

        if (prop) {
          setIsEditMode(true);
          setStep1({
            typ: prop.property_type || "apartment",
            strasse: prop.street || "",
            plz: prop.zip || "",
            stadt: prop.city || "",
          });
          setStep2({
            kaltmiete: String(prop.rent_cold || ""),
            nebenkosten: String(prop.rent_utilities || ""),
            heizkosten: String(prop.rent_heating || ""),
            flaeche: String(prop.size_sqm || ""),
            zimmer: String(prop.rooms || ""),
            etage: String(prop.floor || ""),
          });
          setStep4({
            titel: prop.title || "",
            beschreibung: prop.description || "",
            verfuegbar_ab: prop.available_from || "",
            kaution_monate: String(prop.deposit_months || "3"),
            moebliert: prop.furnished || false,
            min_monate: String(prop.min_stay_months || "1"),
            max_monate: String(prop.max_stay_months || ""),
          });
          setAmenities(prop.amenities || []);
          setSingleBeds(prop.single_beds || 0);
          setDoubleBeds(prop.double_beds || 0);
          setRentCalculation(prop.rent_calculation || "monthly");
          setSmokingAllowed(prop.smoking_allowed || false);
          setRegistrationPossible(prop.registration_possible || false);
          setSuitableForCouples(prop.suitable_for_couples || false);
          if (prop.lat && prop.lng) {
            setCoords({ lat: prop.lat, lng: prop.lng });
          }
          if (prop.property_photos) {
            const mappedPhotos = prop.property_photos.map((ph: any) => ({
              cdn_url: ph.cdn_url,
              key: ph.s3_key,
              is_primary: ph.is_primary,
            }));
            setUploadedPhotos(mappedPhotos);
          }
        }
      } catch (err) {
        console.error("Failed to load property details for edit:", err);
      }
    };

    loadListing();
  }, [editId, user]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const placeAutocompleteRef = useRef<HTMLDivElement>(null);

  const [step1, setStep1] = useState({ typ: "apartment", strasse: "", plz: "", stadt: "" });
  const [step2, setStep2] = useState({ kaltmiete: "", nebenkosten: "", heizkosten: "", flaeche: "", zimmer: "", etage: "" });
  const [step4, setStep4] = useState({ titel: "", beschreibung: "", verfuegbar_ab: "", kaution_monate: "3", moebliert: false, min_monate: "1", max_monate: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  // ── New filter-linked fields ────────────────────────────────────────────────
  const [singleBeds, setSingleBeds] = useState(0);
  const [doubleBeds, setDoubleBeds] = useState(0);
  const [rentCalculation, setRentCalculation] = useState("monthly");
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [registrationPossible, setRegistrationPossible] = useState(false);
  const [suitableForCouples, setSuitableForCouples] = useState(false);



  // Fetch landlord profile ID
  useEffect(() => {
    if (user && profile?.role === "landlord") {
      const getLandlordId = async () => {
        const { data } = await supabase
          .from("landlord_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setLandlordId(data.id);
        }
      };
      getLandlordId();
    }
  }, [user, profile]);

  // ── Load Google Maps + Places (modern async pattern) ──────────────
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || typeof window === "undefined") return;

    // If already loaded, init directly
    if ((window as any).google?.maps?.places?.PlaceAutocompleteElement) {
      setMapsLoaded(true);
      initAutocomplete();
      return;
    }

    // Use the recommended async callback loading pattern
    const callbackName = "__heimatMapsInit";
    (window as any)[callbackName] = () => {
      setMapsLoaded(true);
      initAutocomplete();
      delete (window as any)[callbackName];
    };

    if (!document.querySelector(`script[data-maps-key="${apiKey}"]`)) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=${callbackName}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.dataset.mapsKey = apiKey;
      document.head.appendChild(script);
    }
  }, []);

  // Ref handler for map interaction to avoid hook lifecycle issues
  const handleMapClickOrDragRef = useRef<((lat: number, lng: number) => void) | null>(null);
  handleMapClickOrDragRef.current = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    }

    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === "OK" && results[0]) {
        const comps = results[0].address_components || [];
        const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name || "";
        const street = `${get("route")} ${get("street_number")}`.trim();
        const plz = get("postal_code");
        const stadt = get("locality") || get("administrative_area_level_1");
        setStep1(prev => ({
          ...prev,
          strasse: street || prev.strasse,
          plz: plz || prev.plz,
          stadt: stadt || prev.stadt
        }));
      }
    });
  };

  // Init map once the map div mounts (step 1)
  useEffect(() => {
    if (step !== 1) {
      // Clear refs when moving away from step 1 so they reinitialize on mount
      googleMapRef.current = null;
      markerRef.current = null;
      autocompleteRef.current = null;
      return;
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !(window as any).google?.maps) return;
    if (!mapRef.current || googleMapRef.current) return;
    const center = coords || { lat: 52.52, lng: 13.405 }; // Default: Berlin
    const map = new (window as any).google.maps.Map(mapRef.current, {
      center,
      zoom: coords ? 16 : 11,
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
    });
    googleMapRef.current = map;

    // Click on map to place/move the marker
    map.addListener("click", (e: any) => {
      if (e.latLng) {
        handleMapClickOrDragRef.current?.(e.latLng.lat(), e.latLng.lng());
      }
    });

    if (coords) {
      const marker = new (window as any).google.maps.Marker({
        position: coords,
        map,
        draggable: true,
      });
      markerRef.current = marker;
      marker.addListener("dragend", (e: any) => {
        if (e.latLng) {
          handleMapClickOrDragRef.current?.(e.latLng.lat(), e.latLng.lng());
        }
      });
    }
  }, [step, mapsLoaded]);

  // Re-init PlaceAutocompleteElement when navigating back to step 1 if Maps already loaded
  useEffect(() => {
    if (step !== 1) return;
    if (!(window as any).google?.maps?.places?.PlaceAutocompleteElement) return;
    initAutocomplete();
  }, [step, mapsLoaded]);

  const initAutocomplete = () => {
    const container = placeAutocompleteRef.current;
    if (!container || !(window as any).google?.maps?.places) return;
    
    // Prevent duplicate initialization in the current container DOM
    if (container.querySelector("#place-autocomplete-element")) return;

    // Clear any previous elements in the container just in case
    container.innerHTML = "";

    // Use the modern PlaceAutocompleteElement (recommended over deprecated Autocomplete)
    const pac = new (window as any).google.maps.places.PlaceAutocompleteElement({
      types: ["address"],
      componentRestrictions: { country: "de" },
    });
    pac.id = "place-autocomplete-element";
    // Style the web component to fit the form
    pac.style.cssText = "width:100%;display:block;";
    container.appendChild(pac);
    autocompleteRef.current = pac;

    pac.addEventListener("gmp-placeselect", async (event: any) => {
      const place = event.place;
      // Fetch address components and geometry
      await place.fetchFields({ fields: ["addressComponents", "location", "formattedAddress"] });
      const comps = place.addressComponents || [];
      const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.longText || "";
      const street = `${get("route")} ${get("street_number")}`.trim();
      const plz = get("postal_code");
      const stadt = get("locality") || get("administrative_area_level_1");
      setStep1(prev => ({ ...prev, strasse: street || prev.strasse, plz: plz || prev.plz, stadt: stadt || prev.stadt }));
      const lat = place.location?.lat() ?? null;
      const lng = place.location?.lng() ?? null;
      if (lat !== null && lng !== null) {
        setCoords({ lat, lng });
        // Update map
        if (googleMapRef.current) {
          googleMapRef.current.setCenter({ lat, lng });
          googleMapRef.current.setZoom(16);
          if (markerRef.current) {
            markerRef.current.setPosition({ lat, lng });
          } else {
            const marker = new (window as any).google.maps.Marker({
              position: { lat, lng },
              map: googleMapRef.current,
              draggable: true,
            });
            markerRef.current = marker;
            marker.addListener("dragend", (e: any) => {
              if (e.latLng) {
                handleMapClickOrDragRef.current?.(e.latLng.lat(), e.latLng.lng());
              }
            });
          }
        }
      }
    });
  };

  // Geocode address when Next button is hit on step 1 (fallback if autocomplete not used)
  const geocodeAddress = async (): Promise<{ lat: number; lng: number } | null> => {
    if (coords) return coords;
    const address = `${step1.strasse}, ${step1.plz} ${step1.stadt}`;
    setGeocoding(true);
    try {
      const token = session?.access_token || "";
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.results?.[0]?.geometry?.location) {
        const { lat, lng } = data.results[0].geometry.location;
        setCoords({ lat, lng });
        return { lat, lng };
      }
    } catch (e) {
      console.warn("Geocoding failed:", e);
    } finally {
      setGeocoding(false);
    }
    return null;
  };

  const stepsList = [
    { num: 1, label: t("indicatorBasis"), icon: "location_on" },
    { num: 2, label: t("indicatorPrice"), icon: "euro_symbol" },
    { num: 3, label: t("indicatorPhotos"), icon: "add_a_photo" },
    { num: 4, label: t("indicatorDesc"), icon: "description" },
    { num: 5, label: language === "de" ? "Details" : "Details", icon: "tune" },
  ];

  // Use consistent amenity IDs (matching search filters)
  const amenityOpts = [
    { id: "balcony",          label: language === "de" ? "Balkon"           : "Balcony" },
    { id: "kitchen",          label: language === "de" ? "Einbauküche"      : "Fitted Kitchen" },
    { id: "elevator",         label: language === "de" ? "Aufzug"           : "Elevator" },
    { id: "parking",          label: language === "de" ? "Parkplatz"        : "Parking" },
    { id: "pets",             label: language === "de" ? "Haustiere erlaubt" : "Pets Allowed" },
    { id: "garden",           label: language === "de" ? "Garten"           : "Garden" },
    { id: "cellar",           label: language === "de" ? "Keller"           : "Cellar" },
    { id: "air_conditioning", label: language === "de" ? "Klimaanlage"      : "Air Conditioning" },
    { id: "wifi",             label: "WiFi" },
    { id: "dishwasher",       label: language === "de" ? "Geschirrspüler"   : "Dishwasher" },
    { id: "washing_machine",  label: language === "de" ? "Waschmaschine"    : "Washing Machine" },
    { id: "tv",               label: language === "de" ? "Fernseher"        : "TV" },
    { id: "laundry",          label: language === "de" ? "Waschraum"        : "Laundry Room" },
    { id: "wheelchair",       label: language === "de" ? "Barrierefrei"     : "Wheelchair Access" },
  ];

  const progressPct = ((step - 1) / (stepsList.length - 1)) * 100;

  const toggleAmenity = (id: string) =>
    setAmenities((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
  };

  const uploadFiles = async (files: File[]) => {
    if (!user || !landlordId) {
      alert("Error: Landlord profile not loaded yet.");
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        // 1. Upload file directly via server-side endpoint (bypasses direct browser-to-GCS CORS issues)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("landlordId", landlordId);

        const res = await fetch("/api/upload/photo", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to upload photo");

        const { key, cdnUrl } = data;

        // Add uploaded photo state
        setUploadedPhotos((prev) => [
          ...prev,
          {
            cdn_url: cdnUrl,
            key: key,
            is_primary: prev.length === 0, // Set first photo as primary
          },
        ]);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("File upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx: number) => {
    setUploadedPhotos((prev) => {
      const copy = prev.filter((_, i) => i !== idx);
      if (copy.length > 0 && !copy.some((p) => p.is_primary)) {
        copy[0].is_primary = true;
      }
      return copy;
    });
  };

  const goNext = async () => {
    if (step < stepsList.length) {
      // On step 1, try geocoding if coords not already set
      if (step === 1 && !coords) {
        await geocodeAddress();
      }
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Step 5 Submit: Publish or Update Listing
    if (!landlordId) {
      alert("Error: Landlord profile not loaded.");
      return;
    }

    setUploading(true);
    try {
      if (isEditMode && editId) {
        // 1. Update existing property parameters in DB
        const { error: propErr } = await supabase
          .from("properties")
          .update({
            title: step4.titel,
            description: step4.beschreibung,
            street: step1.strasse,
            city: step1.stadt,
            zip: step1.plz,
            property_type: step1.typ,
            size_sqm: parseFloat(step2.flaeche),
            rooms: parseFloat(step2.zimmer),
            rent_cold: parseFloat(step2.kaltmiete),
            rent_utilities: parseFloat(step2.nebenkosten || "0"),
            rent_heating: parseFloat(step2.heizkosten || "0"),
            deposit_months: parseInt(step4.kaution_monate || "3"),
            available_from: step4.verfuegbar_ab || new Date().toISOString().split("T")[0],
            furnished: step4.moebliert,
            pets_allowed: amenities.includes("pets"),
            amenities: amenities,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            floor: step2.etage ? parseInt(step2.etage) : null,
            min_stay_months: step4.min_monate ? parseInt(step4.min_monate) : 1,
            max_stay_months: step4.max_monate ? parseInt(step4.max_monate) : null,
            single_beds: singleBeds,
            double_beds: doubleBeds,
            rent_calculation: rentCalculation,
            smoking_allowed: smokingAllowed,
            registration_possible: registrationPossible,
            suitable_for_couples: suitableForCouples,
          })
          .eq("id", editId);

        if (propErr) throw propErr;

        // 2. Delete existing photo references and insert new ones
        await supabase
          .from("property_photos")
          .delete()
          .eq("property_id", editId);

        if (uploadedPhotos.length > 0) {
          const photoRows = uploadedPhotos.map((p, idx) => ({
            property_id: editId,
            s3_key: p.key,
            cdn_url: p.cdn_url,
            order_index: idx,
            is_primary: p.is_primary,
            alt_text: step4.titel
          }));

          const { error: photoErr } = await supabase
            .from("property_photos")
            .insert(photoRows);

          if (photoErr) throw photoErr;
        }

        alert(
          language === "de"
            ? "Ihr Inserat wurde erfolgreich aktualisiert."
            : "Your listing has been successfully updated."
        );
        router.push("/dashboard/landlord");
      } else {
        // Create new property in DB
        const { data: prop, error: propErr } = await supabase
          .from("properties")
          .insert({
            landlord_id: landlordId,
            title: step4.titel,
            description: step4.beschreibung,
            street: step1.strasse,
            city: step1.stadt,
            zip: step1.plz,
            property_type: step1.typ,
            size_sqm: parseFloat(step2.flaeche),
            rooms: parseFloat(step2.zimmer),
            rent_cold: parseFloat(step2.kaltmiete),
            rent_utilities: parseFloat(step2.nebenkosten || "0"),
            rent_heating: parseFloat(step2.heizkosten || "0"),
            deposit_months: parseInt(step4.kaution_monate || "3"),
            available_from: step4.verfuegbar_ab || new Date().toISOString().split("T")[0],
            furnished: step4.moebliert,
            pets_allowed: amenities.includes("pets"),
            amenities: amenities,
            status: "active",
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            floor: step2.etage ? parseInt(step2.etage) : null,
            min_stay_months: step4.min_monate ? parseInt(step4.min_monate) : 1,
            max_stay_months: step4.max_monate ? parseInt(step4.max_monate) : null,
            single_beds: singleBeds,
            double_beds: doubleBeds,
            rent_calculation: rentCalculation,
            smoking_allowed: smokingAllowed,
            registration_possible: registrationPossible,
            suitable_for_couples: suitableForCouples,
          })
          .select()
          .single();

        if (propErr) throw propErr;

        // 2. Write photo parameters to DB
        if (uploadedPhotos.length > 0) {
          const photoRows = uploadedPhotos.map((p, idx) => ({
            property_id: prop.id,
            s3_key: p.key,
            cdn_url: p.cdn_url,
            order_index: idx,
            is_primary: p.is_primary,
            alt_text: step4.titel
          }));

          const { error: photoErr } = await supabase
            .from("property_photos")
            .insert(photoRows);

          if (photoErr) throw photoErr;
        }

        alert(
          language === "de"
            ? "Vielen Dank! Ihr Inserat wurde erfolgreich veröffentlicht."
            : "Thank you! Your listing has been successfully published."
        );
        router.push("/dashboard/landlord");
      }
    } catch (err: any) {
      console.error("Error publishing property:", err);
      alert("Error publishing property: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const goPrev = () => {
    if (step > 1) setStep(step - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
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

  if (!loading && (!user || (profile && profile.role !== "landlord"))) {
    const isNotLoggedIn = !user;
    return (
      <>
        <div className="flex-grow flex items-center justify-center min-h-[600px] px-5 py-12 bg-[#f8f9ff]">
          <div className="max-w-md w-full bg-white/90 backdrop-blur-md border border-outline-variant rounded-3xl p-8 md:p-10 shadow-xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Lock/Warning Icon */}
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isNotLoggedIn ? "lock" : "gavel"}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-headline-md font-bold text-primary">
                {isNotLoggedIn
                  ? (t("authRequired"))
                  : (t("landlordsOnly"))}
              </h1>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                {isNotLoggedIn
                  ? t("pleaseLoginLandlord")
                  : t("tenantRestricted")}
              </p>
            </div>

            {/* Explanatory Box */}
            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60 text-left space-y-3">
              <h4 className="text-label-sm text-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#f07d00] text-[18px]">info</span>
                <span>{t("whatToDo")}</span>
              </h4>
              <ul className="text-[13px] text-on-surface-variant space-y-2">
                {isNotLoggedIn ? (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check_circle</span>
                      <span>
                        {language === "de"
                          ? "Melden Sie sich an, um den Entwurf oder Ihre Veröffentlichungen fortzusetzen."
                          : "Log in to continue editing draft publications or manage your listings."}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check_circle</span>
                      <span>
                        {t("registerLandlordFree")}
                      </span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check_circle</span>
                      <span>
                        {t("logoutRegisterLandlord")}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">check_circle</span>
                      <span>
                        {language === "de"
                          ? "Wenn Sie eine Wohnung mieten wollen, können Sie unsere Suche nutzen."
                          : "If you are looking to rent, you can continue searching for properties."}
                      </span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            {isNotLoggedIn ? (
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => router.push("/auth/login?role=landlord&redirect=/inserieren")}
                  className="w-full bg-primary text-on-primary py-3.5 rounded-xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  {t("logInLandlord")}
                </button>

                <button
                  onClick={() => router.push("/auth/register?role=landlord&redirect=/inserieren")}
                  className="w-full bg-surface-container-high text-primary py-3.5 rounded-xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all border border-outline-variant flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                  {t("registerLandlord")}
                </button>

                <button
                  onClick={() => router.push("/suche")}
                  className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-xl text-label-md font-bold hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                  {t("searchProperties")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => router.push("/dashboard/tenant")}
                  className="w-full bg-primary text-on-primary py-3.5 rounded-xl text-label-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
                  {t("goTenantDashboard")}
                </button>
                
                <button
                  onClick={() => router.push("/suche")}
                  className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-xl text-label-md font-bold hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                  {t("searchProperties")}
                </button>

                <div className="border-t border-outline-variant/60 my-2 pt-4">
                  <button
                    onClick={async () => {
                      await signOut();
                      router.push("/auth/login?role=landlord");
                    }}
                    className="text-primary hover:underline text-[13px] font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    {t("switchAccount")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="max-w-[1280px] mx-auto px-5 md:px-[48px] py-12 w-full">
        {/* ── Wizard Header ────────────────────────── */}
        <section className="mb-12 text-center max-w-3xl mx-auto">
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-primary mb-4">
            {t("wizardTitle")}
          </h1>
          <p className="text-on-surface-variant text-body-md mb-8">
            {t("wizardSubtitle")}
          </p>

          {/* Step Indicators */}
          <div className="relative flex justify-between items-center w-full max-w-md mx-auto mb-3">
            {/* Track */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-outline-variant -z-10 -translate-y-1/2" />
            {/* Progress */}
            <div
              className="absolute top-1/2 left-0 h-[2px] bg-primary -z-10 -translate-y-1/2 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
            {stepsList.map(({ num }) => {
              const done = num < step;
              const active = num === step;
              return (
                <div key={num} className="flex flex-col items-center gap-2" id={`step-indicator-${num}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[14px] border-4 border-background transition-all ${
                      done
                        ? "bg-primary text-on-primary"
                        : active
                        ? "bg-primary text-on-primary shadow-[0_0_0_4px_rgba(0,32,70,0.1)]"
                        : "bg-outline-variant text-on-surface-variant"
                    }`}
                  >
                    {done ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      num
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step Labels */}
          <div className="flex justify-between max-w-md mx-auto px-1">
            {stepsList.map(({ num, label }) => (
              <span
                key={num}
                className={`text-[12px] font-semibold transition-colors ${
                  num <= step ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Step Cards ──────────────────────────── */}
        <div className="max-w-4xl mx-auto">
          <form id="wizard-form" onSubmit={(e) => e.preventDefault()}>
            {/* Step 1: Basisdaten */}
            {step === 1 && (
              <div id="step-1" className="glass-card rounded-xl p-6 md:p-8 shadow-sm border border-outline-variant">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-primary text-[32px]">location_on</span>
                  <h2 className="text-headline-md">{t("step1Title")}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
                  <div className="space-y-2">
                    <label className="text-label-md text-on-surface font-medium">{t("propertyType")}</label>
                    <select
                      id="step1-typ"
                      value={step1.typ}
                      onChange={(e) => setStep1({ ...step1, typ: e.target.value })}
                      className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                    >
                      <option value="apartment">{t("apartment")}</option>
                      <option value="house">{t("house")}</option>
                      <option value="studio">{t("studio")}</option>
                      <option value="sharedRoom">{t("sharedRoom")}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md text-on-surface font-medium">{t("streetNumber")}</label>
                    {/* PlaceAutocompleteElement container — the web component is injected here by initAutocomplete */}
                    <div
                      ref={placeAutocompleteRef}
                      id="place-autocomplete-container"
                      className="w-full [&>*]:w-full [&_gmp-placeautocomplete]:w-full"
                    />
                    {/* Manual override input (visible only if PlaceAutocomplete not injected yet) */}
                    {!autocompleteRef.current && (
                      <input
                        id="step1-strasse"
                        type="text"
                        placeholder="Beispielstraße 12"
                        value={step1.strasse}
                        onChange={(e) => setStep1({ ...step1, strasse: e.target.value })}
                        className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                      />
                    )}
                    {/* Hidden input keeps the state value accessible after selection */}
                    <input type="hidden" id="step1-strasse" value={step1.strasse} readOnly />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md text-on-surface font-medium">{t("zipCode")}</label>
                    <input
                      id="step1-plz"
                      type="text"
                      placeholder="10115"
                      value={step1.plz}
                      onChange={(e) => setStep1({ ...step1, plz: e.target.value })}
                      className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-label-md text-on-surface font-medium">{t("city")}</label>
                    <input
                      id="step1-stadt"
                      type="text"
                      placeholder="Berlin"
                      value={step1.stadt}
                      onChange={(e) => setStep1({ ...step1, stadt: e.target.value })}
                      className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                    />
                  </div>
                </div>

                {/* Map — Google Maps or fallback placeholder */}
                <div className="mt-8 rounded-xl overflow-hidden relative border border-outline-variant shadow-sm" style={{ height: "320px" }}>
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                    <div ref={mapRef} className="w-full h-full" id="google-map-container" />
                  ) : (
                    // Fallback when no API key configured
                    <div className="w-full h-full bg-surface-container flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[48px] opacity-40">map</span>
                      <p className="text-[13px] font-semibold opacity-60">
                        {t("googleMapsKeyRequired")}
                      </p>
                      <p className="text-[11px] opacity-40">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
                    </div>
                  )}
                  {coords && (
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow text-[11px] font-semibold text-primary border border-outline-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-[#f07d00]">location_on</span>
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </div>
                  )}
                  {geocoding && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
                        <div className="absolute w-8 h-8 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
                        <div className="absolute w-10 h-10 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Preis & Maße */}
            {step === 2 && (
              <div id="step-2" className="glass-card rounded-xl p-6 md:p-8 shadow-sm border border-outline-variant">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-primary text-[32px]">euro_symbol</span>
                  <h2 className="text-headline-md">{t("step2Title")}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
                  {[
                    { id: "kaltmiete", label: `${t("coldRent")} (€)`, placeholder: "0.00", key: "kaltmiete" },
                    { id: "nebenkosten", label: `${t("utilities")} (€)`, placeholder: "0.00", key: "nebenkosten" },
                    { id: "heizkosten", label: `${t("heatingCosts")} (€)`, placeholder: "0.00", key: "heizkosten" },
                    { id: "flaeche", label: `${t("livingArea")} (m²)`, placeholder: "z.B. 75", key: "flaeche" },
                    { id: "zimmer", label: `${t("rooms")}`, placeholder: "z.B. 3", key: "zimmer" },
                    { id: "etage", label: `${t("floor")}`, placeholder: "z.B. 2", key: "etage" },
                  ].map(({ id, label, placeholder, key }) => (
                    <div key={id} className="space-y-2">
                      <label className="text-label-md text-on-surface font-medium">{label}</label>
                      <input
                        id={`step2-${id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder={placeholder}
                        value={step2[key as keyof typeof step2]}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            setStep2({ ...step2, [key]: val });
                          }
                        }}
                        className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                      />
                    </div>
                  ))}
                </div>

                {/* Market insight */}
                <div className="mt-8 p-6 bg-surface-container-low rounded-xl flex items-center gap-6 border border-outline-variant">
                  <span className="material-symbols-outlined text-primary text-[40px] flex-shrink-0">analytics</span>
                  <div>
                    <p className="text-label-md text-primary font-bold">{t("marketAnalysis")}</p>
                    <p className="text-body-md text-on-surface-variant mt-0.5">
                      {t("marketAnalysisDesc")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Fotos */}
            {step === 3 && (
              <div id="step-3" className="glass-card rounded-xl p-6 md:p-8 shadow-sm border border-outline-variant">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-primary text-[32px]">add_a_photo</span>
                  <h2 className="text-headline-md">{t("step3Title")}</h2>
                </div>

                {/* Drop zone */}
                <div
                  id="dropzone"
                  onClick={handleDropzoneClick}
                  className="border-2 border-dashed border-outline rounded-xl p-10 md:p-12 text-center bg-surface-container-lowest hover:bg-surface-container transition-colors group cursor-pointer relative"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  {uploading ? (
                    <div className="py-6 flex flex-col items-center gap-3">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
                        <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
                        <div className="absolute w-12 h-12 bg-[#002046]/5 rounded-full blur-md animate-pulse" />
                      </div>
                      <p className="text-body-md text-primary font-bold">
                        {t("uploadingImages")}
                      </p>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[64px] text-outline-variant group-hover:text-primary mb-4 transition-colors block">
                        cloud_upload
                      </span>
                      <p className="text-headline-md mb-2">{t("dragDropText")}</p>
                      <p className="text-on-surface-variant text-body-md mb-6">
                        {t("dragDropSubtext")}
                      </p>
                      <button
                        id="btn-select-files"
                        type="button"
                        className="bg-primary text-on-primary px-8 py-3 rounded-lg text-label-md transition-all active:scale-95 font-semibold cursor-pointer"
                      >
                        {t("selectFilesBtn")}
                      </button>
                    </>
                  )}
                </div>

                {/* Preview grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  {uploadedPhotos.map((p, i) => (
                    <div key={i} className="aspect-video bg-surface-container rounded-lg relative overflow-hidden group border border-outline-variant">
                      <img src={p.cdn_url} alt="Uploaded Room" className="w-full h-full object-cover" />
                      {p.is_primary && (
                        <div className="absolute bottom-2 left-2 bg-primary text-on-primary text-[10px] px-2 py-0.5 rounded font-bold uppercase shadow">
                          {t("primaryPhoto")}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer animate-fade-in"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                  {[0, 1].map((i) => (
                    <div
                      key={`empty-${i}`}
                      onClick={handleDropzoneClick}
                      className="aspect-video bg-surface-container border-2 border-dashed border-outline-variant rounded-lg flex items-center justify-center text-outline-variant cursor-pointer hover:border-primary hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[28px]">add</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Beschreibung */}
            {step === 4 && (
              <div id="step-4" className="glass-card rounded-xl p-6 md:p-8 shadow-sm border border-outline-variant">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-primary text-[32px]">description</span>
                  <h2 className="text-headline-md">{t("step4Title")}</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-label-md text-on-surface font-medium">{t("listingTitleLabel")}</label>
                    <input
                      id="step4-titel"
                      type="text"
                      placeholder={t("listingTitlePlaceholder")}
                      value={step4.titel}
                      onChange={(e) => setStep4({ ...step4, titel: e.target.value })}
                      className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-label-md text-on-surface font-medium">{t("descriptionLabel")}</label>
                    <textarea
                      id="step4-beschreibung"
                      rows={6}
                      placeholder={t("descriptionPlaceholder")}
                      value={step4.beschreibung}
                      onChange={(e) => setStep4({ ...step4, beschreibung: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none text-[16px]"
                    />
                  </div>

                  {/* Amenity checkboxes */}
                  <div>
                    <p className="text-label-md text-on-surface font-medium mb-3">{t("amenitiesLabel")}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {amenityOpts.map(({ id, label }) => (
                        <label
                          key={id}
                          htmlFor={`amenity-${id}`}
                          className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                            amenities.includes(id)
                              ? "border-primary bg-primary-fixed"
                              : "border-outline-variant hover:bg-surface-container-low"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`amenity-${id}`}
                            checked={amenities.includes(id)}
                            onChange={() => toggleAmenity(id)}
                            className="w-5 h-5 rounded accent-primary"
                          />
                          <span className="text-label-md">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Additional Details */}
            {step === 5 && (
              <div id="step-5" className="glass-card rounded-xl p-6 md:p-8 shadow-sm border border-outline-variant">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-symbols-outlined text-primary text-[32px]">tune</span>
                  <h2 className="text-headline-md">{t("additionalDetails")}</h2>
                </div>

                <div className="space-y-6">
                  {/* Available From */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-label-md text-on-surface font-medium">
                        {t("availableFrom")}
                      </label>
                      <input
                        id="step5-verfuegbar"
                        type="date"
                        value={step4.verfuegbar_ab}
                        onChange={(e) => setStep4({ ...step4, verfuegbar_ab: e.target.value })}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-label-md text-on-surface font-medium">
                        {t("depositMonths")}
                      </label>
                      <select
                        id="step5-kaution"
                        value={step4.kaution_monate}
                        onChange={(e) => setStep4({ ...step4, kaution_monate: e.target.value })}
                        className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                      >
                        <option value="1">1 {language === "de" ? "Monat" : "month"}</option>
                        <option value="2">2 {language === "de" ? "Monate" : "months"}</option>
                        <option value="3">3 {language === "de" ? "Monate" : "months"}</option>
                        <option value="4">4 {language === "de" ? "Monate" : "months"}</option>
                        <option value="6">6 {language === "de" ? "Monate" : "months"}</option>
                      </select>
                    </div>
                  </div>

                  {/* Min / Max Stay */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-label-md text-on-surface font-medium">
                        {t("minimumStay")}
                      </label>
                      <input
                        id="step5-min-monate"
                        type="number"
                        min="1"
                        placeholder="z.B. 3"
                        value={step4.min_monate}
                        onChange={(e) => setStep4({ ...step4, min_monate: e.target.value })}
                        className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-label-md text-on-surface font-medium">
                        {t("maximumStay")}
                      </label>
                      <input
                        id="step5-max-monate"
                        type="number"
                        min="1"
                        placeholder={t("unlimited")}
                        value={step4.max_monate}
                        onChange={(e) => setStep4({ ...step4, max_monate: e.target.value })}
                        className="w-full h-14 bg-surface border border-outline-variant rounded-lg px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-[16px]"
                      />
                    </div>
                  </div>

                  {/* Furnished toggle */}
                  <div className="flex items-center justify-between p-5 bg-surface-container-low rounded-xl border border-outline-variant">
                    <div>
                      <h4 className="text-label-md font-bold text-on-surface">
                        {language === "de" ? "Möbliert" : "Furnished"}
                      </h4>
                      <p className="text-[12px] text-on-surface-variant mt-0.5">
                        {t("isFurnishedQuestion")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep4(p => ({ ...p, moebliert: !p.moebliert }))}
                      className={`w-12 h-7 rounded-full transition-colors duration-200 relative flex items-center px-0.5 cursor-pointer ${
                        step4.moebliert ? "bg-primary" : "bg-outline-variant"
                      }`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${step4.moebliert ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* ── Beds ── */}
                  <div className="space-y-3">
                    <p className="text-label-md text-on-surface font-medium">
                      {language === "de" ? "Betten" : "Beds"}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Single beds */}
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                        <div>
                          <h4 className="text-label-md font-semibold text-on-surface">{language === "de" ? "Einzelbetten" : "Single Beds"}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setSingleBeds(c => Math.max(0, c - 1))}
                            disabled={singleBeds <= 0}
                            className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-40">
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                          </button>
                          <span className="w-6 text-center text-label-md font-bold">{singleBeds}</span>
                          <button type="button" onClick={() => setSingleBeds(c => c + 1)}
                            className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>
                      </div>
                      {/* Double beds */}
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                        <div>
                          <h4 className="text-label-md font-semibold text-on-surface">{language === "de" ? "Doppelbetten" : "Double Beds"}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setDoubleBeds(c => Math.max(0, c - 1))}
                            disabled={doubleBeds <= 0}
                            className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-40">
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                          </button>
                          <span className="w-6 text-center text-label-md font-bold">{doubleBeds}</span>
                          <button type="button" onClick={() => setDoubleBeds(c => c + 1)}
                            className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── How rent is calculated ── */}
                  <div className="space-y-3">
                    <p className="text-label-md text-on-surface font-medium">
                      {language === "de" ? "Mietberechnung" : "How Rent is Calculated"}
                    </p>
                    <p className="text-[12px] text-on-surface-variant -mt-1">
                      {language === "de"
                        ? "Bestimmt die Abrechnung im ersten und letzten Monat."
                        : "Determines billing in the first and last months of the stay."}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { value: "monthly", label: language === "de" ? "Monatlich" : "Monthly" },
                        { value: "biweekly", label: language === "de" ? "Alle 2 Wochen" : "Every 2 Weeks" },
                        { value: "daily", label: language === "de" ? "Täglich" : "Daily" },
                      ].map(opt => (
                        <label key={opt.value}
                          className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                            rentCalculation === opt.value
                              ? "border-primary bg-primary-fixed"
                              : "border-outline-variant hover:bg-surface-container-low"
                          }`}>
                          <input
                            type="radio"
                            name="rentCalculation"
                            value={opt.value}
                            checked={rentCalculation === opt.value}
                            onChange={() => setRentCalculation(opt.value)}
                            className="w-4 h-4 accent-primary"
                          />
                          <span className="text-label-md">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* ── Smoking / Registration / Couples ── */}
                  <div className="space-y-3">
                    <p className="text-label-md text-on-surface font-medium">
                      {language === "de" ? "Regelungen" : "Rules & Policies"}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Smoking */}
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">smoking_rooms</span>
                          <h4 className="text-label-md font-semibold text-on-surface">
                            {language === "de" ? "Rauchen erlaubt" : "Smoking Allowed"}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSmokingAllowed(v => !v)}
                          className={`w-12 h-7 rounded-full transition-colors duration-200 relative flex items-center px-0.5 cursor-pointer ${
                            smokingAllowed ? "bg-primary" : "bg-outline-variant"
                          }`}
                        >
                          <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${smokingAllowed ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>

                      {/* Registration */}
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">how_to_reg</span>
                          <h4 className="text-label-md font-semibold text-on-surface">
                            {language === "de" ? "Anmeldung möglich" : "Registration Possible"}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRegistrationPossible(v => !v)}
                          className={`w-12 h-7 rounded-full transition-colors duration-200 relative flex items-center px-0.5 cursor-pointer ${
                            registrationPossible ? "bg-primary" : "bg-outline-variant"
                          }`}
                        >
                          <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${registrationPossible ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>

                      {/* Couples */}
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">favorite</span>
                          <h4 className="text-label-md font-semibold text-on-surface">
                            {language === "de" ? "Paare willkommen" : "Couples Welcome"}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSuitableForCouples(v => !v)}
                          className={`w-12 h-7 rounded-full transition-colors duration-200 relative flex items-center px-0.5 cursor-pointer ${
                            suitableForCouples ? "bg-primary" : "bg-outline-variant"
                          }`}
                        >
                          <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${suitableForCouples ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Summary card before publish */}
                  <div className="p-5 bg-primary/5 rounded-xl border border-primary/20">
                    <h4 className="text-label-md font-bold text-primary flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[18px]">checklist</span>
                      {t("listingSummary")}
                    </h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[13px]">
                      <span className="text-on-surface-variant">{language === "de" ? "Typ" : "Type"}:</span>
                      <span className="font-semibold text-primary capitalize">{step1.typ}</span>
                      <span className="text-on-surface-variant">{language === "de" ? "Adresse" : "Address"}:</span>
                      <span className="font-semibold text-primary">{step1.strasse}, {step1.plz} {step1.stadt}</span>
                      <span className="text-on-surface-variant">{t("coldRent")}:</span>
                      <span className="font-semibold text-primary">{step2.kaltmiete} €</span>
                      <span className="text-on-surface-variant">{t("area")}:</span>
                      <span className="font-semibold text-primary">{step2.flaeche} m²</span>
                      <span className="text-on-surface-variant">{t("rooms")}:</span>
                      <span className="font-semibold text-primary">{step2.zimmer}</span>
                      {coords && (
                        <>
                          <span className="text-on-surface-variant">{"GPS"}:</span>
                          <span className="font-semibold text-[#f07d00] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">my_location</span>
                            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation Controls ─────────────── */}
            <div className="flex justify-between items-center mt-10 pt-8 border-t border-outline-variant flex-wrap gap-4">
              <button
                id="btn-prev"
                type="button"
                onClick={goPrev}
                className={`flex items-center gap-2 text-primary text-label-md px-6 py-3 rounded-lg hover:bg-surface-container transition-all active:scale-95 font-medium cursor-pointer ${
                  step === 1 ? "invisible" : "visible"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                {t("backBtn")}
              </button>

              <div className="flex gap-4">
                <button
                  id="btn-entwurf"
                  type="button"
                  className="hidden md:block text-on-surface-variant text-label-md px-6 py-3 rounded-lg hover:bg-surface-container transition-all font-medium cursor-pointer"
                >
                  {t("saveDraftBtn")}
                </button>
                <button
                  id="btn-next"
                  type="button"
                  onClick={goNext}
                  disabled={uploading}
                  className={`flex items-center gap-2 text-label-md px-8 py-3 rounded-lg hover:opacity-90 shadow-lg transition-all active:scale-95 font-semibold cursor-pointer disabled:opacity-50 ${
                    step === stepsList.length
                      ? "bg-secondary text-on-secondary shadow-secondary/20"
                      : "bg-primary text-on-primary shadow-primary/20"
                  }`}
                >
                  {uploading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : null}
                  {step === stepsList.length ? (
                    <>
                      {t("publishBtn")}
                      <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                    </>
                  ) : (
                    <>
                      {t("nextBtn")}
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
