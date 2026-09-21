// Spacefill API client — create orders via POST /v1/orders

const SPACEFILL_API_BASE = "https://api.spacefill.fr/v1";
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;

async function fetchWithRetry(url, options, attempt = 1) {
  try {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status >= 500) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        return fetchWithRetry(url, options, attempt + 1);
      }
    }
    return res;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  }
}

function errorMessage(data, status) {
  return typeof data.message === "string" ? data.message
    : typeof data.detail === "string" ? data.detail
    : data.message || data.detail
      ? JSON.stringify(data.message || data.detail)
      : JSON.stringify(data) || `Erreur API Spacefill (${status})`;
}

function post(url, apiToken, body) {
  return fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiToken}` },
    body: JSON.stringify(body),
  });
}

// Spacefill rejects an order it cannot attribute to a shipper. A shipper token implies
// its own account, but a 3PL token covers several — that one must name the shipper
// explicitly, which only /v1/orders/create accepts (via shipper_account_id).
const MISSING_CUSTOMER = /without customer id/i;

export async function createOrder(orderData, apiToken, orderType = "EXIT", shipperAccountId = null) {
  const type = orderType === "ENTRY" ? "entry" : "exit";

  let res = await post(`${SPACEFILL_API_BASE}/logistic_management/orders/${type}/`, apiToken, orderData);
  let data = await res.json().catch(() => ({}));

  // Multi-shipper token: retry on the endpoint that lets us name the shipper. Safe to
  // retry — the first call failed validation, so nothing was created.
  if (!res.ok && shipperAccountId && MISSING_CUSTOMER.test(errorMessage(data, res.status))) {
    res = await post(`${SPACEFILL_API_BASE}/orders/create`, apiToken, {
      ...orderData,
      order_type: orderType === "ENTRY" ? "ENTRY" : "EXIT",
      shipper_account_id: shipperAccountId,
    });
    data = await res.json().catch(() => ({}));
  }

  if (!res.ok) throw new Error(errorMessage(data, res.status));
  return data;
}

export async function createOrdersBatch(rows, apiToken, onProgress) {
  const results = [];
  const errors = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      try {
        const result = await createOrder(row, apiToken);
        results.push({ success: true, data: result });
      } catch (err) {
        errors.push({ row, error: err.message });
      }
    }
    if (onProgress) onProgress(Math.min(i + BATCH_SIZE, rows.length), rows.length);
  }

  return { results, errors };
}

const NUMBER_KEYS = new Set(["expected_quantity", "gross_weight", "volume", "linear_meter", "transport_gross_weight", "transport_quantity", "packing_quantity"]);
const DATE_KEYS = new Set(["date", "delivery_date", "planned_datetime_range", "planned_execution_datetime_range", "created_at"]);

// Fields that belong inside order_items[0], not at the root of the payload
const ORDER_ITEM_KEYS = new Set(["item_reference", "master_item_id", "expected_quantity", "item_packaging_type", "batch_name", "batch_id", "batch_edi_erp_id", "batch_edi_wms_id"]);

function normalizeDate(value) {
  // Same tolerance as the import screen: a trailing time must not void the date.
  const s = String(value).trim().replace(/[T\s]+\d{1,2}[:h]\d{2}(:\d{2})?(\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/i, "").trim();
  let iso = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) iso = s.slice(0, 10);
  else {
    const ddmm = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (ddmm) iso = `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`;
    else {
      const d = new Date(s);
      if (!isNaN(d.getTime())) iso = d.toISOString().slice(0, 10);
    }
  }
  return iso;
}

function toDatetimeRange(value) {
  const iso = normalizeDate(value);
  if (!iso) return null;
  return { datetime_from: `${iso}T00:00:00.000Z`, datetime_to: `${iso}T23:59:59.000Z` };
}

function normalizeValue(key, value) {
  if (value === "" || value === null || value === undefined) return null;
  if (NUMBER_KEYS.has(key)) {
    const n = parseFloat(String(value).replace(",", "."));
    return isNaN(n) ? null : n;
  }
  if (DATE_KEYS.has(key)) return normalizeDate(value);
  return value;
}

// Groups file rows that belong to the same order (same shipper_order_reference) so they
// become order_items on a single order, instead of one order per file row. A file with
// several article lines for the same order reference would otherwise be sent as separate
// orders, and Spacefill rejects the 2nd+ attempt as a duplicate order reference.
export function groupRowsByOrder(rows) {
  const groups = new Map();
  const refOrder = [];
  rows.forEach((row, i) => {
    const ref = row.shipper_order_reference || `__no_ref_${i}__`;
    if (!groups.has(ref)) { groups.set(ref, []); refOrder.push(ref); }
    groups.get(ref).push(row);
  });
  return refOrder.map(ref => groups.get(ref));
}

// rowsForOneOrder: one or more formatted rows sharing the same order-level fields, each
// contributing one order_items entry.
export function buildOrderPayload(rowsForOneOrder) {
  const payload = {};
  const orderItems = [];

  for (const formattedRow of rowsForOneOrder) {
    const orderItem = {};
    for (const [key, value] of Object.entries(formattedRow)) {
      // Map legacy "date" field to the correct Spacefill field
      // The single "date" column a file carries is the pickup date.
      const mappedKey = key === "date" ? "pickup_planned_datetime_range" : key;
      // DateTimeRange fields need an object, not a plain string
      const isDatetimeRange = mappedKey.endsWith("_datetime_range");
      const normalized = isDatetimeRange ? toDatetimeRange(value) : normalizeValue(mappedKey, value);
      if (normalized === null || normalized === undefined) continue;

      if (ORDER_ITEM_KEYS.has(key)) {
        orderItem[key] = normalized;
      } else {
        payload[mappedKey] = normalized;
      }
    }
    if (Object.keys(orderItem).length > 0) {
      // Packaging is always EACH — never driven by a file column.
      orderItem.item_packaging_type = "EACH";
      orderItems.push(orderItem);
    }
  }

  if (orderItems.length > 0) payload.order_items = orderItems;

  return payload;
}

export async function testApiToken(apiToken) {
  try {
    const res = await fetchWithRetry(`${SPACEFILL_API_BASE}/orders?limit=1`, {
      headers: { "Authorization": `Bearer ${apiToken}` },
    });
    return { valid: res.ok, status: res.status };
  } catch {
    return { valid: false, status: 0 };
  }
}
