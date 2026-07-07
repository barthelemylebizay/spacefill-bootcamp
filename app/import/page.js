"use client";
import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { suggestMappings } from "@/lib/mapping-engine";
import { validateRows } from "@/lib/validation-engine";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Import" },
  { id: 2, label: "Détection" },
  { id: 3, label: "Mapping" },
  { id: 4, label: "Vérification" },
  { id: 5, label: "Validation" },
  { id: 6, label: "Envoi" },
  { id: 7, label: "Résultat" },
];

// ─── Stepper bar ─────────────────────────────────────────────────────────────

function Stepper({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32, overflowX: "auto", paddingBottom: 4 }}>
      {STEPS.map((s, i) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 64 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: current === s.id ? "var(--primary)" : current > s.id ? "var(--primary)" : "var(--border)",
              color: current >= s.id ? "#fff" : "var(--ink-muted)",
              fontSize: 13, fontWeight: 700, transition: "background 0.2s",
            }}>
              {current > s.id ? "✓" : s.id}
            </div>
            <span style={{ fontSize: 11, color: current === s.id ? "var(--primary)" : "var(--ink-muted)", fontWeight: current === s.id ? 700 : 400 }}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 24, height: 2, background: current > s.id ? "var(--primary)" : "var(--border)", margin: "0 2px 20px", flexShrink: 0 }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1 : Import ─────────────────────────────────────────────────────────

