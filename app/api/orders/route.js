import supabase from "@/lib/supabase";
import { buildOrderPayload, createOrder, groupRowsByOrder } from "@/lib/spacefill-api";

export async function POST(request) {
  const { import_id, client_id, rows, api_token, order_type, warehouse_id } = await request.json();

  if (!rows?.length) return Response.json({ error: "Aucune ligne à envoyer." }, { status: 400 });
  if (!api_token) return Response.json({ error: "Token API manquant." }, { status: 400 });

  const results = [];
  const errors = [];

  // Rows sharing the same shipper_order_reference are article lines of the SAME order —
  // group them so they become order_items on one order instead of duplicate orders.
  const orderGroups = groupRowsByOrder(rows);

  for (const group of orderGroups) {
    const payload = buildOrderPayload(group);
    if (warehouse_id) {
      // If it looks like a UUID, use warehouse_id; otherwise use edi_erp_warehouse_id
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(warehouse_id);
      if (isUuid) payload.warehouse_id = warehouse_id;
      else payload.edi_erp_warehouse_id = warehouse_id;
    }
    try {
      const result = await createOrder(payload, api_token, order_type);
      results.push({ success: true, spacefill_order_id: result.id || result.order_id, payload, response: result });
    } catch (err) {
      errors.push({ row: group, error: err.message, payload });
    }
  }

  const firstSuccess = results.find(r => r.success);
  const spacefillOrderId = firstSuccess?.spacefill_order_id || null;

  // Save order record
  const { data: order } = await supabase.from("orders").insert({
    client_id,
    import_id,
    spacefill_order_id: spacefillOrderId,
    status: errors.length === 0 ? "success" : results.length > 0 ? "partial" : "error",
    api_payload: rows,
    api_response: { results, errors },
  }).select().single();

  // Update import
  await supabase.from("imports").update({
    spacefill_order_id: spacefillOrderId,
    spacefill_order_status: "created",
    status: errors.length === 0 ? "completed" : "partial",
    valid_rows: results.length,
    error_rows: errors.length,
    updated_at: new Date().toISOString(),
  }).eq("id", import_id);

  return Response.json({ order, results, errors, spacefill_order_id: spacefillOrderId });
}
