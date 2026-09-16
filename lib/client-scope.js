import supabase from "@/lib/supabase";

/**
 * Resolves the Spacefill account id carried in an embed link (`customer_id`) to our own
 * client record id, which is what mapping_profiles.client_id references.
 * Returns null when unknown — callers must then expose ONLY global templates.
 */
export async function resolveClientId(customerId) {
  if (!customerId) return null;
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("customer_id", customerId)
    .maybeSingle();
  return data?.id || null;
}

/**
 * Restricts a mapping_profiles query to what one client may legitimately see:
 *   - its own saved profiles
 *   - the global Spacefill templates (no client attached)
 * Without this, every client saw every other client's saved configuration.
 *
 * `clientId` null (unknown or non-embed visitor) yields global templates only.
 */
export function scopeProfilesQuery(query, clientId) {
  return clientId
    ? query.or(`client_id.eq.${clientId},and(client_id.is.null,is_template.eq.true)`)
    : query.is("client_id", null).eq("is_template", true);
}
