export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const customerId = searchParams.get("customer_id");
  if (!token) return Response.json([]);

  const searchBody = { page: 1, item_per_page: 20 };
  if (customerId) searchBody.shipper_account_id = customerId;

  try {
    const res = await fetch("https://api.spacefill.fr/v1/logistic_management/orders/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(searchBody),
    });
    if (!res.ok) return Response.json([]);
    const data = await res.json();

    // Spacefill search API returns { items: [...], total: ..., ... }
    const orders = Array.isArray(data.items) ? data.items
      : Array.isArray(data.results) ? data.results
      : Array.isArray(data.data) ? data.data : [];

    const orderKeys = new Set();
    const itemKeys = new Set();

    orders.forEach(order => {
      if (order.custom_fields && typeof order.custom_fields === "object") {
        Object.keys(order.custom_fields).forEach(k => orderKeys.add(k));
      }
      (order.order_items || []).forEach(item => {
        if (item.custom_fields && typeof item.custom_fields === "object") {
          Object.keys(item.custom_fields).forEach(k => itemKeys.add(k));
        }
      });
    });

    const fields = [
      ...[...orderKeys].map(k => ({
        id: `custom_order_${k}`,
        field_key: `custom_order_${k}`,
        label: `Custom : ${k}`,
        data_type: "text",
        is_order_item_field: false,
        is_required: false,
        is_custom: true,
        custom_key: k,
        custom_target: "order",
      })),
      ...[...itemKeys].map(k => ({
        id: `custom_item_${k}`,
        field_key: `custom_item_${k}`,
        label: `Custom article : ${k}`,
        data_type: "text",
        is_order_item_field: true,
        is_required: false,
        is_custom: true,
        custom_key: k,
        custom_target: "order_item",
      })),
    ];

    return Response.json(fields);
  } catch {
    return Response.json([]);
  }
}
