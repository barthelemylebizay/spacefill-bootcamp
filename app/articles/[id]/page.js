"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon", cls: "badge-draft" },
  { value: "needs_review", label: "À revoir", cls: "badge-needs-review" },
  { value: "approved", label: "Validé", cls: "badge-approved" },
  { value: "ready_to_index", label: "Prêt à indexer", cls: "badge-ready-to-index" },
  { value: "archived", label: "Archivé", cls: "badge-archived" },
];

const TYPE_LABELS = {
  create_chart: "Créer un chart",
  modify_chart: "Modifier un chart",
  use_chart: "Utiliser un chart",
};

function renderMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.slice(2, -2).split(" | ");
      const isHeader = cells.every(c => !c.includes("---"));
      if (cells.every(c => c.trim().match(/^-+$/))) return "";
      return `<tr>${cells.map(c => isHeader ? `<th>${c}</th>` : `<td>${c}</td>`).join("")}</tr>`;
    })
    .replace(/(<tr>.*<\/tr>\n?)+/gs, match => `<table><tbody>${match}</tbody></table>`)
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, match => `<ul>${match}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[h1-6]|<ul|<ol|<table|<li)(.+)$/gm, "$1")
    .replace(/<p><\/p>/g, "");
}

export default function ArticleDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(r => r.json())
      .then(d => { setArticle(d); setEditContent(d.content || ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function save(patch) {
    setSaving(true);
    setSuccess("");
    const res = await fetch(`/api/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) { setArticle(data); setSuccess("Sauvegardé."); }
    else setError(data.error || "Erreur.");
    setSaving(false);
  }

  async function handleSaveContent() {
    await save({ content: editContent });
    setEditing(false);
  }

  async function handleStatus(status) {
    const patch = { status };
    if (status === "ready_to_index") patch.ready_for_ask_anything = true;
    await save(patch);
  }

  async function handleDuplicate() {
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...article, id: undefined, title: `${article.title} (copie)`, status: "draft", version: 1 }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/articles/${data.id}`);
  }

  async function handleRegenerate() {
    router.push(`/articles/new`);
  }

  if (loading) return (
    <div className="page-body"><div className="card generating-state"><div className="spinner"></div><p>Chargement…</p></div></div>
  );

  if (!article || article.error) return (
    <div className="page-body"><div className="alert alert-error">Article introuvable.</div><Link href="/articles" className="btn btn-secondary">← Retour</Link></div>
  );

  const statusObj = STATUS_OPTIONS.find(s => s.value === article.status) || STATUS_OPTIONS[0];

  return (
    <>
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ marginBottom: 8 }}>
            <Link href="/articles" style={{ fontSize: 13, color: "var(--ink-muted)", textDecoration: "none" }}>← Bibliothèque</Link>
          </div>
          <h1 className="page-title">{article.title}</h1>
        </div>
        <span className={`badge ${statusObj.cls}`} style={{ fontSize: 13, padding: "5px 14px" }}>{statusObj.label}</span>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Meta */}
        <div className="meta-strip">
          <div className="meta-item">📌 <strong>{TYPE_LABELS[article.article_type] || article.article_type}</strong></div>
          <div className="meta-item">🌐 <strong>{article.language}</strong></div>
          {article.datasource_id && <div className="meta-item">🗄 <strong>{article.datasource_id}</strong></div>}
          {article.fields_used?.length > 0 && <div className="meta-item">🔤 <strong>{Array.isArray(article.fields_used) ? article.fields_used.join(", ") : article.fields_used}</strong></div>}
          <div className="meta-item">v<strong>{article.version || 1}</strong></div>
          {article.ready_for_ask_anything && <span className="badge badge-ready-to-index">✓ Ask Anything</span>}
        </div>

        {/* Actions */}
        <div className="action-bar" style={{ marginBottom: 24 }}>
          <button className="btn btn-primary btn-sm" onClick={() => save({ status: "approved" })} disabled={saving}>✓ Valider</button>
          <button className="btn btn-secondary btn-sm" onClick={() => save({ status: "needs_review" })} disabled={saving}>🔎 À revoir</button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleStatus("ready_to_index")} disabled={saving}>📤 Prêt à indexer</button>
          <button className="btn btn-ghost btn-sm" onClick={handleDuplicate} disabled={saving}>⎘ Dupliquer</button>
          <button className="btn btn-ghost btn-sm" onClick={handleRegenerate}>♻ Regénérer</button>
          <div style={{ marginLeft: "auto" }}>
            <select className="form-select" style={{ fontSize: 13, padding: "6px 10px" }} value={article.status} onChange={e => handleStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>Contenu de l'article</div>
            {!editing
              ? <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Modifier</button>
              : <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveContent} disabled={saving}>{saving ? "…" : "Sauvegarder"}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setEditContent(article.content); }}>Annuler</button>
                </div>
            }
          </div>

          {editing ? (
            <textarea
              className="form-textarea"
              style={{ minHeight: 500, fontFamily: "monospace", fontSize: 13 }}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
            />
          ) : (
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
            />
          )}
        </div>

        {/* Sources */}
        {article.sources_used?.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">Sources utilisées</div>
            <ul style={{ paddingLeft: 20, fontSize: 14, color: "var(--ink-muted)" }}>
              {(Array.isArray(article.sources_used) ? article.sources_used : [article.sources_used]).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
