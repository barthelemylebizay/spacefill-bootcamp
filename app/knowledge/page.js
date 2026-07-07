"use client";
import { useState, useEffect } from "react";

const SOURCE_TYPES = ["documentation", "guide_interne", "article_spacefill", "documentation_metier"];
const LANGUAGES = ["Français", "English", "Español"];

export default function Knowledge() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: "", source_type: "documentation", content: "", url: "", language: "Français", is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/knowledge");
    const data = await res.json();
    setSources(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditItem(null); setForm({ title: "", source_type: "documentation", content: "", url: "", language: "Français", is_active: true }); setShowForm(true); }
  function openEdit(item) { setEditItem(item); setForm({ title: item.title, source_type: item.source_type, content: item.content || "", url: item.url || "", language: item.language || "Français", is_active: item.is_active }); setShowForm(true); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Le titre est requis."); return; }
    setSaving(true); setError("");
    const url = editItem ? `/api/knowledge/${editItem.id}` : "/api/knowledge";
    const method = editItem ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setEditItem(null); await load(); }
    else setError("Erreur lors de la sauvegarde.");
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette source ?")) return;
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    await load();
  }

  async function toggleActive(item) {
    await fetch(`/api/knowledge/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !item.is_active }) });
    await load();
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Sources de connaissance</h1>
        <p className="page-subtitle">Gérer les sources utilisées par le moteur IA pour générer les articles.</p>
      </div>

      <div className="page-body">
        {!showForm ? (
          <>
            <div className="action-bar">
              <button className="btn btn-primary btn-sm" onClick={openNew}>+ Ajouter une source</button>
            </div>

            <div className="card" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center" }}><div className="spinner"></div></div>
              ) : !sources.length ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📚</div>
                  <h3>Aucune source</h3>
                  <p>Ajoute des sources pour enrichir la génération d'articles.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Nom</th><th>Type</th><th>Langue</th><th>Mise à jour</th><th>Statut</th><th></th></tr></thead>
                    <tbody>
                      {sources.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                            {s.url && <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>{s.url}</div>}
                          </td>
                          <td style={{ fontSize: 13, color: "var(--ink-muted)" }}>{s.source_type}</td>
                          <td style={{ fontSize: 13 }}>{s.language}</td>
                          <td style={{ fontSize: 13, color: "var(--ink-muted)" }}>{s.updated_at ? new Date(s.updated_at).toLocaleDateString("fr-FR") : "—"}</td>
                          <td>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                              <input type="checkbox" checked={s.is_active} onChange={() => toggleActive(s)} />
                              {s.is_active ? <span className="badge badge-green">Actif</span> : <span className="badge badge-draft">Inactif</span>}
                            </label>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>{editItem ? "Modifier la source" : "Ajouter une source"}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} className="card">
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}>
                    {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Langue</label>
                  <select className="form-select" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">URL <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>(optionnel)</span></label>
                <input className="form-input" type="url" placeholder="https://…" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contenu texte <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>(optionnel)</span></label>
                <textarea className="form-textarea" style={{ minHeight: 120 }} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Source active
                </label>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "…" : "Sauvegarder"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
