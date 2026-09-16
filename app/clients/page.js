"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

// Embed links must point at the stable public address, never at the URL the admin
// happens to be opened from: a per-deployment Vercel URL is password-protected AND
// changes on every update, so links generated from one break as soon as we redeploy.
// NEXT_PUBLIC_APP_URL is set on Vercel only, so local work still yields localhost links.
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

function embedLink(c) {
  const params = new URLSearchParams();
  if (c.customer_id) params.set("customer_id", c.customer_id);
  if (c.warehouse_id) params.set("warehouse_id", c.warehouse_id);
  if (c.api_token) params.set("token", c.api_token);
  return `${BASE_URL}/import?${params.toString()}`;
}

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", customer_id: "", warehouse_id: "", api_token: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);

  async function load() {
    const data = await fetch("/api/clients").then(r => r.json());
    setClients(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditItem(null);
    setForm({ name: "", customer_id: "", warehouse_id: "", api_token: "" });
    setShowForm(true);
    setError("");
  }
  function openEdit(c) {
    setEditItem(c);
    setForm({ name: c.name, customer_id: c.customer_id || "", warehouse_id: c.warehouse_id || "", api_token: c.api_token || "" });
    setShowForm(true);
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    const url = editItem ? `/api/clients/${editItem.id}` : "/api/clients";
    const method = editItem ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setEditItem(null); await load(); }
    else { const d = await res.json(); setError(d.error || "Erreur."); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce client ?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    await load();
  }

  function copyLink(c) {
    const link = embedLink(c);
    navigator.clipboard.writeText(link);
    setCopied(c.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const S = {
    input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, outline: "none", boxSizing: "border-box" },
    label: { display: "block", fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 },
    btnPrimary: { background: "var(--primary)", color: "var(--ink)", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
    btnSecondary: { background: "#fff", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    th: { padding: "10px 14px", textAlign: "left", borderBottom: "2px solid var(--border)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--ink-muted)", whiteSpace: "nowrap" },
    td: { padding: "14px", borderBottom: "1px solid var(--border-light)", fontSize: 14, verticalAlign: "middle" },
    mono: { fontFamily: "monospace", fontSize: 12, background: "var(--bg)", padding: "3px 7px", borderRadius: 4, color: "var(--ink-muted)" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Top bar */}
      <div style={{ background: "var(--secondary)", padding: "14px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/import" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>S</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>spacefill</span>
        </Link>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>/</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 14 }}>Admin — Clients</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Clients</h1>
            <p style={{ color: "var(--ink-muted)", fontSize: 14, marginTop: 4 }}>Configurez les accès de chaque client et récupérez le lien à intégrer dans Spacefill.</p>
          </div>
          <button style={S.btnPrimary} onClick={openNew}>+ Nouveau client</button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>{editItem ? `Modifier — ${editItem.name}` : "Nouveau client"}</h3>
            {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSave}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={S.label}>Nom du client *</label>
                  <input style={S.input} placeholder="Ex : ABC Logistics" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>Customer ID Spacefill</label>
                  <input style={S.input} placeholder="Ex : cust_xxxxxxxx" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>Warehouse ID</label>
                  <input style={S.input} placeholder="Ex : wh_xxxxxxxx" value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>Token API</label>
                  <input style={{ ...S.input, fontFamily: "monospace", fontSize: 12 }} type="password" placeholder="eyJhbGciOi…" value={form.api_token} onChange={e => setForm(f => ({ ...f, api_token: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" style={S.btnPrimary} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
                <button type="button" style={S.btnSecondary} onClick={() => setShowForm(false)}>Annuler</button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--ink-muted)" }}>Chargement…</div>
        ) : !clients.length ? (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
            <p style={{ fontWeight: 600 }}>Aucun client encore</p>
            <p style={{ fontSize: 14, color: "var(--ink-muted)", marginTop: 4 }}>Ajoutez un client pour générer son lien d'accès.</p>
            <button style={{ ...S.btnPrimary, marginTop: 20 }} onClick={openNew}>+ Créer le premier client</button>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  <th style={S.th}>Client</th>
                  <th style={S.th}>Customer ID</th>
                  <th style={S.th}>Warehouse ID</th>
                  <th style={S.th}>Token API</th>
                  <th style={S.th}>Lien embed</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => {
                  const link = embedLink(c);
                  const hasAll = c.customer_id && c.api_token;
                  return (
                    <tr key={c.id}>
                      <td style={S.td}>
                        <span style={{ fontWeight: 700 }}>{c.name}</span>
                      </td>
                      <td style={S.td}>
                        {c.customer_id
                          ? <span style={S.mono}>{c.customer_id}</span>
                          : <span style={{ color: "#f59e0b", fontSize: 13 }}>—</span>}
                      </td>
                      <td style={S.td}>
                        {c.warehouse_id
                          ? <span style={S.mono}>{c.warehouse_id}</span>
                          : <span style={{ color: "var(--ink-light)", fontSize: 13 }}>—</span>}
                      </td>
                      <td style={S.td}>
                        {c.api_token
                          ? <span style={S.mono}>{c.api_token.slice(0, 10)}…</span>
                          : <span style={{ color: "#f59e0b", fontSize: 13 }}>Non configuré</span>}
                      </td>
                      <td style={S.td}>
                        {hasAll ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ ...S.mono, fontSize: 11, wordBreak: "break-all", display: "block" }}>
                              {embedLink(c)}
                            </span>
                            <button
                              style={{ ...S.btnSecondary, padding: "5px 10px", fontSize: 12, alignSelf: "flex-start", background: copied === c.id ? "#f0fdf4" : "#fff", color: copied === c.id ? "#166534" : "var(--ink)", borderColor: copied === c.id ? "#86efac" : "var(--border)" }}
                              onClick={() => copyLink(c)}
                            >
                              {copied === c.id ? "✓ Copié !" : "Copier le lien"}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: "#f59e0b" }}>Customer ID + token requis</span>
                        )}
                      </td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button style={S.btnSecondary} onClick={() => openEdit(c)}>Modifier</button>
                          <button style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" }} onClick={() => handleDelete(c.id)}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
