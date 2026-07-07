"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_LABELS = {
  draft: "Brouillon",
  needs_review: "À revoir",
  approved: "Validé",
  ready_to_index: "Prêt à indexer",
  archived: "Archivé",
};

const TYPE_LABELS = {
  create_chart: "Créer un chart",
  modify_chart: "Modifier un chart",
  use_chart: "Utiliser un chart",
};

function StatusBadge({ status }) {
  const cls = {
    draft: "badge-draft",
    needs_review: "badge-needs-review",
    approved: "badge-approved",
    ready_to_index: "badge-ready-to-index",
    archived: "badge-archived",
  }[status] || "badge-draft";
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status] || status}</span>;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Vue d'ensemble du moteur de génération d'articles Superset</p>
      </div>

      <div className="page-body">
        {/* CTA */}
        <div className="cta-card">
          <div>
            <h2>Générer un article d'aide</h2>
            <p>Décris ta demande en langage naturel — le moteur IA s'occupe du reste.</p>
          </div>
          <Link href="/articles/new" className="btn btn-lg">✨ Nouvelle demande</Link>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Articles générés</div>
            <div className="stat-value">{loading ? "—" : (stats?.total_articles ?? 0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">À revoir</div>
            <div className="stat-value orange">{loading ? "—" : (stats?.needs_review ?? 0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Prêts à indexer</div>
            <div className="stat-value green">{loading ? "—" : (stats?.ready_to_index ?? 0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Feedbacks reçus</div>
            <div className="stat-value">{loading ? "—" : (stats?.total_feedbacks ?? 0)}</div>
          </div>
        </div>

        {/* Quick access */}
        <div className="two-col" style={{ marginBottom: 28 }}>
          <div className="card">
            <div className="card-title">Accès rapide</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { href: "/knowledge", icon: "📚", label: "Sources de connaissance" },
                { href: "/fields", icon: "🗂", label: "Mapping des champs Superset" },
                { href: "/charts", icon: "📊", label: "Bibliothèque de charts" },
                { href: "/feedbacks", icon: "💬", label: "Feedbacks utilisateurs" },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 7, background: "var(--bg)", color: "var(--ink)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  {item.label}
                  <span style={{ marginLeft: "auto", color: "var(--ink-muted)" }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Derniers articles générés</div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}><div className="spinner"></div></div>
            ) : !stats?.recent_articles?.length ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <p>Aucun article pour l'instant.<br />Génère ton premier article !</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stats.recent_articles.map(a => (
                  <Link key={a.id} href={`/articles/${a.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "#fff" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{TYPE_LABELS[a.article_type] || a.article_type} · {a.language}</div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  </Link>
                ))}
                <Link href="/articles" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>Voir tous les articles →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
