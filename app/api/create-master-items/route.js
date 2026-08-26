const SPACEFILL_API_BASE = "https://api.spacefill.fr/v1";

export async function POST(request) {
  const { items, api_token } = await request.json();
  // items: [{ item_reference, designation, item_packaging_type }]

  if (!items?.length) return Response.json({ created: [], errors: [] });
  if (!api_token) return Response.json({ error: "Token manquant." }, { status: 400 });

  const created = [];
  const errors = [];

  for (const item of items) {
    try {
      const payload = { item_reference: item.item_reference };
      if (item.designation) payload.designation = item.designation;
      // Give the packaging tier used by this import a unit label so the item isn't left
      // fully unconfigured — Spacefill refuses to create orders in a packaging tier that
      // has no data at all on the master item ("each_quantity_of_each" doesn't exist in
      // Spacefill's schema and silently did nothing).
      if (item.item_packaging_type === "CARDBOARD_BOX") payload.cardboard_box_unit = "CARTON";
      else if (item.item_packaging_type === "PALLET") payload.pallet_unit = "PALETTE";
      else payload.each_unit = "UNITE";

      const res = await fetch(`${SPACEFILL_API_BASE}/logistic_management/master_items/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        created.push({ item_reference: item.item_reference, id: data.id });
      } else {
        errors.push({ item_reference: item.item_reference, error: data.message || data.detail || `Erreur ${res.status}` });
      }
    } catch (err) {
      errors.push({ item_reference: item.item_reference, error: err.message });
    }
  }

  return Response.json({ created, errors });
}
