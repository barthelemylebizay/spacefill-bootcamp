"use client";
import { useState, useEffect } from "react";

const DATA_TYPES = ["string", "integer", "float", "datetime", "boolean", "array"];

export default function FieldsMapping() {
  const [fields, setFields] = useState([]);
  const [datasources, setDatasources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterDs, setFilterDs] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ datasource_id: "", api_field_name: "", business_label: "", data_type: "string", business_description: "", example_values: "", recommended_usage: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [f, d] = await Promise.all([fetch("/api/fields").then(r => r.json()), fetch("/api/datasources").then(r => r.json())]);
    setFields(Array.isArray(f) ? f : []);
    setDatasources(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditItem(null); setForm({ datasource_id: filterDs || "", api_field_name: "", business_label: "", data_type: "string", business_description: "", example_values: "", recommended_usage: false }); setShowForm(true); }
  function openEdit(item) { setEditItem(item); setForm({ datasource_id: item.datasource_id || "", api_field_name: item.api_field_name, business_label: item.business_label, data_type: item.data_type, business_description: item.business_description || "", example_values: item.example_values || "", recommended_usage: !!item.recommended_usage }); setShowForm(true); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.api_field_name.trim() || !form.business_label.trim()) { setError("Nom API et libellé métier sont requis."); return; }
    setSaving(true); setError("");
    const url = editItem ? `/api/fields/${editItem.id}` : "/api/fields";
    const method = editItem ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setEditItem(null); await load(); }
    else setError("Erreur lors de la sauvegarde.");
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce mapping ?")) return;
    await fetch(`/api/fields/${id}`, { method: "DELETE" });
    await load();
  }

  const dsName = (id) => datasources.find(d => d.id === id)?.name || id;

  const filtered = fields.filter(f => {
    if (filterDs && f.datasource_id !== filterDs) return false;
    const q = search.toLowerCase();
    if (q && !f.api_field_name?.toLowerCase().includes(q) && !f.business_label?.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Mapping des champs</h1>
        <p className="page-subtitle">Traduire les noms techniques Superset en libellés compréhensibles.</p>
      </div>

      <div className="page-body">
        {!showForm ? (
          <>
            <div className="action-bar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Rechercher un champ…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select" style={{ maxWidth: 200 }} value={filterDs} onChange={e => setFilterDs(e.target.value)}>
                <option value="">Toutes les datasources</option>
                {datasources.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={openNew}>+ Ajouter un champ</button>
            </div>

            <div className="card" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center" }}><div className="spinner"></div></div>
              ) : !filtered.length ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🗂</div>
                  <h3>Aucun champ mappé</h3>
                  <p>Ajoute des mappings pour aider le moteur IA à choisir les bons champs.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Nom API</th><th>Libellé métier</th><th>Type</th><th>Datasource</th><th>Recommandé</th><th></th></tr></thead>
                    <tbody>
                      {filtered.map(f => (
                        <tr key={f.id}>
                          <td><code style={{ background: "var(--border-light)", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>{f.api_field_name}</code></td>
                          <td style={{ fontWeight: 600, fontSize: 14 }}>{f.business_label}</td>
                          <td style={{ fontSize: 12, color: "var(--ink-muted)" }}>{f.data_type}</td>
                          <td style={{ fontSize: 13 }}>{dsName(f.datasource_id)}</td>
                          <td>{f.recommended_usage ? <span className="badge badge-green">✓</span> : <span className="badge badge-draft">—</span>}</td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}>🗑</button>
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
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>{editItem ? "Modifier le champ" : "Ajouter un champ"}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} className="card">
              <div className="form-group">
                <label className="form-label">Datasource</label>
                <select className="form-select" value={form.datasource_id} onChange={e => setForm(f => ({ ...f, datasource_id: e.target.value }))}>
                  <option value="">Aucune</option>
                  {datasources.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Nom API *</label>
                  <input className="form-input" placeholder="warehouse_id" value={form.api_field_name} onChange={e => setForm(f => ({ ...f, api_field_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Libellé métier *</label>
                  <input className="form-input" placeholder="Entrepôt" value={form.business_label} onChange={e => setForm(f => ({ ...f, business_label: e.target.value }))} />
                </div>
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Type de donnée</label>
                  <select className="form-select" value={form.data_type} onChange={e => setForm(f => ({ ...f, data_type: e.target.value }))}>
                    {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Exemples de valeurs</label>
                  <input className="form-input" placeholder="WH_PARIS_01, WH_LYON_02" value={form.example_values} onChange={e => setForm(f => ({ ...f, example_values: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description métier</label>
                <textarea className="form-textarea" value={form.business_description} onChange={e => setForm(f => ({ ...f, business_description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                  <input type="checkbox" checked={form.recommended_usage} onChange={e => setForm(f => ({ ...f, recommended_usage: e.target.checked }))} />
                  Champ recommandé
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
