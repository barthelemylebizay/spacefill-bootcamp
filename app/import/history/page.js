"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_LABELS = { pending: "En attente", processing: "En cours", completed: "Terminé", partial: "Partiel", error: "Erreur" };
const STATUS_COLORS = { pending: "#f59e0b", processing: "#3b82f6", completed: "#10b981", partial: "#f59e0b", error: "#ef4444" };

export default function ImportHistory() {
  const [imports, setImports] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [scope, setScope] = useState(null); // which client's history we may show

  useEffect(() => {
    // History is per client. Without a scope this page listed every client's imports to
    // anyone who opened the URL, so it now asks for the same identity the import screen
    // was opened with and shows nothing otherwise.
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get("customer_id");
    const accessId = params.get("access");

    async function load() {
      let query = "";
      if (customerId) {
        query = `customer_id=${encodeURIComponent(customerId)}`;
      } else if (accessId) {
        const access = await fetch(`/api/accesses/${accessId}`).then(r => r.ok ? r.json() : null).catch(() => null);
        const ids = (access?.clients || []).map(c => c.customer_id).filter(Boolean);
        if (ids.length) query = ids.map(id => `customer_id=${encodeURIComponent(id)}`)[0];
        setScope(access?.name || null);
      }
      if (!query) { setImports([]); setClients([]); setLoading(false); return; }

      const [imp, cli] = await Promise.all([
        fetch(`/api/imports?${query}`).then(r => r.json()).catch(() => []),
        fetch(`/api/clients?${query}`).then(r => r.json()).catch(() => []),
      ]);
      setImports(Array.isArray(imp) ? imp : []);
      setClients(Array.isArray(cli) ? cli : []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = imports.filter(i => {
    if (filterClient && i.client_id !== filterClient) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ background: "var(--secondary)", padding: "14px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/import" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>S</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>spacefill</span>
        </Link>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>/</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 14 }}>Historique des imports</span>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/import" style={{ background: "var(--primary)", color: "#fff", borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            + Nouvel import
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Historique des imports</h1>
        <p style={{ color: "var(--ink-muted)", fontSize: 14, marginBottom: 24 }}>{imports.length} import{imports.length !== 1 ? "s" : ""} au total</p>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <select style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">Tous les clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)" }}>Chargement…</div>
          ) : !filtered.length ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p style={{ fontWeight: 600, color: "var(--ink-muted)" }}>Aucun import</p>
              <Link href="/import" style={{ marginTop: 16, display: "inline-block", color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Lancer un premier import →</Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  {["Date", "Fichier", "Client", "Lignes", "Valides", "Erreurs", "Statut", "Commande Spacefill"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--ink-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(imp => (
                  <tr key={imp.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--ink-muted)", fontSize: 13 }}>{new Date(imp.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{imp.file_name || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--ink-muted)" }}>{imp.clients?.name || "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>{imp.total_rows || 0}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#10b981", fontWeight: 600 }}>{imp.valid_rows || 0}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: imp.error_rows > 0 ? "#ef4444" : "var(--ink-muted)", fontWeight: imp.error_rows > 0 ? 700 : 400 }}>{imp.error_rows || 0}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: STATUS_COLORS[imp.status] + "22", color: STATUS_COLORS[imp.status] || "var(--ink-muted)", fontWeight: 700 }}>
                        {STATUS_LABELS[imp.status] || imp.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: imp.spacefill_order_id ? "var(--primary)" : "var(--ink-muted)" }}>
                      {imp.spacefill_order_id || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
