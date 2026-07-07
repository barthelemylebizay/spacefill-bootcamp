import supabase from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("mapping_templates").select("*").order("order_type").order("name");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
