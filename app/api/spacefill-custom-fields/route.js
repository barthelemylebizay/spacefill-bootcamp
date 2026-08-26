const MAX_PAGES = 10;
const PAGE_SIZE = 100;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const customerId = searchParams.get("customer_id");
  if (!token) return Response.json([]);

  try {
    const orderKeys = new Set();
    const itemKeys = new Set();

    for (let page = 1; page <= MAX_PAGES; page++) {
      const searchBody = { page, item_per_page: PAGE_SIZE };
      if (customerId) searchBody.shipper_account_id = [customerId];

      const res = await fetch("https://api.spacefill.fr/v1/logistic_management/orders/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(searchBody),
      });
      if (!res.ok) break;
      const data = await res.json();

      // Spacefill search API returns { items: [...], total: ..., ... }
      const orders = Array.isArray(data.items) ? data.items
        : Array.isArray(data.results) ? data.results
        : Array.isArray(data.data) ? data.data : [];

      orders.forEach(order => {
        // Order-level (ORDER) custom fields — used for the "Commande" mapping section
        if (order.custom_fields && typeof order.custom_fields === "object") {
          Object.keys(order.custom_fields).forEach(k => orderKeys.add(k));
        }
        // Order item-level (ORDER_ITEM) custom fields — used for the "Articles" mapping section
        (order.order_items || []).forEach(item => {
          if (item.custom_fields && typeof item.custom_fields === "object") {
            Object.keys(item.custom_fields).forEach(k => itemKeys.add(k));
          }
        });
      });

      if (orders.length < PAGE_SIZE || (typeof data.total === "number" && page * PAGE_SIZE >= data.total)) break;
    }

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