function StepImport({ onParsed, isEmbed }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderType, setOrderType] = useState("EXIT");
  const inputRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xls", "xlsx"].includes(ext)) { setError("Format non supporté. Accepté : CSV, XLS, XLSX."); return; }
    setLoading(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/parse-file", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Erreur lors de la lecture du fichier."); setLoading(false); return; }
    setLoading(false);
    onParsed({ ...data, orderType });
  }

  return (
    <div style={{ maxWidth: 660 }}>
      <h1 style={styles.title}>Importer un fichier commandes</h1>
      <p style={styles.subtitle}>
        Convertissez un fichier CSV ou Excel en commande Spacefill en quelques étapes.
        {isEmbed && <span style={{ marginLeft: 8, fontSize: 12, background: "var(--primary-light)", color: "var(--primary)", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>Accès client</span>}
      </p>

      <div style={styles.card}>
        <label style={styles.label}>Type de commande</label>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[
            { value: "EXIT", icon: "📤", label: "Expédition (sortie)", desc: "Commandes à expédier vers un destinataire" },
            { value: "ENTRY", icon: "📥", label: "Réception (entrée)", desc: "Commandes à réceptionner d'un fournisseur" },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setOrderType(t.value)}
              style={{
                flex: 1, padding: "16px 18px", border: `2px solid ${orderType === t.value ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 10, background: orderType === t.value ? "var(--primary-light)" : "var(--bg)",
                cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, color: orderType === t.value ? "var(--primary)" : "var(--ink)", fontSize: 14 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        <label style={styles.label}>Fichier à importer</label>
        <div
          style={{
            border: `2px dashed ${dragging ? "var(--primary)" : "var(--border)"}`,
            borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer",
            background: dragging ? "var(--primary-light)" : "var(--bg)",
            transition: "all 0.15s",
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? (
            <div><div style={styles.spinner} /><p style={{ marginTop: 12, color: "var(--ink-muted)" }}>Analyse du fichier…</p></div>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <p style={{ fontWeight: 600, color: "var(--ink)" }}>Glissez votre fichier ici ou cliquez pour parcourir</p>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 6 }}>CSV, XLS, XLSX — UTF-8, ANSI, Latin-1 acceptés</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        {error && <div style={styles.error}>{error}</div>}
      </div>

      {!isEmbed && (
        <div style={{ marginTop: 20, padding: "14px 18px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--ink-muted)" }}>
          💡 <strong style={{ color: "var(--ink)" }}>Intégration Spacefill :</strong> cette page peut être intégrée directement dans l'espace d'un client via{" "}
          <code style={{ background: "var(--border-light)", padding: "1px 6px", borderRadius: 4 }}>/import?customer_id=xxx&token=xxx</code>.
          Son token est utilisé automatiquement pour créer les commandes.
        </div>
      )}
    </div>
  );
}

// ─── Step 2 : Detection ───────────────────────────────────────────────────────

function StepDetection({ parsed, onContinue, onBack }) {
  const [headerRow, setHeaderRow] = useState(parsed.headerRowIndex || 0);
  const [delimiter, setDelimiter] = useState(parsed.delimiter || ",");

  function getHeaders() {
    return (parsed.rows[headerRow] || []).map(h => String(h).trim());
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <h2 style={styles.title}>Détection du fichier</h2>
      <p style={styles.subtitle}>Vérifiez les paramètres détectés automatiquement.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Fichier</div>
          <div style={styles.infoValue}>{parsed.fileName}</div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Lignes détectées</div>
          <div style={styles.infoValue}>{parsed.totalRows}</div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Encodage</div>
          <div style={styles.infoValue}>{parsed.encoding}</div>
        </div>
        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Colonnes</div>
          <div style={styles.infoValue}>{getHeaders().length}</div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={styles.label}>Ligne d'en-tête</label>
            <input style={styles.input} type="number" min={0} max={10} value={headerRow} onChange={e => setHeaderRow(Number(e.target.value))} />
            <p style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4 }}>0 = première ligne</p>
          </div>
          {parsed.delimiter !== null && (
            <div>
              <label style={styles.label}>Délimiteur CSV</label>
              <select style={styles.select} value={delimiter} onChange={e => setDelimiter(e.target.value)}>
                <option value=",">, (virgule)</option>
                <option value=";">; (point-virgule)</option>
                <option value={"\t"}>⇥ (tabulation)</option>
                <option value="|">| (pipe)</option>
              </select>
            </div>
          )}
        </div>

        <label style={styles.label}>Aperçu des données</label>
        <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                {getHeaders().map((h, i) => (
                  <th key={i} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, whiteSpace: "nowrap", color: "var(--primary)" }}>
                    {h || `Colonne ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.slice(headerRow + 1, headerRow + 6).map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  {getHeaders().map((_, ci) => (
                    <td key={ci} style={{ padding: "8px 12px", color: "var(--ink-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row[ci] || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.actions}>
        <button style={styles.btnSecondary} onClick={onBack}>← Retour</button>
        <button style={styles.btnPrimary} onClick={() => onContinue({ headerRowIndex: headerRow, delimiter })}>
          Continuer vers le mapping →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 : Mapping ─────────────────────────────────────────────────────────

function StepMapping({ parsed, headerRowIndex, spacefillFields, onContinue, onBack }) {
  const headers = (parsed.rows[headerRowIndex] || []).map(h => String(h).trim());
  const [suggestions] = useState(() => suggestMappings(headers, spacefillFields));
  const [mappings, setMappings] = useState(() => {
    const m = {};
    suggestions.forEach(s => { if (s.suggestedField) m[s.sourceColumn] = s.suggestedField.id; });
    return m;
  });
  const [search, setSearch] = useState("");

  const filteredFields = spacefillFields.filter(f =>
    !search || f.label.toLowerCase().includes(search.toLowerCase()) || f.field_key.toLowerCase().includes(search.toLowerCase())
  );

  const mappedCount = Object.values(mappings).filter(Boolean).length;
  const requiredCount = spacefillFields.filter(f => f.is_required).length;
  const requiredMapped = spacefillFields.filter(f => f.is_required && Object.values(mappings).includes(f.id)).length;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={styles.title}>Mapping des colonnes</h2>
      <p style={styles.subtitle}>Le mapping a été détecté automatiquement — ajustez si besoin.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, padding: "10px 16px", border: "1px solid var(--border)" }}>
          <span style={{ fontWeight: 700, color: "var(--primary)" }}>{mappedCount}</span><span style={{ color: "var(--ink-muted)", fontSize: 14 }}> / {headers.length} colonnes mappées</span>
          <span style={{ margin: "0 12px", color: "var(--border)" }}>|</span>
          <span style={{ fontWeight: 700, color: requiredMapped === requiredCount ? "var(--primary)" : "#ef4444" }}>{requiredMapped}</span><span style={{ color: "var(--ink-muted)", fontSize: 14 }}> / {requiredCount} champs obligatoires</span>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                <th style={styles.th}>Colonne fichier</th>
                <th style={styles.th}>Exemple de valeur</th>
                <th style={styles.th}>
                  Champ Spacefill
                  <input placeholder="Filtrer…" style={{ marginLeft: 8, fontSize: 12, padding: "2px 8px", border: "1px solid var(--border)", borderRadius: 4 }} value={search} onChange={e => setSearch(e.target.value)} />
                </th>
                <th style={styles.th}>Obligatoire</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((header, i) => {
                const exampleVal = (parsed.rows[headerRowIndex + 1] || [])[i] || "";
                const suggestion = suggestions[i];
                const isAutoMapped = suggestion?.confidence >= 30 && mappings[header] === suggestion?.suggestedField?.id;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{header}</td>
                    <td style={{ padding: "10px 12px", color: "var(--ink-muted)", fontFamily: "monospace", fontSize: 13, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{String(exampleVal)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isAutoMapped && (
                          <span style={{ fontSize: 11, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
                            ✨ auto
                          </span>
                        )}
                        <select
                          style={{ ...styles.select, minWidth: 200 }}
                          value={mappings[header] || ""}
                          onChange={e => setMappings(m => ({ ...m, [header]: e.target.value }))}
                        >
                          <option value="">— Ignorer cette colonne —</option>
                          {(search ? filteredFields : spacefillFields).map(f => (
                            <option key={f.id} value={f.id}>{f.label} {f.is_required ? "*" : ""}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {spacefillFields.find(f => f.id === mappings[header])?.is_required ? (
                        <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.actions}>
        <button style={styles.btnSecondary} onClick={onBack}>← Retour</button>
        <button style={styles.btnPrimary} onClick={() => onContinue(mappings)}>
          Vérifier les données →
        </button>
      </div>
    </div>
  );
}

// ─── Auto-formatting (applied silently after mapping) ─────────────────────────

const DATE_FIELDS = new Set(["delivery_date", "date", "planned_datetime_range", "created_at"]);
const NUMBER_FIELDS = new Set(["expected_quantity", "gross_weight", "volume", "linear_meter"]);
const BOOL_FIELDS = new Set(["is_dangerous", "is_refrigerated"]);

function autoFormatValue(value, fieldKey) {
  if (value === null || value === undefined) return "";
  let v = String(value).trim();

  // Fix Windows-1252 artifacts encoded as UTF-8 sequences
  v = v
    .replace(/Ã©/g, "é").replace(/Ã¨/g, "è").replace(/Ã /g, "à").replace(/Ã´/g, "ô")
    .replace(/Ã®/g, "î").replace(/Ã¹/g, "ù").replace(/Ã«/g, "ë").replace(/Ã§/g, "ç")
    .replace(/Ã¢/g, "â").replace(/Ã»/g, "û").replace(/Ã¯/g, "ï").replace(/Ã¼/g, "ü")
    .replace(/â€™/g, "'").replace(/â€œ/g, '"').replace(/â€/g, '"')
    .replace(/â€¦/g, "…").replace(/â€"/g, "–");

  if (DATE_FIELDS.has(fieldKey) || fieldKey.endsWith("_date")) {
    const dmY = v.match(/^(\d{1,2})[\/\-.:](\d{1,2})[\/\-.:](\d{4})$/);
    if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, "0")}-${dmY[1].padStart(2, "0")}`;
    const Ymd = v.match(/^(\d{4})[\/\-.:](\d{1,2})[\/\-.:](\d{1,2})$/);
    if (Ymd) return `${Ymd[1]}-${Ymd[2].padStart(2, "0")}-${Ymd[3].padStart(2, "0")}`;
    const compact = v.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  }

  if (NUMBER_FIELDS.has(fieldKey)) {
    const cleaned = v.replace(/\s/g, "").replace(/,/g, ".");
    if (/^\d+(\.\d+)?$/.test(cleaned)) return cleaned;
  }

  if (BOOL_FIELDS.has(fieldKey)) {
    const lower = v.toLowerCase();
    if (["oui", "yes", "true", "1", "o"].includes(lower)) return "true";
    if (["non", "no", "false", "0", "n"].includes(lower)) return "false";
  }

  return v;
}

function autoFormatRow(row) {
  const result = {};
  for (const [key, val] of Object.entries(row)) {
    result[key] = autoFormatValue(val, key);
  }
  return result;
}

// ─── Step 4 : Preview ─────────────────────────────────────────────────────────

function StepPreview({ formattedRows, headers, spacefillFields, onContinue, onBack }) {
  const [showCount, setShowCount] = useState(10);

  return (
    <div style={{ maxWidth: 1000 }}>
      <h2 style={styles.title}>Vérification des données</h2>
      <p style={styles.subtitle}>{formattedRows.length} lignes prêtes — vérifiez avant de valider.</p>

      <div style={styles.card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                <th style={{ ...styles.th, width: 40 }}>#</th>
                {spacefillFields.filter(f => headers.includes(f.field_key)).map(f => (
                  <th key={f.id} style={styles.th}>{f.label}{f.is_required ? " *" : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formattedRows.slice(0, showCount).map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px 12px", color: "var(--ink-muted)", fontSize: 12 }}>{i + 1}</td>
                  {spacefillFields.filter(f => headers.includes(f.field_key)).map(f => (
                    <td key={f.id} style={{ padding: "8px 12px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row[f.field_key] || <span style={{ color: "var(--ink-light)" }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {formattedRows.length > showCount && (
          <div style={{ textAlign: "center", padding: 12 }}>
            <button style={styles.btnSecondary} onClick={() => setShowCount(c => c + 10)}>
              Afficher plus ({formattedRows.length - showCount} lignes restantes)
            </button>
          </div>
        )}
      </div>

      <div style={styles.actions}>
        <button style={styles.btnSecondary} onClick={onBack}>← Retour</button>
        <button style={styles.btnPrimary} onClick={onContinue}>
          Valider les données →
        </button>
      </div>
    </div>
  );
}

// ─── Step 6 : Validation ──────────────────────────────────────────────────────

function StepValidation({ validationResult, onContinue, onBack }) {
  const { valid, errored, ignored, total, errors } = validationResult;
  const blockingErrors = errors.filter(e => e.severity === "error");
  const warnings = errors.filter(e => e.severity === "warning");

  function exportErrors() {
    const csv = ["Ligne,Colonne,Champ Spacefill,Type,Message,Sévérité",
      ...errors.map(e => `${e.row_index + 1},${e.column_name || ""},${e.spacefill_field || ""},${e.error_type},${e.error_message.replace(/,/g, ";")},${e.severity}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "rapport-erreurs.csv"; a.click();
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={styles.title}>Validation des données</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total", value: total, color: "var(--ink)" },
          { label: "Valides", value: valid, color: "var(--primary)" },
          { label: "Erreurs", value: errored, color: errored > 0 ? "#ef4444" : "var(--ink-muted)" },
          { label: "Ignorées", value: ignored, color: "var(--ink-muted)" },
        ].map(s => (
          <div key={s.label} style={{ ...styles.card, textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {errors.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: "var(--primary)" }}>Toutes les données sont valides !</p>
          <p style={{ color: "var(--ink-muted)", marginTop: 4 }}>Vous pouvez créer la commande Spacefill.</p>
        </div>
      ) : (
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontWeight: 700 }}>
              {blockingErrors.length > 0 ? <span style={{ color: "#ef4444" }}>⚠ {blockingErrors.length} erreur{blockingErrors.length > 1 ? "s" : ""} bloquante{blockingErrors.length > 1 ? "s" : ""}</span> : null}
              {warnings.length > 0 ? <span style={{ color: "#f59e0b", marginLeft: blockingErrors.length ? 12 : 0 }}>⚡ {warnings.length} avertissement{warnings.length > 1 ? "s" : ""}</span> : null}
            </span>
            {errors.length > 0 && <button style={styles.btnSecondary} onClick={exportErrors}>⬇ Exporter les erreurs</button>}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  <th style={styles.th}>Ligne</th>
                  <th style={styles.th}>Champ</th>
                  <th style={styles.th}>Message</th>
                  <th style={styles.th}>Sévérité</th>
                </tr>
              </thead>
              <tbody>
                {errors.slice(0, 50).map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "8px 12px" }}>{e.row_index + 1}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{e.spacefill_field}</td>
                    <td style={{ padding: "8px 12px", color: "var(--ink-muted)" }}>{e.error_message}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: e.severity === "error" ? "#fee2e2" : "#fef3c7", color: e.severity === "error" ? "#dc2626" : "#92400e" }}>
                        {e.severity === "error" ? "Erreur" : "Avertissement"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.length > 50 && <p style={{ textAlign: "center", padding: 12, color: "var(--ink-muted)", fontSize: 13 }}>… {errors.length - 50} autres erreurs dans le rapport exporté</p>}
        </div>
      )}

      <div style={styles.actions}>
        <button style={styles.btnSecondary} onClick={onBack}>← Retour</button>
        {blockingErrors.length === 0 ? (
          <button style={styles.btnPrimary} onClick={onContinue}>
            Créer la commande Spacefill →
          </button>
        ) : (
          <button style={{ ...styles.btnPrimary, background: "#ef4444" }} onClick={onContinue}>
            Continuer malgré les erreurs ({valid} lignes valides)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 7 : Send to Spacefill ───────────────────────────────────────────────

function StepSend({ formattedRows, clientId, importId, embedToken, embedWarehouseId, orderType, onLog, onResult, onBack }) {
  const [client, setClient] = useState(null);
  const [checking, setChecking] = useState(true);
  const [duplicates, setDuplicates] = useState([]);
  const [unknownRefs, setUnknownRefs] = useState([]);
  const [creatingRefs, setCreatingRefs] = useState(false);
  const [refsCreated, setRefsCreated] = useState(false);
  const [refErrors, setRefErrors] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const apiToken = embedToken || client?.api_token;
  const warehouseId = embedWarehouseId || client?.warehouse_id || null;
  const isEntry = orderType === "ENTRY";

  useEffect(() => {
    if (clientId) fetch(`/api/clients/${clientId}`).then(r => r.json()).then(setClient);
  }, [clientId]);

  useEffect(() => {
    const token = embedToken || client?.api_token;
    if (!token) { setChecking(false); return; }

    const orderRefs = [...new Set(formattedRows.map(r => r.shipper_order_reference).filter(Boolean))];
    const itemRefs = isEntry
      ? [...new Set(formattedRows.map(r => r.item_reference || r.master_item_reference).filter(Boolean))]
      : [];

    const checks = [
      orderRefs.length
        ? fetch("/api/check-duplicates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references: orderRefs, api_token: token }) }).then(r => r.json()).then(d => d.duplicates || [])
        : Promise.resolve([]),
      itemRefs.length
        ? fetch("/api/check-master-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references: itemRefs, api_token: token }) }).then(r => r.json()).then(d => d.unknown || [])
        : Promise.resolve([]),
    ];

    Promise.all(checks)
      .then(([dups, unknown]) => {
        setDuplicates(dups);
        setUnknownRefs(unknown);
        setChecking(false);
        if (dups.length > 0) onLog?.("Envoi", `${dups.length} doublon${dups.length > 1 ? "s" : ""} détecté${dups.length > 1 ? "s" : ""} : ${dups.map(d => d.reference).join(", ")}`, "error");
        else onLog?.("Envoi", `Aucun doublon — ${orderRefs.length} référence${orderRefs.length > 1 ? "s" : ""} vérifiée${orderRefs.length > 1 ? "s" : ""}`, "success");
        if (unknown.length > 0) onLog?.("Envoi", `${unknown.length} référence${unknown.length > 1 ? "s" : ""} article inconnue${unknown.length > 1 ? "s" : ""} : ${unknown.join(", ")}`, "warning");
      })
      .catch(() => setChecking(false));
  }, [embedToken, client]);

  const dupRefs = new Set(duplicates.map(d => d.reference));
  const rowsToSend = formattedRows.filter(r => !dupRefs.has(r.shipper_order_reference));
  const blocked = duplicates.length > 0 && rowsToSend.length === 0;

  async function createMissingRefs() {
    setCreatingRefs(true); setRefErrors([]);
    const items = unknownRefs.map(ref => {
      const row = formattedRows.find(r => (r.item_reference || r.master_item_reference) === ref);
      return {
        item_reference: ref,
        designation: row?.designation || row?.label || ref,
        item_packaging_type: row?.item_packaging_type || "EACH",
      };
    });
    const res = await fetch("/api/create-master-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, api_token: apiToken }),
    });
    const data = await res.json();
    setRefErrors(data.errors || []);
    setRefsCreated(true);
    setCreatingRefs(false);
    const created = data.created?.length || 0;
    const errs = data.errors?.length || 0;
    onLog?.("Envoi", `${created} référence${created > 1 ? "s" : ""} article créée${created > 1 ? "s" : ""} dans Spacefill${errs ? ` — ${errs} erreur${errs > 1 ? "s" : ""}` : ""}`, errs ? "warning" : "success");
  }

  async function sendToSpacefill() {
    setSending(true); setError("");

    let iid = importId;
    if (!iid) {
      const importRes = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId || null, status: "processing", total_rows: rowsToSend.length }),
      });
      iid = (await importRes.json()).id;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ import_id: iid, client_id: clientId, rows: rowsToSend, api_token: apiToken, order_type: orderType, warehouse_id: warehouseId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur lors de l'envoi."); setSending(false); return; }
      onResult({ ...data, importId: iid, clientName: client?.name, skippedDuplicates: duplicates.length });
    } catch (err) {
      setError("Erreur réseau : " + err.message);
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 660 }}>
      <h2 style={styles.title}>Créer les commandes Spacefill</h2>

      {checking ? (
        <div style={{ ...styles.card, display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={styles.spinner} />
          <span style={{ color: "var(--ink-muted)", fontSize: 14 }}>Vérification des doublons en cours…</span>
        </div>
      ) : duplicates.length > 0 && (
        <div style={{ ...styles.card, marginBottom: 16, borderColor: "#ef4444", background: "#fef2f2" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>🚫</span>
            <div>
              <p style={{ fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>
                {duplicates.length} commande{duplicates.length > 1 ? "s" : ""} déjà existante{duplicates.length > 1 ? "s" : ""} dans Spacefill
              </p>
              <p style={{ fontSize: 13, color: "#b91c1c" }}>
                Ces références ont déjà été créées et ne peuvent pas être recréées. Corrigez votre fichier avant de réimporter.
              </p>
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #fca5a5", maxHeight: 180, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#fef2f2" }}>
                  <th style={{ ...styles.th, textAlign: "left" }}>Référence</th>
                  <th style={styles.th}>ID Spacefill</th>
                  <th style={styles.th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((d, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #fee2e2" }}>
                    <td style={{ padding: "7px 12px", fontFamily: "monospace", fontWeight: 600 }}>{d.reference}</td>
                    <td style={{ padding: "7px 12px", textAlign: "center", fontFamily: "monospace", fontSize: 12, color: "var(--ink-muted)" }}>{d.spacefill_id || "—"}</td>
                    <td style={{ padding: "7px 12px", textAlign: "center" }}>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>{d.status || "existant"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unknown master items — ENTRY only */}
      {!checking && isEntry && unknownRefs.length > 0 && (
        <div style={{ ...styles.card, marginBottom: 16, borderColor: refsCreated && refErrors.length === 0 ? "#22c55e" : "#f59e0b", background: refsCreated && refErrors.length === 0 ? "#f0fdf4" : "#fffbeb" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>{refsCreated && refErrors.length === 0 ? "✅" : "📦"}</span>
            <div>
              <p style={{ fontWeight: 700, color: refsCreated && refErrors.length === 0 ? "#166534" : "#92400e", marginBottom: 4 }}>
                {refsCreated && refErrors.length === 0
                  ? `${unknownRefs.length} référence${unknownRefs.length > 1 ? "s" : ""} créée${unknownRefs.length > 1 ? "s" : ""} dans Spacefill`
                  : `${unknownRefs.length} référence${unknownRefs.length > 1 ? "s" : ""} inconnue${unknownRefs.length > 1 ? "s" : ""} dans Spacefill`}
              </p>
              <p style={{ fontSize: 13, color: refsCreated ? "#166534" : "#b45309" }}>
                {refsCreated && refErrors.length === 0
                  ? "Les articles ont été créés automatiquement — vous pouvez envoyer la commande."
                  : "Ces articles n'existent pas encore. Cliquez pour les créer automatiquement avant l'envoi."}
              </p>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${refsCreated && refErrors.length === 0 ? "#86efac" : "#fde68a"}`, marginBottom: refsCreated ? 0 : 14, maxHeight: 160, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {unknownRefs.map((ref, i) => {
                  const hasError = refErrors.find(e => e.item_reference === ref);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", fontWeight: 600 }}>{ref}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right", fontSize: 12 }}>
                        {refsCreated
                          ? hasError
                            ? <span style={{ color: "#ef4444" }}>✗ {hasError.error}</span>
                            : <span style={{ color: "#22c55e" }}>✓ Créée</span>
                          : <span style={{ color: "var(--ink-muted)" }}>à créer</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!refsCreated && (
            <button
              style={{ ...styles.btnPrimary, width: "100%", marginTop: 0, opacity: creatingRefs ? 0.7 : 1 }}
              onClick={createMissingRefs}
              disabled={creatingRefs}
            >
              {creatingRefs ? <><span style={styles.spinner} /> Création en cours…</> : `📦 Créer ${unknownRefs.length} référence${unknownRefs.length > 1 ? "s" : ""} automatiquement`}
            </button>
          )}
        </div>
      )}

      {!checking && (
        <div style={styles.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>À envoyer</div>
              <div style={{ ...styles.infoValue, color: rowsToSend.length > 0 ? "var(--primary)" : "var(--ink-muted)", fontSize: 24 }}>{rowsToSend.length}</div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Doublons bloqués</div>
              <div style={{ ...styles.infoValue, color: duplicates.length ? "#ef4444" : "var(--ink-muted)", fontSize: 24 }}>{duplicates.length}</div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Token API</div>
              <div style={{ ...styles.infoValue, fontSize: 14 }}>{apiToken ? "✓ Prêt" : "⚠ Manquant"}</div>
            </div>
          </div>

          {!apiToken && (
            <div style={{ ...styles.error, marginBottom: 16 }}>
              ⚠ Token API manquant. Passez votre token dans l'URL : <code>?token=xxx</code>
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}

          {blocked ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--ink-muted)", fontSize: 14 }}>
              Corrigez ou retirez les doublons de votre fichier, puis recommencez l'import.
            </div>
          ) : sending ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={styles.spinner} />
              <p style={{ marginTop: 16, color: "var(--ink-muted)" }}>Envoi de {rowsToSend.length} commande{rowsToSend.length > 1 ? "s" : ""}…</p>
            </div>
          ) : (
            <button
              style={{ ...styles.btnPrimary, width: "100%", padding: 16, fontSize: 16, opacity: (!apiToken || (isEntry && unknownRefs.length > 0 && !refsCreated)) ? 0.5 : 1 }}
              onClick={sendToSpacefill}
              disabled={!apiToken || (isEntry && unknownRefs.length > 0 && !refsCreated)}
            >
              🚀 Envoyer {rowsToSend.length} commande{rowsToSend.length > 1 ? "s" : ""} à Spacefill
            </button>
          )}
        </div>
      )}

      <div style={styles.actions}>
        <button style={styles.btnSecondary} onClick={onBack} disabled={sending}>← Retour</button>
      </div>
    </div>
  );
}

// ─── Step 8 : Result ──────────────────────────────────────────────────────────

function StepResult({ result }) {
  const success = result.errors?.length === 0;

  function exportReport() {
    const lines = ["Statut,ID Commande,Lignes OK,Lignes erreur",
      `${success ? "Succès" : "Partiel"},${result.spacefill_order_id || "—"},${result.results?.length || 0},${result.errors?.length || 0}`
    ];
    if (result.errors?.length) {
      lines.push("", "Erreurs détail,Message");
      result.errors.forEach(e => lines.push(`Ligne ${e.row?.shipper_order_reference || "?"},${e.error.replace(/,/g, ";")}`));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "rapport-import.csv"; a.click();
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{success ? "🎉" : "⚠️"}</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: success ? "var(--primary)" : "#f59e0b" }}>
          {success ? "Import réussi !" : "Import partiel"}
        </h2>
        {result.clientName && <p style={{ color: "var(--ink-muted)", marginTop: 8 }}>Client : {result.clientName}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "ID Commande Spacefill", value: result.spacefill_order_id || "—" },
          { label: "Statut", value: success ? "Créée" : "Partielle" },
          { label: "Commandes créées", value: result.results?.length || 0 },
          { label: "Erreurs", value: result.errors?.length || 0 },
          ...(result.skippedDuplicates ? [{ label: "Doublons ignorés", value: result.skippedDuplicates }] : []),
        ].map(s => (
          <div key={s.label} style={styles.infoCard}>
            <div style={styles.infoLabel}>{s.label}</div>
            <div style={{ ...styles.infoValue, fontFamily: s.label.includes("ID") ? "monospace" : "inherit" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {result.errors?.length > 0 && (
        <div style={{ ...styles.card, marginBottom: 20 }}>
          <p style={{ fontWeight: 700, marginBottom: 12, color: "#ef4444" }}>Lignes en erreur</p>
          {result.errors.slice(0, 10).map((e, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--ink-muted)", padding: "6px 0", borderBottom: "1px solid var(--border-light)" }}>
              {e.error}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button style={styles.btnSecondary} onClick={exportReport}>⬇ Exporter le rapport</button>
        <Link href="/import/history" style={{ ...styles.btnSecondary, textDecoration: "none" }}>Voir l'historique</Link>
        <button style={styles.btnPrimary} onClick={() => window.location.reload()}>+ Nouvel import</button>
      </div>
    </div>
  );
}

// ─── Log Panel ────────────────────────────────────────────────────────────────

const LOG_ICONS = { info: "ℹ", success: "✓", warning: "⚠", error: "✗" };
const LOG_COLORS = {
  info:    { bg: "var(--bg)",      text: "var(--ink-muted)", dot: "#94a3b8" },
  success: { bg: "#f0fdf4",        text: "#166534",          dot: "#22c55e" },
  warning: { bg: "#fffbeb",        text: "#92400e",          dot: "#f59e0b" },
  error:   { bg: "#fef2f2",        text: "#991b1b",          dot: "#ef4444" },
};

function LogPanel({ logs }) {
  const [open, setOpen] = useState(false);
  if (!logs.length) return null;
  const last = logs[logs.length - 1];
  const hasError = logs.some(l => l.type === "error");
  const hasWarning = logs.some(l => l.type === "warning");
  const summaryColor = hasError ? "#ef4444" : hasWarning ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ marginTop: 32, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", fontSize: 13 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--bg-card)", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: summaryColor, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, color: "var(--ink)", flex: 1 }}>Journal d'import</span>
        <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>{logs.length} événement{logs.length > 1 ? "s" : ""}</span>
        <span style={{ color: "var(--ink-muted)", fontSize: 12, marginLeft: 8 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {logs.map((log, i) => {
            const c = LOG_COLORS[log.type] || LOG_COLORS.info;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px", background: c.bg, borderBottom: i < logs.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                <span style={{ color: c.dot, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>{LOG_ICONS[log.type]}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: "var(--ink-muted)", fontSize: 11, marginRight: 8 }}>[Étape {log.step}]</span>
                  <span style={{ color: c.text }}>{log.message}</span>
                </div>
                <span style={{ color: "var(--ink-light)", fontSize: 11, flexShrink: 0 }}>{log.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const styles = {
  title: { fontSize: 22, fontWeight: 800, color: "var(--ink)", marginBottom: 8, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: "var(--ink-muted)", marginBottom: 24 },
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 0 },
  infoCard: { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" },
  infoLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--ink-muted)", marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: 700, color: "var(--ink)" },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, color: "var(--ink)", outline: "none" },
  select: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none" },
  btnPrimary: { background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnSecondary: { background: "#fff", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnDanger: { background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  actions: { display: "flex", gap: 12, marginTop: 24, justifyContent: "space-between" },
  error: { background: "#fee2e2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginTop: 12 },
  spinner: { width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" },
  th: { padding: "10px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--ink-muted)", whiteSpace: "nowrap" },
};

// ─── Main Wizard ──────────────────────────────────────────────────────────────

function SetupScreen({ onSave }) {
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [token, setToken] = useState("");

  function handleSave() {
    if (!token.trim()) return;
    const saved = { customer_id: customerId.trim(), warehouse_id: warehouseId.trim(), token: token.trim() };
    localStorage.setItem("spacefill_import_credentials", JSON.stringify(saved));
    onSave(saved);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: "var(--primary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 auto 16px" }}>S</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>Configuration de l'accès</h1>
          <p style={{ fontSize: 14, color: "var(--ink-muted)" }}>Entrez vos identifiants une seule fois — ils seront mémorisés sur cet appareil.</p>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Customer ID</label>
          <input
            style={{ ...styles.input, marginBottom: 16 }}
            placeholder="ex : cust_xxxxxxxx"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
          />

          <label style={styles.label}>Warehouse ID</label>
          <input
            style={{ ...styles.input, marginBottom: 16 }}
            placeholder="ex : wh_xxxxxxxx"
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
          />

          <label style={styles.label}>Token API</label>
          <input
            style={{ ...styles.input, marginBottom: 24, fontFamily: "monospace", fontSize: 13 }}
            placeholder="eyJhbGciOi…"
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
          />

          <button
            style={{ ...styles.btnPrimary, width: "100%", padding: 14, fontSize: 15, opacity: !token.trim() ? 0.5 : 1 }}
            onClick={handleSave}
            disabled={!token.trim()}
          >
            Accéder à l'import →
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ImportWizardInner() {
  const searchParams = useSearchParams();
  const urlCustomerId = searchParams.get("customer_id");
  const urlToken = searchParams.get("token");
  const urlWarehouseId = searchParams.get("warehouse_id");

  // All hooks must be declared before any conditional return
  const [credentials, setCredentials] = useState(null); // null = not yet loaded
  const [setupDone, setSetupDone] = useState(false);
  const [step, setStep] = useState(1);
  const [parsed, setParsed] = useState(null);
  const [detection, setDetection] = useState(null);
  const [spacefillFields, setSpacefillFields] = useState([]);
  const [mappings, setMappings] = useState({});
  const [formattedRows, setFormattedRows] = useState([]);
  const [mappedFieldKeys, setMappedFieldKeys] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [logs, setLogs] = useState([]);

  function addLog(stepLabel, message, type = "info") {
    const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(l => [...l, { step: stepLabel, message, type, time }]);
  }

  useEffect(() => {
    const saved = localStorage.getItem("spacefill_import_credentials");
    const stored = saved ? JSON.parse(saved) : {};
    // URL params always override stored credentials
    const creds = {
      customer_id: urlCustomerId || stored.customer_id || "",
      token: urlToken || stored.token || "",
      warehouse_id: urlWarehouseId || stored.warehouse_id || "",
    };
    if (creds.token) {
      localStorage.setItem("spacefill_import_credentials", JSON.stringify(creds));
      setCredentials(creds);
      setSetupDone(true);
    } else {
      setCredentials({});
      setSetupDone(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/spacefill-fields").then(r => r.json()).then(d => setSpacefillFields(Array.isArray(d) ? d : []));
  }, []);

  if (credentials === null) return null;
  if (!setupDone) {
    return <SetupScreen onSave={(creds) => { setCredentials(creds); setSetupDone(true); }} />;
  }

  const embedCustomerId = credentials.customer_id || urlCustomerId || "";
  const embedToken = credentials.token || urlToken || "";
  const embedWarehouseId = credentials.warehouse_id || urlWarehouseId || "";
  const isEmbed = !!(embedCustomerId || embedToken);

  function buildFormattedRows(currentMappings, currentParsed, currentDetection) {
    const headerRowIndex = currentDetection?.headerRowIndex ?? 0;
    const headers = (currentParsed.rows[headerRowIndex] || []).map(h => String(h).trim());
    const dataRows = currentParsed.rows.slice(headerRowIndex + 1).filter(row => row.some(c => String(c).trim() !== ""));
    const fieldKeyById = {};
    spacefillFields.forEach(f => { fieldKeyById[f.id] = f.field_key; });

    const rows = dataRows.map(row => {
      const mapped = {};
      headers.forEach((h, i) => {
        if (currentMappings[h]) mapped[fieldKeyById[currentMappings[h]]] = String(row[i] ?? "");
      });
      return autoFormatRow(mapped);
    });

    const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
    return { rows, keys };
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Top bar */}
      <div style={{ background: "var(--secondary)", padding: "14px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>S</div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>spacefill</span>
          </div>
        </Link>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>/</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 14 }}>Import commandes</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <Link href="/import/history" style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, textDecoration: "none" }}>Historique</Link>
          <Link href="/clients" style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, textDecoration: "none" }}>Clients</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "32px 24px" }}>
        <Stepper current={step} />

        {step === 1 && (
          <StepImport
            onParsed={(data) => {
              setParsed(data);
              const totalRows = data.rows?.length ? data.rows.length - 1 : 0;
              addLog("Import", `Fichier chargé : ${data.fileName} — ${totalRows} ligne${totalRows > 1 ? "s" : ""} détectée${totalRows > 1 ? "s" : ""}, encodage ${data.encoding || "UTF-8"}, type ${data.orderType}`, "success");
              setStep(2);
            }}
            isEmbed={isEmbed}
          />
        )}

        {step === 2 && parsed && (
          <StepDetection
            parsed={parsed}
            onContinue={(det) => {
              setDetection(det);
              addLog("Détection", `En-tête ligne ${det.headerRowIndex + 1}, délimiteur « ${det.delimiter === "\t" ? "tabulation" : det.delimiter} »`, "info");
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && parsed && (
          <StepMapping
            parsed={parsed}
            headerRowIndex={detection?.headerRowIndex ?? 0}
            spacefillFields={spacefillFields}
            onContinue={(m) => {
              setMappings(m);
              const { rows, keys } = buildFormattedRows(m, parsed, detection);
              setFormattedRows(rows);
              setMappedFieldKeys(keys);
              const mappedCount = Object.values(m).filter(Boolean).length;
              const totalHeaders = (parsed.rows[detection?.headerRowIndex ?? 0] || []).length;
              addLog("Mapping", `${mappedCount}/${totalHeaders} colonnes mappées → ${rows.length} ligne${rows.length > 1 ? "s" : ""} préparée${rows.length > 1 ? "s" : ""}`, mappedCount < totalHeaders ? "warning" : "success");
              setStep(4);
            }}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <StepPreview
            formattedRows={formattedRows}
            headers={mappedFieldKeys}
            spacefillFields={spacefillFields}
            onContinue={() => {
              const result = validateRows(formattedRows, spacefillFields);
              setValidationResult(result);
              addLog("Validation", `${result.valid} valide${result.valid > 1 ? "s" : ""}${result.errored ? `, ${result.errored} erreur${result.errored > 1 ? "s" : ""}` : ""}${result.ignored ? `, ${result.ignored} ignorée${result.ignored > 1 ? "s" : ""}` : ""} sur ${result.total} lignes`, result.errored > 0 ? "warning" : "success");
              setStep(5);
            }}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && validationResult && (
          <StepValidation
            validationResult={validationResult}
            onContinue={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        )}

        {step === 6 && (
          <StepSend
            formattedRows={validationResult ? validationResult.results.filter(r => r.valid).map(r => r.row) : formattedRows}
            clientId={null}
            importId={null}
            embedToken={isEmbed ? embedToken : null}
            embedWarehouseId={isEmbed ? embedWarehouseId : null}
            orderType={parsed?.orderType || "EXIT"}
            onLog={addLog}
            onResult={(result) => {
              const ok = result.results?.length || 0;
              const err = result.errors?.length || 0;
              addLog("Envoi", `${ok} commande${ok > 1 ? "s" : ""} créée${ok > 1 ? "s" : ""}${err ? ` — ${err} erreur${err > 1 ? "s" : ""}` : ""}${result.skippedDuplicates ? ` — ${result.skippedDuplicates} doublon${result.skippedDuplicates > 1 ? "s" : ""} ignoré${result.skippedDuplicates > 1 ? "s" : ""}` : ""}`, err > 0 ? "warning" : "success");
              setSendResult(result);
              setStep(7);
            }}
            onBack={() => setStep(5)}
          />
        )}

        {step === 7 && sendResult && (
          <StepResult result={sendResult} />
        )}

        <LogPanel logs={logs} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ImportWizard() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Chargement…</div>}>
      <ImportWizardInner />
    </Suspense>
  );
}
