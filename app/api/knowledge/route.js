import supabase, { supabaseConfigured } from "@/lib/supabase";
import { mockStore, newId } from "@/lib/mock-data";

export async function GET() {
  if (!supabaseConfigured) {
    return Response.json(mockStore.knowledge_sources.sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  const { data, error } = await supabase.from("knowledge_sources").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  if (!supabaseConfigured) {
    const item = { id: newId(), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    mockStore.knowledge_sources.push(item);
    return Response.json(item);
  }
  const { data, error } = await supabase.from("knowledge_sources").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
