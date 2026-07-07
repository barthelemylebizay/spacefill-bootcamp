import { generateArticle } from "@/lib/ai-service";
import { mockStore, newId } from "@/lib/mock-data";
import supabase, { supabaseConfigured } from "@/lib/supabase";

export async function POST(request) {
  const body = await request.json();
  const { prompt, articleType, language, datasourceId, chartId, additionalContext } = body;

  if (!prompt?.trim()) {
    return Response.json({ error: "La demande ne peut pas être vide." }, { status: 400 });
  }

  // Load context
  const datasources = supabaseConfigured
    ? (await supabase.from("datasources").select("*")).data || []
    : mockStore.datasources;
  const fieldsMapping = supabaseConfigured
    ? (await supabase.from("fields_mapping").select("*")).data || []
    : mockStore.fields_mapping;
  const knowledgeSources = supabaseConfigured
    ? (await supabase.from("knowledge_sources").select("*").eq("is_active", true)).data || []
    : mockStore.knowledge_sources.filter(s => s.is_active);
  const chartLibrary = supabaseConfigured
    ? (await supabase.from("chart_library").select("*")).data || []
    : mockStore.chart_library;

  const datasource = datasourceId ? datasources.find(d => d.id === datasourceId) : null;
  const chart = chartId ? chartLibrary.find(c => c.id === chartId) : null;

  // Save request
  const requestData = {
    id: newId(),
    user_prompt: prompt,
    article_type: articleType,
    language,
    datasource_id: datasourceId || null,
    chart_id: chartId || null,
    additional_context: additionalContext || null,
    status: "processing",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!supabaseConfigured) {
    mockStore.article_requests.push(requestData);
  } else {
    await supabase.from("article_requests").insert(requestData);
  }

  try {
    const generated = await generateArticle({
      prompt, articleType, language, datasources, fieldsMapping,
      knowledgeSources, chartLibrary, datasource, chart, additionalContext,
    });

    const articleData = {
      request_id: requestData.id,
      title: generated.title || prompt,
      article_type: generated.article_type || articleType || "create_chart",
      language: generated.language || language || "Français",
      content: generated.content,
      datasource_id: datasourceId || null,
      chart_id: chartId || null,
      fields_used: generated.fields_used || [],
      sources_used: generated.sources_used || [],
      status: "draft",
      version: 1,
      ready_for_ask_anything: false,
    };

    let savedArticle;
    if (!supabaseConfigured) {
      savedArticle = { id: newId(), ...articleData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      mockStore.generated_articles.push(savedArticle);
    } else {
      const { data, error } = await supabase.from("generated_articles").insert(articleData).select().single();
      if (error) throw new Error(error.message);
      savedArticle = data;
    }

    // Update request status
    if (!supabaseConfigured) {
      const idx = mockStore.article_requests.findIndex(r => r.id === requestData.id);
      if (idx !== -1) mockStore.article_requests[idx].status = "completed";
    } else {
      await supabase.from("article_requests").update({ status: "completed" }).eq("id", requestData.id);
    }

    return Response.json({ article: savedArticle, request: requestData });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
