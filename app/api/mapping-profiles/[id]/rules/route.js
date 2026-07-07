import supabase from "@/lib/supabase";

// Replace all mapping rules for a profile
export async function POST(request, { params }) {
  const { id } = await params;
  const { rules } = await request.json();

  // Delete existing
  await supabase.from("mapping_rules").delete().eq("mapping_profile_id", id);

  if (!rules || rules.length === 0) return Response.json({ ok: true });

  const toInsert = rules.map(r => ({
    mapping_profile_id: id,
    source_column_name: r.source_column_name,
    source_column_index: r.source_column_index,
    spacefill_field_id: r.spacefill_field_id,
    is_required: r.is_required || false,
  }));

  const { data, error } = await supabase.from("mapping_rules").insert(toInsert).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
