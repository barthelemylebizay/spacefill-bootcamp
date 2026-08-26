import supabase from "@/lib/supabase";

// GET — all known header→field matches, used to boost auto-detection
export async function GET() {
  const { data, error } = await supabase
    .from("mapping_history")
    .select("header_normalized, field_key, occurrences");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// POST — record a confirmed mapping so future imports detect it too
export async function POST(request) {
  const { mappings } = await request.json(); // [{ header_normalized, header_raw, field_key }]
  if (!Array.isArray(mappings) || !mappings.length) return Response.json({ ok: true });

  for (const m of mappings) {
    if (!m.header_normalized || !m.field_key) continue;
    const { data: existing } = await supabase
      .from("mapping_history")
      .select("id, occurrences")
      .eq("header_normalized", m.header_normalized)
      .eq("field_key", m.field_key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("mapping_history")
        .update({ occurrences: existing.occurrences + 1, last_used_at: new Date().toISOString(), header_raw: m.header_raw })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("mapping_history")
        .insert({ header_normalized: m.header_normalized, header_raw: m.header_raw, field_key: m.field_key, occurrences: 1 });
    }
  }
  return Response.json({ ok: true });
}
