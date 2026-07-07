import supabase from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("spacefill_fields").select("*").order("is_required", { ascending: false }).order("label");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
