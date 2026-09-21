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

  // Update clients IN PLACE. Replacing the list wholesale (delete + re-insert) gave every
  // client a new id on each edit, which broke links already open in a browser and — because
  // mapping_profiles.client_id cascades on delete — silently destroyed that client's saved
  // mapping profiles. Only rows the user actually removed are deleted.
  if (Array.isArray(clients)) {
    const incoming = clients.filter(c => c.name?.trim());
    const toRow = (c) => ({
      access_id: id,
      name: c.name.trim(),
      customer_id: c.customer_id?.trim() || null,
      warehouse_id: c.warehouse_id?.trim() || null,
      api_token: c.api_token?.trim() || null,
      updated_at: new Date().toISOString(),
    });

    const keptIds = incoming.map(c => c.id).filter(Boolean);
    const { data: existing } = await supabase.from("clients").select("id").eq("access_id", id);
    const removed = (existing || []).map(c => c.id).filter(cid => !keptIds.includes(cid));
    if (removed.length) await supabase.from("clients").delete().in("id", removed);

    for (const c of incoming) {
      if (c.id) {
        const { error: uErr } = await supabase.from("clients").update(toRow(c)).eq("id", c.id).eq("access_id", id);
        if (uErr) return Response.json({ error: uErr.message }, { status: 500 });
      } else {
        const { error: iErr } = await supabase.from("clients").insert(toRow(c));
        if (iErr) return Response.json({ error: iErr.message }, { status: 500 });
      }
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
