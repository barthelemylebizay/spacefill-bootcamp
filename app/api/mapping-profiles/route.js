import supabase from "@/lib/supabase";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  let query = supabase.from("mapping_profiles").select("*, mapping_rules(*), formatting_rules(*)").order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  const { client_id, name, file_type, header_row_index, delimiter, encoding } = body;
  const { data, error } = await supabase.from("mapping_profiles").insert({ client_id, name, file_type, header_row_index: header_row_index || 0, delimiter: delimiter || ",", encoding: encoding || "UTF-8" }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
