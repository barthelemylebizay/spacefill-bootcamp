const SPACEFILL_API_BASE = "https://api.spacefill.fr/v1";

export async function POST(request) {
  const { references, api_token } = await request.json();

  if (!references?.length) return Response.json({ duplicates: [] });
  if (!api_token) return Response.json({ error: "Token manquant." }, { status: 400 });

  const duplicates = [];

  // Deduplicate input references
  const unique = [...new Set(references.filter(Boolean))];

  // Check each reference against the Spacefill API
  // The API supports ?shipper_order_reference= as a filter
  await Promise.all(
    unique.map(async (ref) => {
      try {
        const url = `${SPACEFILL_API_BASE}/logistic_management/orders/?shipper_order_reference=${encodeURIComponent(ref)}&limit=1`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${api_token}` },
        });
        if (!res.ok) return; // skip on error, don't block import
        const data = await res.json();
        // API returns { items: [...] } or array directly
        const items = Array.isArray(data) ? data : (data.items || data.results || []);
        if (items.length > 0) {
          const existing = items[0];
          duplicates.push({
            reference: ref,
            spacefill_id: existing.id,
            status: existing.status,
            created_at: existing.created_at,
          });
        }
      } catch {
        // Network error on one reference — skip silently
      }
    })
  );

  return Response.json({ duplicates });
}
