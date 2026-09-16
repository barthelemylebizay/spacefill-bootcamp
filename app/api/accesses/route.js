import supabase from "@/lib/supabase";

// GET — admin listing of every access with its clients (tokens included: admin-only view)
export async function GET() {
  const { data, error } = await supabase
    .from("accesses")
    .select("*, clients(*)")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// POST — create an access. A SHIPPER access holds exactly one client; a 3PL access
// holds as many as the logistics provider works with.
export async function POST(request) {
  const { name, type, clients } = await request.json();
  if (!name?.trim()) return Response.json({ error: "Nom manquant." }, { status: 400 });

  const accessType = type === "3PL" ? "3PL" : "SHIPPER";

  const { data: access, error } = await supabase
    .from("accesses")
    .insert({ name: name.trim(), type: accessType })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (clients || [])
    .filter(c => c.name?.trim())
    .map(c => ({
      access_id: access.id,
      name: c.name.trim(),
      customer_id: c.customer_id?.trim() || null,
      warehouse_id: c.warehouse_id?.trim() || null,
      api_token: c.api_token?.trim() || null,
    }));

  if (rows.length) {
    const { error: cErr } = await supabase.from("clients").insert(rows);
    if (cErr) return Response.json({ error: cErr.message }, { status: 500 });
  }

  const { data: full } = await supabase
    .from("accesses")
    .select("*, clients(*)")
    .eq("id", access.id)
    .single();

  return Response.json(full);
}
