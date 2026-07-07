import supabase from "@/lib/supabase";

export async function POST(request) {
  const { mapping_profile_id, rules } = await request.json();
  await supabase.from("formatting_rules").delete().eq("mapping_profile_id", mapping_profile_id);
  if (!rules || rules.length === 0) return Response.json({ ok: true });
  const toInsert = rules.map((r, i) => ({ mapping_profile_id, ...r, execution_order: i }));
  const { data, error } = await supabase.from("formatting_rules").insert(toInsert).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
