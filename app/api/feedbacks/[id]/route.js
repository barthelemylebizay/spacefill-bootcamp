import supabase, { supabaseConfigured } from "@/lib/supabase";
import { mockStore } from "@/lib/mock-data";

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  if (!supabaseConfigured) {
    const idx = mockStore.feedbacks.findIndex(i => i.id === id);
    if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
    mockStore.feedbacks[idx] = { ...mockStore.feedbacks[idx], ...body, updated_at: new Date().toISOString() };
    return Response.json(mockStore.feedbacks[idx]);
  }
  const { data, error } = await supabase.from("feedbacks").update(body).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
