import supabase, { supabaseConfigured } from "@/lib/supabase";
import { mockStore } from "@/lib/mock-data";

export async function GET() {
  if (!supabaseConfigured) {
    const articles = mockStore.generated_articles;
    return Response.json({
      total_articles: articles.length,
      needs_review: articles.filter(a => a.status === "needs_review").length,
      ready_to_index: articles.filter(a => a.status === "ready_to_index").length,
      total_feedbacks: mockStore.feedbacks.length,
      recent_requests: mockStore.article_requests.slice(-5).reverse(),
      recent_articles: articles.slice(-5).reverse(),
    });
  }
  const [articlesRes, feedbacksRes] = await Promise.all([
    supabase.from("generated_articles").select("id, title, status, article_type, language, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("feedbacks").select("id", { count: "exact" }),
  ]);
  const allArticles = await supabase.from("generated_articles").select("status");
  const articles = allArticles.data || [];
  return Response.json({
    total_articles: articles.length,
    needs_review: articles.filter(a => a.status === "needs_review").length,
    ready_to_index: articles.filter(a => a.status === "ready_to_index").length,
    total_feedbacks: feedbacksRes.count || 0,
    recent_articles: articlesRes.data || [],
  });
}
