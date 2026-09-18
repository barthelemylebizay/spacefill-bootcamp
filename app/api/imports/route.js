import supabase from "@/lib/supabase";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  let q = supabase.from("imports").select("*, clients(name)").order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

const RETENTION_DAYS = 7;

export async function POST(request) {
  const body = await request.json();

  // Drop the payloads of imports older than the retention window. Doing it on write
  // avoids needing a scheduler, and keeps client order data from lingering.
  supabase.rpc("purge_expired_import_payloads").then(() => {}, () => {});

  const purgeAfter = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("imports")
    .insert({ ...body, purge_after: purgeAfter })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
