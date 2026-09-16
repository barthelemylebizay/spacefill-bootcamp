import supabase from "@/lib/supabase";

/**
 * All client rows sharing one Spacefill account id (`customer_id`).
 *
 * The same shipper can legitimately appear more than once: under its own SHIPPER access
 * and again inside each 3PL access that handles it. Mapping profiles describe how to read
 * that shipper's FILES, so they belong to the Spacefill account and must be shared across
 * all of its rows — resolving to a single row would hide a shipper's own profiles from the
 * 3PL working on the very same account.
 */
export async function resolveClientIds(customerId) {
  if (!customerId) return [];
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("customer_id", customerId);
  return (data || []).map(c => c.id);
}

/** The row to record as owner when saving a new profile. */
export async function resolveOwnerClientId(customerId) {
  const ids = await resolveClientIds(customerId);
  return ids[0] || null;
}

/**
 * Restricts a mapping_profiles query to what one client may legitimately see:
 *   - profiles belonging to its own Spacefill account
 *   - the global Spacefill templates (no client attached)
 * Without this, every client saw every other client's saved configuration.
 *
 * An empty `clientIds` (unknown or non-embed visitor) yields global templates only.
 */
export function scopeProfilesQuery(query, clientIds) {
  const ids = (clientIds || []).filter(Boolean);
  if (!ids.length) return query.is("client_id", null).eq("is_template", true);
  const list = ids.join(",");
  return query.or(`client_id.in.(${list}),and(client_id.is.null,is_template.eq.true)`);
}
