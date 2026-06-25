import { createClient } from "@supabase/supabase-js";

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "mock-anon-key"
);

const supabaseUrl = isConfigured
  ? process.env.NEXT_PUBLIC_SUPABASE_URL!
  : "https://mock-project.supabase.co";
const supabaseAnonKey = isConfigured
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  : "mock-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => isConfigured;
