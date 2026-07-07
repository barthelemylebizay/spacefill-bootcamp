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
      if (item.item_packaging_type) payload.each_quantity_of_each = 1; // default

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
