import supabase from "@/lib/supabase";

// Returns ALL fields (including hidden ones). Hidden fields are filtered out of the
// mapping picker on the client, but must stay resolvable here — otherwise a saved
// profile or auto-detected mapping pointing at a since-hidden field silently loses
// its data (written to an "undefined" key instead of the real field_key).
export async function GET() {
  const { data, error } = await supabase.from("spacefill_fields").select("*").order("is_required", { ascending: false }).order("label");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
