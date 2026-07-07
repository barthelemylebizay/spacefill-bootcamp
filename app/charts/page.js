"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const CHART_TYPES = ["bar", "line", "pie", "table", "scatter", "area", "funnel", "heatmap"];

const VIZ_ICON = { bar: "📊", line: "📈", pie: "🥧", table: "📋", big_number: "🔢", sunburst: "☀️", scatter: "⚡" };

export default function ChartLibrary() {
  const [charts, setCharts] = useState([]);
  const [datasources, setDatasources] = useState([]);
  const [dashboards, setDashboards] = useState([]);
  const [filterDashboard, setFilterDashboard] = useState("");
  const [searchChart, setSearchChart] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", datasource_id: "", chart_type: "bar", business_goal: "", fields_used: "", available_filters: "", use_cases: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [c, d, db] = await Promise.all([fetch("/api/charts").then(r => r.json()), fetch("/api/datasources").then(r => r.json()), fetch("/api/dashboards").then(r => r.json())]);
    setCharts(Array.isArray(c) ? c : []);
    setDatasources(Array.isArray(d) ? d : []);
    setDashboards(Array.isArray(db) ? db : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditItem(null); setSelected(null); setForm({ name: "", description: "", datasource_id: "", chart_type: "bar", business_goal: "", fields_used: "", available_filters: "", use_cases: "" }); setShowForm(true); }
  function openEdit(item) {
    setEditItem(item); setSelected(null);
    setForm({ name: item.name, description: item.description || "", datasource_id: item.datasource_id || "", chart_type: item.chart_type || "bar", business_goal: item.business_goal || "", fields_used: Array.isArray(item.fields_used) ? item.fields_used.join(", ") : (item.fields_used || ""), available_filters: Array.isArray(item.available_filters) ? item.available_filters.join(", ") : (item.available_filters || ""), use_cases: Array.isArray(item.use_cases) ? item.use_cases.join("\n") : (item.use_cases || "") });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true); setError("");
    const payload = {
      ...form,
      fields_used: form.fields_used.split(",").map(s => s.trim()).filter(Boolean),
      available_filters: form.available_filters.split(",").map(s => s.trim()).filter(Boolean),
      use_cases: form.use_cases.split("\n").map(s => s.trim()).filter(Boolean),
    };
    const url = editItem ? `/api/charts/${editItem.id}` : "/api/charts";
    const method = editItem ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setShowForm(false); setEditItem(null); await load(); }
    else setError("Erreur lors de la sauvegarde.");
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce chart ?")) return;
    await fetch(`/api/charts/${id}`, { method: "DELETE" });
    await load();
  }

  const dsName = (id) => datasources.find(d => d.id === id)?.name || id || "—";

  const filteredCharts = charts.filter(c => {
    if (filterDashboard && !(c.dashboards || []).includes(filterDashboard)) return false;
    if (searchChart && !c.name?.toLowerCase().includes(searchChart.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Bibliothèque de charts</h1>
        <p className="page-subtitle">{charts.length} charts · {dashboards.length} dashboards Spacefill</p>
      </div>

      <div className="page-body">
        {!showForm && !selected ? (
          <>
            {/* Dashboards strip */}
            {dashboards.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Dashboards</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className={`btn btn-sm ${filterDashboard === "" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilterDashboard("")}>Tous</button>
                  {dashboards.map(db => (
                    <button key={db.id} className={`btn btn-sm ${filterDashboard === db.title ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilterDashboard(db.title)}>
                      {db.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="action-bar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Rechercher un chart…" value={searchChart} onChange={e => setSearchChart(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={openNew}>+ Ajouter un chart</button>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><div className="spinner"></div></div>
            ) : !filteredCharts.length ? (
              <div className="empty-state card">
                <div className="empty-state-icon">📊</div>
                <h3>Aucun chart</h3>
                <p>Ajoute les charts existants de Spacefill pour enrichir les articles.</p>
              </div>
            ) : (
              <div className="three-col">
                {filteredCharts.map(c => (
                  <div key={c.id} className="card" style={{ cursor: "pointer" }} onClick={() => setSelected(c)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ fontSize: 28 }}>{VIZ_ICON[c.chart_type] || "📊"}</span>
                      <span className="badge badge-draft" style={{ fontSize: 11 }}>{c.chart_type}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 10, lineHeight: 1.4 }}>{c.description}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 6 }}>🗄 {dsName(c.datasource_id)}</div>
                    {c.dashboards?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{c.dashboards.map(d => <span key={d} className="badge badge-ready-to-index" style={{ fontSize: 10 }}>{d}</span>)}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <Link href={`/articles/new`} className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}>✨ Générer un article</Link>
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEdit(c); }}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDelete(c.id); }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : selected ? (
          <div style={{ maxWidth: 700 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>← Retour</button>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selected.name}</h2>
                <span className="badge badge-draft">{selected.chart_type}</span>
              </div>
              <p style={{ color: "var(--ink-muted)", marginBottom: 16 }}>{selected.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", marginBottom: 4 }}>Datasource</div><div>{dsName(selected.datasource_id)}</div></div>
                <div><div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", marginBottom: 4 }}>Objectif</div><div>{selected.business_goal || "—"}</div></div>
              </div>
              {selected.fields_used?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", marginBottom: 6 }}>Champs utilisés</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(Array.isArray(selected.fields_used) ? selected.fields_used : [selected.fields_used]).map((f, i) => <code key={i} style={{ background: "var(--border-light)", padding: "2px 8px", borderRadius: 4, fontSize: 13 }}>{f}</code>)}
                  </div>
                </div>
              )}
              {selected.available_filters?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", marginBottom: 6 }}>Filtres disponibles</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(Array.isArray(selected.available_filters) ? selected.available_filters : [selected.available_filters]).map((f, i) => <span key={i} className="badge badge-draft">{f}</span>)}
                  </div>
                </div>
              )}
              {selected.use_cases?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", marginBottom: 6 }}>Cas d'usage</div>
                  <ul style={{ paddingLeft: 20, fontSize: 14, color: "var(--ink-muted)" }}>
                    {(Array.isArray(selected.use_cases) ? selected.use_cases : [selected.use_cases]).map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <Link href="/articles/new" className="btn btn-primary btn-sm">✨ Générer un article</Link>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(selected)}>✏️ Modifier</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>{editItem ? "Modifier le chart" : "Ajouter un chart"}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave} className="card">
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type de chart</label>
                  <select className="form-select" value={form.chart_type} onChange={e => setForm(f => ({ ...f, chart_type: e.target.value }))}>
                    {CHART_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Datasource</label>
                  <select className="form-select" value={form.datasource_id} onChange={e => setForm(f => ({ ...f, datasource_id: e.target.value }))}>
                    <option value="">Aucune</option>
                    {datasources.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Objectif métier</label>
                  <input className="form-input" value={form.business_goal} onChange={e => setForm(f => ({ ...f, business_goal: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Champs utilisés <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>(séparés par des virgules)</span></label>
                <input className="form-input" placeholder="warehouse_id, stock_level, product_category" value={form.fields_used} onChange={e => setForm(f => ({ ...f, fields_used: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Filtres disponibles <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>(séparés par des virgules)</span></label>
                <input className="form-input" placeholder="Entrepôt, Période, Statut" value={form.available_filters} onChange={e => setForm(f => ({ ...f, available_filters: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Cas d'usage <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>(un par ligne)</span></label>
                <textarea className="form-textarea" value={form.use_cases} onChange={e => setForm(f => ({ ...f, use_cases: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "…" : "Sauvegarder"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditItem(null); }}>Annuler</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
