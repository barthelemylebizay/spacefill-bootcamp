import supabase from "@/lib/supabase";
import { normalizeHeader, makeFingerprint } from "@/lib/normalize-header";
import { resolveClientIds, scopeProfilesQuery } from "@/lib/client-scope";

// POST — given a list of headers, find a matching profile
export async function POST(request) {
  const { headers, customer_id } = await request.json();
  if (!headers?.length) return Response.json({ match: null });

  const fingerprint = makeFingerprint(headers);

  // Only ever match against this client's own profiles plus the global templates —
  // otherwise one client's file could match (and reveal) another client's configuration.
  const clientIds = await resolveClientIds(customer_id);
  const { data: profiles } = await scopeProfilesQuery(
    supabase
      .from("mapping_profiles")
      .select("*, mapping_rules(*)")
      .not("headers_fingerprint", "is", null),
    clientIds
  );

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
