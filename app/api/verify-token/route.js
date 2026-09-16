const SPACEFILL_API_BASE = "https://api.spacefill.fr/v1";

// Checks a token against Spacefill before it is saved. A wrong value (a warehouse id
// pasted into the token field, say) otherwise stays invisible until a whole import comes
// back "Unauthorized" for every single row.
export async function POST(request) {
  const { tokens } = await request.json();
  if (!Array.isArray(tokens) || !tokens.length) return Response.json({ results: {} });

  const unique = [...new Set(tokens.filter(Boolean))];
  const results = {};

  await Promise.all(
    unique.map(async (token) => {
      try {
        const res = await fetch(`${SPACEFILL_API_BASE}/logistic_management/orders/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ page: 1, item_per_page: 1 }),
        });
        results[token] = res.ok;
      } catch {
        results[token] = null; // network issue — don't claim the token is bad
      }
    })
  );

  return Response.json({ results });
}
