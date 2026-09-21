import supabase from "@/lib/supabase";

import { resolveClientIds } from "@/lib/client-scope";

// The history list omits raw_file / logs / api_result on purpose: those hold the client's
// actual order data, and this route is reachable by anyone with an embed link. It is also
// scoped — it used to return every client's imports (and, since retention was added, their
// uploaded files) to whoever asked.
const LIST_COLUMNS = "id, client_id, file_name, file_type, total_rows, valid_rows, error_rows, ignored_rows, status, spacefill_order_id, spacefill_order_status, created_at, updated_at";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  const customerId = searchParams.get("customer_id");

  let ids = [];
  if (clientId) ids = [clientId];
  else if (customerId) ids = await resolveClientIds(customerId);
  else return Response.json([]); // fail closed rather than list every client's imports

  if (!ids.length) return Response.json([]);

  const { data, error } = await supabase
    .from("imports")
    .select(LIST_COLUMNS + ", clients(name)")
    .in("client_id", ids)
    .order("created_at", { ascending: false });
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
