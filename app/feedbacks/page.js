"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["new", "in_progress", "resolved", "closed"];
const STATUS_CLS = { new: "badge-needs-review", in_progress: "badge-draft", resolved: "badge-approved", closed: "badge-archived" };
const STATUS_LABELS = { new: "Nouveau", in_progress: "En cours", resolved: "Résolu", closed: "Fermé" };
const PRIORITY_LABELS = { low: "Faible", medium: "Moyen", high: "Haute" };
const LANGUAGES = ["Français", "English", "Español"];

export default function Feedbacks() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ message: "", article_id: "", language: "Français", priority: "medium", status: "new" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/feedbacks");
    const data = await res.json();
    setFeedbacks(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.message.trim()) { setError("Le message est requis."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/feedbacks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setForm({ message: "", article_id: "", language: "Français", priority: "medium", status: "new" }); await load(); }
    else setError("Erreur lors de la sauvegarde.");
    setSaving(false);
  }

  async function updateStatus(id, status) {
    await fetch(`/api/feedbacks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await load();
  }

  async function convertToArticle(fb) {
    router.push(`/articles/new`);
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Feedbacks utilisateurs</h1>
        <p className="page-subtitle">Retours des équipes pour améliorer les articles et la base de connaissance.</p>
      </div>

      <div className="page-body">
        <div className="action-bar">
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
            {showForm ? "Annuler" : "+ Nouveau feedback"}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ maxWidth: 600, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Nouveau feedback</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-textarea" placeholder="Décris le problème ou la demande…" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>
              <div className="three-col">
                <div className="form-group">
                  <label className="form-label">Langue</label>
                  <select className="form-select" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priorité</label>
                  <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Statut</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "…" : "Enregistrer"}</button>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}><div className="spinner"></div></div>
          ) : !feedbacks.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <h3>Aucun feedback</h3>
              <p>Les retours utilisateurs apparaîtront ici.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Message</th><th>Langue</th><th>Priorité</th><th>Statut</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {feedbacks.map(fb => (
                    <tr key={fb.id}>
                      <td style={{ maxWidth: 400 }}>
                        <div style={{ fontSize: 14, color: "var(--ink)" }}>{fb.message}</div>
                        {fb.article_id && <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>Article : {fb.article_id}</div>}
                      </td>
                      <td style={{ fontSize: 13 }}>{fb.language}</td>
                      <td>
                        <span className={`badge ${fb.priority === "high" ? "badge-needs-review" : fb.priority === "medium" ? "badge-draft" : "badge-approved"}`}>
                          {PRIORITY_LABELS[fb.priority] || fb.priority}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          style={{ fontSize: 12, padding: "4px 8px" }}
                          value={fb.status}
                          onChange={e => updateStatus(fb.id, e.target.value)}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--ink-muted)" }}>{fb.created_at ? new Date(fb.created_at).toLocaleDateString("fr-FR") : "—"}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => convertToArticle(fb)} title="Transformer en demande d'article">✨</button>
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
