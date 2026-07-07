import supabase, { supabaseConfigured } from "@/lib/supabase";
import { mockStore, newId } from "@/lib/mock-data";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("article_type");
  const lang = searchParams.get("language");

  if (!supabaseConfigured) {
    let results = [...mockStore.generated_articles].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (status) results = results.filter(a => a.status === status);
    if (type) results = results.filter(a => a.article_type === type);
    if (lang) results = results.filter(a => a.language === lang);
    return Response.json(results);
  }

  let query = supabase.from("generated_articles").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("article_type", type);
  if (lang) query = query.eq("language", lang);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  if (!supabaseConfigured) {
    const item = { id: newId(), ...body, version: 1, status: body.status || "draft", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    mockStore.generated_articles.push(item);
    return Response.json(item);
  }
  const { data, error } = await supabase.from("generated_articles").insert(body).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
