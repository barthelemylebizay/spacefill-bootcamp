const SPACEFILL_API_BASE = "https://api.spacefill.fr/v1";

export async function POST(request) {
  const { references, api_token } = await request.json();

  if (!references?.length) return Response.json({ unknown: [] });
  if (!api_token) return Response.json({ error: "Token manquant." }, { status: 400 });

  const unique = [...new Set(references.filter(Boolean))];
  const unknown = [];

  await Promise.all(
    unique.map(async (ref) => {
      try {
        const url = `${SPACEFILL_API_BASE}/logistic_management/master_items/?item_reference=${encodeURIComponent(ref)}&limit=1`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${api_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items || data.results || []);
        if (items.length === 0) unknown.push(ref);
      } catch {
        // Skip on network error — don't block import
      }
    })
  );

  return Response.json({ unknown });
}
