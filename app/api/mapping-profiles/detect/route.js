import supabase from "@/lib/supabase";

// Normalize a header to a stable key (strips accents, apostrophes, special chars)
function normalizeHeader(h) {
  return String(h).trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’‘]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function makeFingerprint(headers) {
  return headers.map(normalizeHeader).sort().join("|");
}

// POST — given a list of headers, find a matching profile
export async function POST(request) {
  const { headers } = await request.json();
  if (!headers?.length) return Response.json({ match: null });

  const fingerprint = makeFingerprint(headers);

  const { data: profiles } = await supabase
    .from("mapping_profiles")
    .select("*, mapping_rules(*)")
    .not("headers_fingerprint", "is", null);

  if (!profiles?.length) return Response.json({ match: null });

  // Exact match first
  const exact = profiles.find(p => p.headers_fingerprint === fingerprint);
  if (exact) return Response.json({ match: exact, confidence: "exact" });

  // Fuzzy match: check overlap ratio (same normalization as fingerprint)
  const incomingSet = new Set(headers.map(normalizeHeader));
  let bestProfile = null;
  let bestScore = 0;

  for (const profile of profiles) {
    if (!profile.headers_fingerprint) continue;
    const storedHeaders = new Set(profile.headers_fingerprint.split("|"));
    const intersection = [...incomingSet].filter(h => storedHeaders.has(h)).length;
    const union = new Set([...incomingSet, ...storedHeaders]).size;
    const score = intersection / union;
    if (score > bestScore) { bestScore = score; bestProfile = profile; }
  }

  if (bestScore >= 0.8) return Response.json({ match: bestProfile, confidence: "fuzzy", score: bestScore });

  return Response.json({ match: null });
}
