import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/utils/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const isMockSupabase =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock-project");

    // --- Security Check ---
    if (!isMockSupabase) {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized access: Missing token" }, { status: 401 });
      }

      const token = authHeader.split(" ")[1];
      const supabaseServer = getSupabaseServer();

      // Verify token with Supabase Auth
      const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized access: Invalid token" }, { status: 401 });
      }
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Google Maps API key is not configured" }, { status: 500 });
    }

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch from geocoding service" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Geocoding API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
