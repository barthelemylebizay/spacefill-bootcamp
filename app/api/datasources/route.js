import supabase, { supabaseConfigured } from "@/lib/supabase";
import { mockStore, newId } from "@/lib/mock-data";

export async function GET() {
  if (!supabaseConfigured) return Response.json(mockStore.datasources);
  const { data, error } = await supabase.from("datasources").select("*").order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  if (!supabaseConfigured) {
    const item = { id: newId(), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    mockStore.datasources.push(item);
    return Response.json(item);
  }
  const { data, error } = await supabase.from("datasources").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
