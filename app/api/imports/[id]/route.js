import supabase from "@/lib/supabase";

export async function GET(request, { params }) {
  const { id } = await params;
  const { data, error } = await supabase.from("imports").select("*, clients(name), import_errors(*)").eq("id", id).single();
  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json(data);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await supabase.from("imports").update({ ...body, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
