import supabase from "@/lib/supabase";

// GET — credentials for ONE shipper, and only if that shipper really belongs to this
// access. Returned one at a time so a 3PL link never exposes its whole set of tokens.
export async function GET(request, { params }) {
  const { id, clientId } = await params;

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, customer_id, warehouse_id, api_token, access_id")
    .eq("id", clientId)
    .eq("access_id", id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Client introuvable pour cet accès." }, { status: 404 });

  return Response.json({
    id: data.id,
    name: data.name,
    customer_id: data.customer_id,
    warehouse_id: data.warehouse_id,
    token: data.api_token,
  });
}
