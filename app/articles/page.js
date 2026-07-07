"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_LABELS = { draft: "Brouillon", needs_review: "À revoir", approved: "Validé", ready_to_index: "Prêt à indexer", archived: "Archivé" };
const STATUS_CLS = { draft: "badge-draft", needs_review: "badge-needs-review", approved: "badge-approved", ready_to_index: "badge-ready-to-index", archived: "badge-archived" };
const TYPE_LABELS = { create_chart: "Créer un chart", modify_chart: "Modifier un chart", use_chart: "Utiliser un chart" };

export default function ArticleLibrary() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLang, setFilterLang] = useState("");

  useEffect(() => {
    fetch("/api/articles").then(r => r.json()).then(d => { setArticles(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function markReady(id, e) {
    e.preventDefault();
    const res = await fetch(`/api/articles/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ready_to_index", ready_for_ask_anything: true }) });
    if (res.ok) {
      const updated = await res.json();
      setArticles(prev => prev.map(a => a.id === id ? updated : a));
    }
  }

  const filtered = articles.filter(a => {
    const q = search.toLowerCase();
    if (q && !a.title?.toLowerCase().includes(q)) return false;
    if (filterType && a.article_type !== filterType) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterLang && a.language !== filterLang) return false;
    return true;
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Bibliothèque d'articles</h1>
        <p className="page-subtitle">{articles.length} article{articles.length !== 1 ? "s" : ""} généré{articles.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="page-body">
        <div className="action-bar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ maxWidth: 170 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            <option value="create_chart">Créer un chart</option>
            <option value="modify_chart">Modifier un chart</option>
            <option value="use_chart">Utiliser un chart</option>
          </select>
          <select className="form-select" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="form-select" style={{ maxWidth: 140 }} value={filterLang} onChange={e => setFilterLang(e.target.value)}>
            <option value="">Toutes les langues</option>
            {[...new Set(articles.map(a => a.language).filter(Boolean))].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <Link href="/articles/new" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>✨ Nouvel article</Link>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}><div className="spinner"></div></div>
          ) : !filtered.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <h3>Aucun article</h3>
              <p>Génère ton premier article d'aide Superset.</p>
              <Link href="/articles/new" className="btn btn-primary" style={{ marginTop: 16 }}>✨ Générer un article</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Type</th>
                    <th>Langue</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/articles/${a.id}`} style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}>
                          {a.title}
                        </Link>
                        {a.ready_for_ask_anything && <span className="badge badge-ready-to-index" style={{ marginLeft: 8, fontSize: 10 }}>Ask Anything</span>}
                      </td>
                      <td style={{ color: "var(--ink-muted)", fontSize: 13 }}>{TYPE_LABELS[a.article_type] || a.article_type}</td>
                      <td style={{ fontSize: 13 }}>{a.language}</td>
                      <td><span className={`badge ${STATUS_CLS[a.status] || "badge-draft"}`}>{STATUS_LABELS[a.status] || a.status}</span></td>
                      <td style={{ color: "var(--ink-muted)", fontSize: 13 }}>{a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : "—"}</td>
                      <td>
                        {a.status !== "ready_to_index" && (
                          <button className="btn btn-ghost btn-sm" onClick={e => markReady(a.id, e)} title="Marquer prêt à indexer">📤</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
