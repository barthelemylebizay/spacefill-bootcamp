import supabase, { supabaseConfigured } from "@/lib/supabase";
import { mockStore } from "@/lib/mock-data";

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  if (!supabaseConfigured) {
    const idx = mockStore.fields_mapping.findIndex(i => i.id === id);
    if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
    mockStore.fields_mapping[idx] = { ...mockStore.fields_mapping[idx], ...body, updated_at: new Date().toISOString() };
    return Response.json(mockStore.fields_mapping[idx]);
  }
  const { data, error } = await supabase.from("fields_mapping").update(body).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!supabaseConfigured) {
    const idx = mockStore.fields_mapping.findIndex(i => i.id === id);
    if (idx !== -1) mockStore.fields_mapping.splice(idx, 1);
    return Response.json({ ok: true });
  }
  const { error } = await supabase.from("fields_mapping").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
