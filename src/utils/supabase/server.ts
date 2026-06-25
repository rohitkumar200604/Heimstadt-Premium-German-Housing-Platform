import { createClient } from "@supabase/supabase-js";

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://mock-project.supabase.co" &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== "mock-service-key"
);

export const getSupabaseServer = () => {
  const supabaseUrl = isConfigured
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!
    : "https://mock-project.supabase.co";
  const supabaseServiceKey = isConfigured
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : "mock-service-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};
