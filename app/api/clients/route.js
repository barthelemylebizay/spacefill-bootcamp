import supabase from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  const { name, api_token, customer_id, warehouse_id } = body;
  if (!name) return Response.json({ error: "Le nom est requis." }, { status: 400 });
  const { data, error } = await supabase.from("clients").insert({ name, api_token, customer_id, warehouse_id }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
