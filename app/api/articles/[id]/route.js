import supabase, { supabaseConfigured } from "@/lib/supabase";
import { mockStore } from "@/lib/mock-data";

export async function GET(request, { params }) {
  const { id } = await params;
  if (!supabaseConfigured) {
    const item = mockStore.generated_articles.find(a => a.id === id);
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(item);
  }
  const { data, error } = await supabase.from("generated_articles").select("*").eq("id", id).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  if (!supabaseConfigured) {
    const idx = mockStore.generated_articles.findIndex(a => a.id === id);
    if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
    mockStore.generated_articles[idx] = { ...mockStore.generated_articles[idx], ...body, updated_at: new Date().toISOString() };
    return Response.json(mockStore.generated_articles[idx]);
  }
  const { data, error } = await supabase.from("generated_articles").update(body).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!supabaseConfigured) {
    const idx = mockStore.generated_articles.findIndex(a => a.id === id);
    if (idx !== -1) mockStore.generated_articles.splice(idx, 1);
    return Response.json({ ok: true });
  }
  const { error } = await supabase.from("generated_articles").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
