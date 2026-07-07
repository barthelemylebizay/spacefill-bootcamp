"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  {
    section: "Moteur IA",
    items: [
      { href: "/dashboard", icon: "⬛", label: "Tableau de bord" },
      { href: "/articles/new", icon: "✨", label: "Générer un article" },
    ],
  },
  {
    section: "Articles",
    items: [
      { href: "/articles", icon: "📄", label: "Bibliothèque" },
      { href: "/feedbacks", icon: "💬", label: "Feedbacks" },
    ],
  },
  {
    section: "Base de connaissance",
    items: [
      { href: "/knowledge", icon: "📚", label: "Sources" },
      { href: "/fields", icon: "🗂", label: "Mapping des champs" },
      { href: "/charts", icon: "📊", label: "Charts Spacefill" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-dot">S</div>
        <div>
          <div className="sidebar-logo-text">Superset Helper</div>
          <div className="sidebar-logo-sub">Spacefill AI</div>
        </div>
      </div>

      {nav.map((section) => (
        <div key={section.section} className="sidebar-section">
          <div className="sidebar-section-label">{section.section}</div>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)) ? "active" : ""}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
