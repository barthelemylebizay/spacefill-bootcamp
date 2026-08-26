import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Server-only — never exposed to the browser. This file is imported exclusively by
// route handlers under app/api/**, so using the service role key here is safe and
// required: with Row Level Security enabled, the anon key alone couldn't read/write
// tables like `clients` (which holds API tokens) from the server anymore.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isConfigured = url && anonKey && !url.includes("your_supabase");

let supabase;

if (isConfigured) {
  supabase = createClient(url, serviceRoleKey || anonKey);
} else {
  // Mock client — returns empty data until Supabase keys are configured
  const mockResponse = { data: [], error: null };
  const mockSingle = { data: null, error: null };
  const chain = {
    select: () => chain,
    insert: () => ({ ...chain, select: () => ({ single: () => Promise.resolve(mockSingle) }) }),
    update: () => ({ ...chain, select: () => ({ single: () => Promise.resolve(mockSingle) }) }),
    delete: () => Promise.resolve(mockResponse),
    eq: () => chain,
    order: () => Promise.resolve(mockResponse),
    single: () => Promise.resolve(mockSingle),
    then: (resolve) => resolve(mockResponse),
  };
  supabase = {
    from: () => chain,
  };
}

export default supabase;
export const supabaseConfigured = isConfigured;
