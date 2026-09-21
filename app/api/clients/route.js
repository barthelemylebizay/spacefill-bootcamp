import supabase from "@/lib/supabase";

// Never selects api_token: this route is reachable by anyone holding an embed link, and
// it previously returned every client's Spacefill token in clear text. Credentials are
// served only by /api/accesses/[id]/clients/[clientId]/credentials, for one client of
// one access at a time.
const SAFE_COLUMNS = "id, name, customer_id, warehouse_id, access_id, created_at";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customer_id");
  const accessId = searchParams.get("access_id");

  let q = supabase.from("clients").select(SAFE_COLUMNS).order("created_at", { ascending: false });
  if (customerId) q = q.eq("customer_id", customerId);
  else if (accessId) q = q.eq("access_id", accessId);
  else return Response.json([]); // fail closed rather than list everyone

  const { data, error } = await q;
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
