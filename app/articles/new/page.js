"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "auto", icon: "🤖", label: "Détection auto", desc: "L'IA choisit le type" },
  { value: "create_chart", icon: "✏️", label: "Créer un chart", desc: "From scratch" },
  { value: "modify_chart", icon: "🔧", label: "Modifier un chart", desc: "Chart existant" },
  { value: "use_chart", icon: "👁", label: "Utiliser un chart", desc: "Comprendre / lire" },
];

const LANGUAGES = ["Français", "English", "Español", "Deutsch", "Italiano"];

export default function NewArticle() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [articleType, setArticleType] = useState("auto");
  const [language, setLanguage] = useState("Français");
  const [datasourceId, setDatasourceId] = useState("");
  const [chartId, setChartId] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [datasources, setDatasources] = useState([]);
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/datasources").then(r => r.json()).then(setDatasources).catch(() => {});
    fetch("/api/charts").then(r => r.json()).then(setCharts).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim()) { setError("Décris ta demande pour continuer."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, articleType, language, datasourceId: datasourceId || null, chartId: chartId || null, additionalContext }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Une erreur est survenue."); setLoading(false); return; }
      router.push(`/articles/${data.article.id}`);
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Génération en cours…</h1>
        </div>
        <div className="page-body">
          <div className="card generating-state">
            <div className="spinner"></div>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>L'IA analyse ta demande</h3>
            <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>Sélection de la datasource, mapping des champs, rédaction de l'article…</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Nouvelle demande d'article</h1>
        <p className="page-subtitle">Décris ce que tu veux expliquer — le moteur IA génère l'article.</p>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 700 }}>
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Prompt */}
            <div className="form-group">
              <label className="form-label">Ta demande *</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 100, fontSize: 15 }}
                placeholder="Ex : Créer un chart de stock par entrepôt · Modifier un chart pour filtrer par période · Comprendre le chart de suivi des expéditions"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <div className="form-hint">Décris en langage naturel — inutile d'être technique.</div>
            </div>

            {/* Type */}
            <div className="form-group">
              <label className="form-label">Type d'article</label>
              <div className="type-grid">
                {TYPES.map(t => (
                  <div
                    key={t.value}
                    className={`type-option ${articleType === t.value ? "selected" : ""}`}
                    onClick={() => setArticleType(t.value)}
                  >
                    <div className="type-option-icon">{t.icon}</div>
                    <div className="type-option-label">{t.label}</div>
                    <div className="type-option-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="form-group">
              <label className="form-label">Langue de l'article</label>
              <select className="form-select" style={{ maxWidth: 220 }} value={language} onChange={e => setLanguage(e.target.value)}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Datasource */}
            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Datasource Superset <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>(optionnel)</span></label>
                <select className="form-select" value={datasourceId} onChange={e => setDatasourceId(e.target.value)}>
                  <option value="">Sélection automatique</option>
                  {datasources.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Chart de référence <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>(optionnel)</span></label>
                <select className="form-select" value={chartId} onChange={e => setChartId(e.target.value)}>
                  <option value="">Aucun</option>
                  {charts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Context */}
            <div className="form-group">
              <label className="form-label">Contexte métier <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>(optionnel)</span></label>
              <textarea
                className="form-textarea"
                placeholder="Ex : Cet article est destiné aux équipes Customer Success qui font du reporting mensuel."
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button type="submit" className="btn btn-primary btn-lg">✨ Générer l'article</button>
              <a href="/articles" className="btn btn-secondary">Annuler</a>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
