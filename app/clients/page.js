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

// The link carries only the access id — credentials are fetched server-side once the
// shipper is known, so a 3PL link never exposes its shippers' tokens.
const embedLink = (a) => `${BASE_URL}/import?access=${a.id}`;

const emptyClient = () => ({ name: "", customer_id: "", warehouse_id: "", api_token: "" });

export default function AccessesPage() {
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", type: "SHIPPER", clients: [emptyClient()] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);

  async function load() {
    const data = await fetch("/api/accesses").then(r => r.json());
    setAccesses(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew(type) {
    setEditItem(null);
    setForm({ name: "", type, clients: [emptyClient()] });
    setShowForm(true);
    setError("");
  }

  function openEdit(a) {
    setEditItem(a);
    setForm({
      name: a.name,
      type: a.type,
      // Carry the id so the server updates these rows instead of recreating them —
      // recreating changes their id and cascades away their saved mapping profiles.
      clients: (a.clients || []).length
        ? a.clients.map(c => ({ id: c.id, name: c.name || "", customer_id: c.customer_id || "", warehouse_id: c.warehouse_id || "", api_token: c.api_token || "" }))
        : [emptyClient()],
    });
    setShowForm(true);
    setError("");
  }

  function setClient(i, patch) {
    setForm(f => ({ ...f, clients: f.clients.map((c, idx) => idx === i ? { ...c, ...patch } : c) }));
  }
  const addClient = () => setForm(f => ({ ...f, clients: [...f.clients, emptyClient()] }));
  const removeClient = (i) => setForm(f => ({ ...f, clients: f.clients.filter((_, idx) => idx !== i) }));

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Le nom est requis."); return; }
    const filled = form.clients.filter(c => c.name.trim());
    if (!filled.length) { setError("Ajoutez au moins un client."); return; }
    if (filled.some(c => !c.api_token.trim())) { setError("Chaque client doit avoir un token."); return; }

    setSaving(true);

    // Catch a bad token here rather than after a whole import fails with "Unauthorized".
    try {
      const check = await fetch("/api/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: filled.map(c => c.api_token.trim()) }),
      });
      const { results } = await check.json();
      const bad = filled.filter(c => results?.[c.api_token.trim()] === false);
      if (bad.length) {
        setError(`Token refusé par Spacefill pour : ${bad.map(c => c.name).join(", ")}. Vérifiez qu'il ne s'agit pas d'un autre identifiant (entrepôt ou client).`);
        setSaving(false);
        return;
      }
    } catch {
      // Verification unavailable — saving anyway is better than blocking the admin.
    }

    const url = editItem ? `/api/accesses/${editItem.id}` : "/api/accesses";
    const res = await fetch(url, {
      method: editItem ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clients: filled }),
    });
    if (res.ok) { setShowForm(false); setEditItem(null); await load(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Erreur."); }
    setSaving(false);
  }

  async function handleDelete(a) {
    if (!confirm(`Supprimer l'accès "${a.name}" ?`)) return;
    await fetch(`/api/accesses/${a.id}`, { method: "DELETE" });
    await load();
  }

  function copyLink(a) {
    navigator.clipboard.writeText(embedLink(a));
    setCopied(a.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const S = {
    input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, outline: "none", boxSizing: "border-box" },
    label: { display: "block", fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 },
    btnPrimary: { background: "var(--primary)", color: "var(--ink)", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
    btnSecondary: { background: "#fff", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    th: { padding: "10px 14px", textAlign: "left", borderBottom: "2px solid var(--border)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--ink-muted)", whiteSpace: "nowrap" },
    td: { padding: "14px", borderBottom: "1px solid var(--border-light)", fontSize: 14, verticalAlign: "middle" },
    mono: { fontFamily: "monospace", fontSize: 12, background: "var(--bg)", padding: "3px 7px", borderRadius: 4, color: "var(--ink-muted)", wordBreak: "break-all" },
  };

  const isThreePL = form.type === "3PL";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ background: "var(--secondary)", padding: "14px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/import" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>S</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>spacefill</span>
        </Link>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>/</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 14 }}>Admin — Accès</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Accès</h1>
            <p style={{ color: "var(--ink-muted)", fontSize: 14, marginTop: 4 }}>
              Créez un lien d'import, puis intégrez-le dans Spacefill.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.btnSecondary} onClick={() => openNew("SHIPPER")}>+ Chargeur</button>
            <button style={S.btnPrimary} onClick={() => openNew("3PL")}>+ Logisticien</button>
          </div>
        </div>

        {showForm && (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
              {editItem ? `Modifier — ${editItem.name}` : isThreePL ? "Nouvel accès logisticien" : "Nouvel accès chargeur"}
            </h3>
            <form onSubmit={handleSave}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={S.label}>{isThreePL ? "Nom du logisticien" : "Nom du chargeur"} *</label>
                  <input style={S.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={isThreePL ? "ex : Logistique Dupont" : "ex : Metze Care"} autoFocus />
                </div>
                <div>
                  <label style={S.label}>Type d'accès</label>
                  <select style={S.input} value={form.type}
                    onChange={e => {
                      const type = e.target.value;
                      // A shipper access is for one company only — keep just the first line.
                      setForm(f => ({ ...f, type, clients: type === "SHIPPER" ? f.clients.slice(0, 1) : f.clients }));
                    }}>
                    <option value="SHIPPER">Chargeur — un seul client</option>
                    <option value="3PL">Logisticien — plusieurs clients</option>
                  </select>
                </div>
              </div>

              <div style={{ background: "var(--bg)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                  {isThreePL ? "Clients de ce logisticien" : "Identifiants Spacefill"}
                </div>
                <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 14 }}>
                  {isThreePL
                    ? "Le logisticien choisira l'un de ces clients au moment de créer ses commandes."
                    : "Ce chargeur ne pourra créer des commandes que pour lui-même."}
                </p>

                {form.clients.map((c, i) => (
                  <div key={i} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: isThreePL ? "1fr 1fr 1fr 1fr auto" : "1fr 1fr 1fr 1fr", gap: 10, alignItems: "end" }}>
                      <div>
                        <label style={{ ...S.label, fontSize: 10 }}>Nom *</label>
                        <input style={S.input} value={c.name} onChange={e => setClient(i, { name: e.target.value })} placeholder="Nom du client" />
                      </div>
                      <div>
                        <label style={{ ...S.label, fontSize: 10 }}>Customer ID</label>
                        <input style={S.input} value={c.customer_id} onChange={e => setClient(i, { customer_id: e.target.value })} placeholder="uuid" />
                      </div>
                      <div>
                        <label style={{ ...S.label, fontSize: 10 }}>Warehouse ID</label>
                        <input style={S.input} value={c.warehouse_id} onChange={e => setClient(i, { warehouse_id: e.target.value })} placeholder="uuid" />
                      </div>
                      <div>
                        <label style={{ ...S.label, fontSize: 10 }}>Token API *</label>
                        <input style={{ ...S.input, fontFamily: "monospace", fontSize: 12 }} type="password" value={c.api_token}
                          onChange={e => setClient(i, { api_token: e.target.value })} placeholder="token" />
                      </div>
                      {isThreePL && (
                        <button type="button" onClick={() => removeClient(i)} disabled={form.clients.length === 1}
                          style={{ ...S.btnSecondary, color: "#dc2626", borderColor: "#fecaca", opacity: form.clients.length === 1 ? 0.4 : 1 }}>
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isThreePL && (
                  <button type="button" style={S.btnSecondary} onClick={addClient}>+ Ajouter un client</button>
                )}
              </div>

              {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 14 }}>{error}</p>}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }} disabled={saving}>
                  {saving ? "Enregistrement…" : editItem ? "Enregistrer" : "Créer l'accès"}
                </button>
                <button type="button" style={S.btnSecondary} onClick={() => { setShowForm(false); setEditItem(null); }}>Annuler</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>Chargement…</p>
        ) : !accesses.length ? (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🔑</div>
            <p style={{ fontWeight: 600 }}>Aucun accès pour le moment</p>
            <p style={{ fontSize: 14, color: "var(--ink-muted)", marginTop: 4 }}>Créez un accès chargeur ou logisticien pour générer son lien.</p>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  <th style={S.th}>Accès</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>Clients</th>
                  <th style={S.th}>Lien à intégrer</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {accesses.map(a => {
                  const three = a.type === "3PL";
                  return (
                    <tr key={a.id}>
                      <td style={{ ...S.td, fontWeight: 700 }}>{a.name}</td>
                      <td style={S.td}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                          background: three ? "#ede9fe" : "var(--primary-light)",
                          color: three ? "#5b21b6" : "var(--primary-dark)",
                        }}>
                          {three ? "Logisticien" : "Chargeur"}
                        </span>
                      </td>
                      <td style={S.td}>
                        {three
                          ? <span>{(a.clients || []).length} client{(a.clients || []).length > 1 ? "s" : ""}</span>
                          : <span style={{ color: "var(--ink-muted)" }}>{a.clients?.[0]?.name || "—"}</span>}
                      </td>
                      <td style={{ ...S.td, maxWidth: 330 }}>
                        <div style={S.mono}>{embedLink(a)}</div>
                        <button style={{ ...S.btnSecondary, marginTop: 8 }} onClick={() => copyLink(a)}>
                          {copied === a.id ? "✓ Copié" : "Copier le lien"}
                        </button>
                      </td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={S.btnSecondary} onClick={() => openEdit(a)}>Modifier</button>
                          <button style={{ ...S.btnSecondary, color: "#dc2626", borderColor: "#fecaca" }} onClick={() => handleDelete(a)}>Supprimer</button>
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
