import supabase, { supabaseConfigured } from "@/lib/supabase";
import { mockStore, newId } from "@/lib/mock-data";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const datasourceId = searchParams.get("datasource_id");
  if (!supabaseConfigured) {
    let results = mockStore.fields_mapping;
    if (datasourceId) results = results.filter(f => f.datasource_id === datasourceId);
    return Response.json(results);
  }
  let query = supabase.from("fields_mapping").select("*").order("business_label");
  if (datasourceId) query = query.eq("datasource_id", datasourceId);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  if (!supabaseConfigured) {
    const item = { id: newId(), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    mockStore.fields_mapping.push(item);
    return Response.json(item);
  }
  const { data, error } = await supabase.from("fields_mapping").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
