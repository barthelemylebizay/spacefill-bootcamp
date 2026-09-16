import supabase from "@/lib/supabase";

// GET — what the import screen needs to open an access.
// Deliberately WITHOUT api_token: a 3PL link would otherwise hand the browser every one
// of its shippers' Spacefill tokens at once. Credentials are fetched one at a time from
// ./clients/[clientId]/credentials, only for the shipper actually selected.
export async function GET(request, { params }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("accesses")
    .select("id, name, type, clients(id, name, customer_id, warehouse_id)")
    .eq("id", id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Accès introuvable." }, { status: 404 });

  const clients = [...(data.clients || [])].sort((a, b) => a.name.localeCompare(b.name));
  return Response.json({ ...data, clients });
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const { name, type, clients } = await request.json();

  const patch = { updated_at: new Date().toISOString() };
  if (name?.trim()) patch.name = name.trim();
  if (type) patch.type = type === "3PL" ? "3PL" : "SHIPPER";

  const { error } = await supabase.from("accesses").update(patch).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Replace the client list wholesale — simplest way to keep the admin form and the
  // stored rows in sync when a line is added, edited or removed.
  if (Array.isArray(clients)) {
    await supabase.from("clients").delete().eq("access_id", id);
    const rows = clients
      .filter(c => c.name?.trim())
      .map(c => ({
        access_id: id,
        name: c.name.trim(),
        customer_id: c.customer_id?.trim() || null,
        warehouse_id: c.warehouse_id?.trim() || null,
        api_token: c.api_token?.trim() || null,
      }));
    if (rows.length) {
      const { error: cErr } = await supabase.from("clients").insert(rows);
      if (cErr) return Response.json({ error: cErr.message }, { status: 500 });
    }
  }

  const { data: full } = await supabase.from("accesses").select("*, clients(*)").eq("id", id).single();
  return Response.json(full);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { error } = await supabase.from("accesses").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
