import supabase, { supabaseConfigured } from "@/lib/supabase";
import { mockStore, newId } from "@/lib/mock-data";

export async function GET() {
  if (!supabaseConfigured) {
    return Response.json([...mockStore.feedbacks].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  const { data, error } = await supabase.from("feedbacks").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  if (!supabaseConfigured) {
    const item = { id: newId(), ...body, status: "new", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    mockStore.feedbacks.push(item);
    return Response.json(item);
  }
  const { data, error } = await supabase.from("feedbacks").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
