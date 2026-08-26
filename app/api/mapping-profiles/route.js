import supabase from "@/lib/supabase";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  let query = supabase
    .from("mapping_profiles")
    .select("*, mapping_rules(*)")
    .order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  const { client_id, name, order_type, file_type, header_row_index, delimiter, encoding, headers_fingerprint, mappings, is_template, description } = body;

  const { data: profile, error } = await supabase
    .from("mapping_profiles")
    .insert({ client_id, name, order_type: order_type || "EXIT", file_type, header_row_index: header_row_index ?? 0, delimiter: delimiter || ",", encoding: encoding || "UTF-8", headers_fingerprint, is_template: !!is_template, description, template_file_url: body.template_file_url || null })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Save mapping rules
  if (mappings && Object.keys(mappings).length > 0) {
    const rules = Object.entries(mappings)
      .filter(([, fieldId]) => fieldId)
      .map(([col, fieldId]) => ({
        mapping_profile_id: profile.id,
        source_column_name: col,
        spacefill_field_id: fieldId,
      }));
    if (rules.length) await supabase.from("mapping_rules").insert(rules);
  }

  return Response.json(profile);
}
