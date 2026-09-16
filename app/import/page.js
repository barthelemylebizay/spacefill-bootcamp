"use client";
import { useState, useRef, useCallback, useEffect, useMemo, Suspense, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { suggestMappings } from "@/lib/mapping-engine";
import { validateRows } from "@/lib/validation-engine";
import { normalizeHeader, makeFingerprint } from "@/lib/normalize-header";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Import" },
  { id: 2, label: "Mapping" },
  { id: 3, label: "Validation & Envoi" },
  { id: 4, label: "Résultat" },
];

// Fallback set for when DB field is_order_item_field is not yet loaded
const ORDER_ITEM_FIELD_KEYS_FALLBACK = new Set([
  "item_reference", "master_item_id", "expected_quantity", "item_packaging_type",
  "batch_name", "batch_id", "batch_edi_erp_id", "batch_edi_wms_id",
]);

// normalizeHeader / makeFingerprint now live in lib/normalize-header.js so the mapping
// engine, the profile-detection route and this page all key on the exact same string.

// Where an auto-suggestion came from — shown so the user can trust (or distrust) it.
const SUGGESTION_BADGES = {
  history: { label: "🧠 déjà mappé", color: "#5b21b6", bg: "#ede9fe", title: "Cette colonne a déjà été mappée sur ce champ par le passé" },
  "history-fuzzy": { label: "🧠 similaire", color: "#5b21b6", bg: "#f5f3ff", title: "Une colonne très proche a déjà été mappée sur ce champ" },
  values: { label: "🔍 contenu", color: "#0369a1", bg: "#e0f2fe", title: "Déduit à partir des valeurs de la colonne (emails, dates, codes postaux…)" },
  name: { label: "✨ auto", color: "var(--primary)", bg: "var(--primary-light)", title: "Déduit à partir du nom de la colonne" },
};

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

function StepImport({ onParsed, onProfileSelected, isEmbed, customerId }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderType, setOrderType] = useState("EXIT");
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const inputRef = useRef();

  useEffect(() => {
    // Scoped to this client: without customer_id the server returns only the global
    // Spacefill templates, never another client's saved configuration.
    const url = customerId
      ? `/api/mapping-profiles?customer_id=${encodeURIComponent(customerId)}`
      : "/api/mapping-profiles";
    fetch(url)
      .then(r => r.json())
      .then(d => { setProfiles(Array.isArray(d) ? d : []); setLoadingProfiles(false); })
      .catch(() => setLoadingProfiles(false));
  }, [customerId]);

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

    // Auto-detect a matching profile
    const headers = (data.rows[data.headerRowIndex || 0] || []).map(h => String(h).trim());
    if (headers.length) {
      const detectRes = await fetch("/api/mapping-profiles/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, customer_id: customerId || null }),
      });
      const detected = await detectRes.json();
      if (detected.match) {
        setLoading(false);
        onParsed({ ...data, orderType, detectedProfile: detected.match, detectedConfidence: detected.confidence });
        return;
      }
    }

    setLoading(false);
    onParsed({ ...data, orderType });
  }

  const templates = profiles.filter(p => p.is_template);

  return (
    <div style={{ maxWidth: 700 }}>
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
            <button key={t.value} onClick={() => setOrderType(t.value)} style={{
              flex: 1, padding: "16px 18px", border: `2px solid ${orderType === t.value ? "var(--primary)" : "var(--border)"}`,
              borderRadius: 10, background: orderType === t.value ? "var(--primary-light)" : "var(--bg)",
              cursor: "pointer", textAlign: "left", transition: "all 0.15s",
            }}>
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

      {/* Templates section */}
      {!loadingProfiles && templates.length > 0 && (
        <div style={{ ...styles.card, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📋 Templates disponibles</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  {t.description && <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>{t.description}</div>}
                  <div style={{ fontSize: 11, color: "var(--ink-light)", marginTop: 2 }}>{t.order_type === "EXIT" ? "Expédition" : "Réception"} · {t.mapping_rules?.length || 0} colonnes</div>
                </div>
                {t.template_file_url && (
                  <a href={t.template_file_url} download style={{ ...styles.btnSecondary, fontSize: 12, padding: "6px 12px", textDecoration: "none", display: "inline-block" }}>
                    ⬇ Télécharger
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved profiles */}
      {!loadingProfiles && profiles.filter(p => !p.is_template).length > 0 && (
        <div style={{ ...styles.card, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>⚡ Paramétrages sauvegardés</div>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 12 }}>
            Ces paramétrages sont détectés automatiquement à l'import. Vous pouvez aussi en appliquer un manuellement.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {profiles.filter(p => !p.is_template).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>{p.order_type === "EXIT" ? "Expédition" : "Réception"} · {p.mapping_rules?.length || 0} colonnes · créé le {new Date(p.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
                <button
                  style={{ ...styles.btnSecondary, fontSize: 12, padding: "6px 12px" }}
                  onClick={() => onProfileSelected(p)}
                >
                  Utiliser ce paramétrage
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isEmbed && (
        <div style={{ marginTop: 20, padding: "14px 18px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--ink-muted)" }}>
          💡 <strong style={{ color: "var(--ink)" }}>Intégration Spacefill :</strong> cette page peut être intégrée directement dans l'espace d'un client via{" "}
          <code style={{ background: "var(--border-light)", padding: "1px 6px", borderRadius: 4 }}>/import?customer_id=xxx&token=xxx</code>.
        </div>
      )}
    </div>
  );
}

// ─── Step 2 : Detect & Map (merged) ──────────────────────────────────────────

function StepDetectAndMap({ parsed, detectedProfile, detectedConfidence, spacefillFields, preloadedMappings, mappingHistory, orderType, customerId, onContinue, onBack }) {
  const [headerRow, setHeaderRow] = useState(parsed.headerRowIndex || 0);
  const [delimiter, setDelimiter] = useState(parsed.delimiter || ",");
  const [previewOpen, setPreviewOpen] = useState(false);

  const headers = (parsed.rows[headerRow] || []).map(h => String(h).trim());

  const isItemField = (f) => f.is_order_item_field ?? ORDER_ITEM_FIELD_KEYS_FALLBACK.has(f.field_key);
  const isEntry = orderType === "ENTRY";
  // Réception (ENTRY) → adresse d'enlèvement chez le fournisseur ; Expédition (EXIT) → adresse de livraison au destinataire
  const matchesOrderDirection = (f) => {
    if (f.field_key.startsWith("pickup_")) return isEntry;
    if (f.field_key.startsWith("delivery_")) return !isEntry;
    return true;
  };
  const orderFields = spacefillFields.filter(f => !f.is_hidden && !isItemField(f) && matchesOrderDirection(f));
  const itemFields = spacefillFields.filter(f => !f.is_hidden && isItemField(f));

  // Suggestions must RECOMPUTE when the fields list or the matching history finish
  // loading. They arrive over the network, so a one-shot useState initializer ran
  // against empty arrays and the intelligence never applied (worse on Vercel, where
  // the round-trip is slower than on localhost).
  const candidateFields = useMemo(() => [...orderFields, ...itemFields], [spacefillFields, orderType]);
  const sampleRows = useMemo(
    () => parsed.rows.slice(headerRow + 1, headerRow + 21),
    [parsed.rows, headerRow]
  );
  const suggestions = useMemo(
    () => suggestMappings(headers, candidateFields, mappingHistory, sampleRows),
    [headers.join(" "), candidateFields, mappingHistory, sampleRows]
  );

  const [mappings, setMappings] = useState(preloadedMappings || {});
  // True once the user changes a dropdown — after that, never overwrite their choices.
  const userEditedRef = useRef(false);

  useEffect(() => {
    if (userEditedRef.current) return;
    // A saved profile always wins where it has a rule. But a profile matched by
    // similarity (not exactly) leaves its unrecognized columns empty — so the engine
    // fills those remaining gaps instead of leaving the user to map them by hand.
    //
    // Only keep profile rules whose column actually exists in THIS file: a rule for a
    // column that was renamed still reserved its Spacefill field, which both blocked
    // the engine from re-mapping it and inflated the "x / y colonnes mappées" counter.
    const presentHeaders = new Set(headers);
    const m = {};
    for (const [col, fieldId] of Object.entries(preloadedMappings || {})) {
      if (presentHeaders.has(col)) m[col] = fieldId;
    }
    const used = new Set(Object.values(m).filter(Boolean));
    // Assign best-scoring suggestions FIRST. Each Spacefill field can only be used once,
    // so going in column order let an early weak match (e.g. "Nom Client", scored 60)
    // claim a field that a later, stronger match (a confirmed historical one, 95) deserved.
    [...suggestions]
      .filter(s => s.suggestedField)
      .sort((a, b) => b.confidence - a.confidence)
      .forEach(s => {
        if (m[s.sourceColumn]) return;               // profile already decided this column
        if (used.has(s.suggestedField.id)) return;   // field already taken by a better match
        m[s.sourceColumn] = s.suggestedField.id;
        used.add(s.suggestedField.id);
      });
    setMappings(m);
  }, [suggestions, preloadedMappings, headers.join(" ")]);

  const [search, setSearch] = useState("");
  const [saveModal, setSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saveIsTemplate, setSaveIsTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [savedProfileName, setSavedProfileName] = useState(null); // set once saved, to confirm in place
  const [saveError, setSaveError] = useState("");

  // Opens the save dialog pre-filled with the file name — one less thing to type for
  // the common case of "remember this layout".
  function openSaveDialog() {
    if (!saveName.trim()) {
      const base = String(parsed.fileName || "").replace(/\.(csv|xlsx?|xls)$/i, "").trim();
      setSaveName(base || "");
    }
    setSaveModal(true);
  }

  function fieldSection(fieldId) {
    const field = spacefillFields.find(f => f.id === fieldId);
    if (!field) return null;
    return isItemField(field) ? "Ligne de commande" : "En-tête de commande";
  }

  const filteredOrderFields = orderFields.filter(f => !search || f.label.toLowerCase().includes(search.toLowerCase()) || f.field_key.toLowerCase().includes(search.toLowerCase()));
  const filteredItemFields = itemFields.filter(f => !search || f.label.toLowerCase().includes(search.toLowerCase()) || f.field_key.toLowerCase().includes(search.toLowerCase()));

  const mappedCount = Object.values(mappings).filter(Boolean).length;
  const requiredCount = spacefillFields.filter(f => f.is_required && !f.is_hidden).length;
  const requiredMapped = spacefillFields.filter(f => f.is_required && !f.is_hidden && Object.values(mappings).includes(f.id)).length;

  async function handleSave() {
    if (!saveName.trim()) return;
    setSaving(true);
    const fingerprint = makeFingerprint(headers);
    const res = await fetch("/api/mapping-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveName.trim(),
        description: saveDesc.trim() || null,
        order_type: parsed.orderType || "EXIT",
        header_row_index: headerRow,
        headers_fingerprint: fingerprint,
        is_template: saveIsTemplate,
        mappings,
        customer_id: customerId || null, // keeps this profile private to the client who saved it
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSaveError(d.error || "L'enregistrement n'a pas fonctionné.");
      return;
    }
    setSavedOk(true);
    setSavedProfileName(saveName.trim());
    setTimeout(() => { setSaveModal(false); setSavedOk(false); }, 1500);
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <h2 style={styles.title}>Mapping des colonnes</h2>

      {/* Auto-detected profile banner */}
      {detectedProfile && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}>
              Paramétrage détecté automatiquement : {detectedProfile.name}
            </div>
            <div style={{ fontSize: 12, color: "#166534", opacity: 0.8 }}>
              {detectedConfidence === "exact" ? "Correspondance exacte" : "Correspondance proche"} · {detectedProfile.mapping_rules?.length || 0} colonnes pré-remplies
            </div>
          </div>
        </div>
      )}

      {/* Never-seen file: offer to remember this layout so the next import is automatic. */}
      {!detectedProfile && !savedProfileName && (
        <div style={{ background: "var(--primary-light)", border: "1px solid var(--primary)", borderRadius: 10, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20 }}>✨</span>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Ce format de fichier est nouveau</div>
            <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>
              Enregistrez ce paramétrage : les prochains fichiers du même format seront remplis automatiquement.
            </div>
          </div>
          <button style={{ ...styles.btnPrimary, whiteSpace: "nowrap" }} onClick={openSaveDialog}>
            💾 Enregistrer ce paramétrage
          </button>
        </div>
      )}

      {savedProfileName && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}>Paramétrage « {savedProfileName} » enregistré</div>
            <div style={{ fontSize: 12, color: "#166534", opacity: 0.8 }}>
              Il sera proposé automatiquement au prochain fichier de ce format.
            </div>
          </div>
        </div>
      )}

      {/* File info + detection params */}
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <div style={styles.infoCard}><div style={styles.infoLabel}>Fichier</div><div style={{ ...styles.infoValue, fontSize: 13, wordBreak: "break-all" }}>{parsed.fileName}</div></div>
          <div style={styles.infoCard}><div style={styles.infoLabel}>Lignes</div><div style={styles.infoValue}>{parsed.totalRows}</div></div>
          <div style={styles.infoCard}><div style={styles.infoLabel}>Encodage</div><div style={styles.infoValue}>{parsed.encoding}</div></div>
          <div style={styles.infoCard}><div style={styles.infoLabel}>Colonnes</div><div style={styles.infoValue}>{headers.length}</div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={styles.label}>Ligne d'en-tête</label>
            <input style={styles.input} type="number" min={0} max={10} value={headerRow} onChange={e => setHeaderRow(Number(e.target.value))} />
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
          <button style={{ ...styles.btnSecondary, fontSize: 13, padding: "9px 14px", whiteSpace: "nowrap" }} onClick={() => setPreviewOpen(o => !o)}>
            {previewOpen ? "▲ Masquer aperçu" : "▼ Aperçu données"}
          </button>
        </div>

        {previewOpen && (
          <div style={{ marginTop: 16, overflowX: "auto", borderRadius: 8, border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  {headers.map((h, i) => (
                    <th key={i} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, whiteSpace: "nowrap", color: "var(--primary)" }}>
                      {h || `Col. ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(headerRow + 1, headerRow + 4).map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    {headers.map((_, ci) => (
                      <td key={ci} style={{ padding: "8px 12px", color: "var(--ink-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row[ci] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mapping controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, padding: "10px 16px", border: "1px solid var(--border)" }}>
          <span style={{ fontWeight: 700, color: "var(--primary)" }}>{mappedCount}</span>
          <span style={{ color: "var(--ink-muted)", fontSize: 14 }}> / {headers.length} colonnes mappées</span>
          {requiredCount > 0 && (
            <>
              <span style={{ margin: "0 12px", color: "var(--border)" }}>|</span>
              <span style={{ fontWeight: 700, color: requiredMapped === requiredCount ? "var(--primary)" : "#ef4444" }}>{requiredMapped}</span>
              <span style={{ color: "var(--ink-muted)", fontSize: 14 }}> / {requiredCount} champs obligatoires</span>
            </>
          )}
        </div>
      </div>

      {/* Save modal */}
      {saveModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontWeight: 800, marginBottom: 20 }}>Sauvegarder le paramétrage</h3>
            {savedOk ? (
              <div style={{ textAlign: "center", padding: 20, color: "#166534", fontWeight: 700 }}>✅ Sauvegardé !</div>
            ) : (
              <>
                <label style={styles.label}>Nom du paramétrage *</label>
                <input style={{ ...styles.input, marginBottom: 14 }} value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Ex : Format client Leroy Merlin" autoFocus />
                <label style={styles.label}>Description (optionnel)</label>
                <input style={{ ...styles.input, marginBottom: 14 }} value={saveDesc} onChange={e => setSaveDesc(e.target.value)} placeholder="Ex : Fichier export ERP SAP" />
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20, fontSize: 14 }}>
                  <input type="checkbox" checked={saveIsTemplate} onChange={e => setSaveIsTemplate(e.target.checked)} />
                  Marquer comme template téléchargeable par les équipes
                </label>
                {saveError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 14 }}>{saveError}</p>}
                <div style={{ display: "flex", gap: 12 }}>
                  <button style={styles.btnPrimary} onClick={handleSave} disabled={!saveName.trim() || saving}>
                    {saving ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                  <button style={styles.btnSecondary} onClick={() => setSaveModal(false)}>Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <input placeholder="Filtrer les champs Spacefill…" style={{ ...styles.input, maxWidth: 260, fontSize: 13 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                <th style={styles.th}>Colonne fichier</th>
                <th style={styles.th}>Exemple</th>
                <th style={styles.th}>Champ Spacefill</th>
                <th style={styles.th}>Catégorie</th>
                <th style={styles.th}>Requis</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((header, i) => {
                const exampleVal = (parsed.rows[headerRow + 1] || [])[i] || "";
                const suggestion = suggestions[i];
                const isAutoMapped = suggestion?.confidence >= 30 && mappings[header] === suggestion?.suggestedField?.id;
                const isProfileMapped = !!preloadedMappings?.[header];
                const section = fieldSection(mappings[header]);
                const usedElsewhere = new Set(
                  Object.entries(mappings)
                    .filter(([h, v]) => h !== header && v)
                    .map(([, v]) => v)
                );
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{header}</td>
                    <td style={{ padding: "10px 12px", color: "var(--ink-muted)", fontFamily: "monospace", fontSize: 12, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{String(exampleVal)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {isProfileMapped && (
                          <span style={{ fontSize: 11, color: "#166534", background: "#dcfce7", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>📋 profil</span>
                        )}
                        {isAutoMapped && !isProfileMapped && (
                          <span
                            title={SUGGESTION_BADGES[suggestion.source]?.title}
                            style={{ fontSize: 11, color: SUGGESTION_BADGES[suggestion.source]?.color || "var(--primary)", background: SUGGESTION_BADGES[suggestion.source]?.bg || "var(--primary-light)", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", cursor: "help" }}
                          >
                            {SUGGESTION_BADGES[suggestion.source]?.label || "✨ auto"}
                          </span>
                        )}
                        <select
                          style={{ ...styles.select, minWidth: 220 }}
                          value={mappings[header] || ""}
                          onChange={e => {
                            const value = e.target.value;
                            if (value && usedElsewhere.has(value)) return;
                            userEditedRef.current = true;
                            setMappings(m => ({ ...m, [header]: value }));
                          }}
                        >
                          <option value="">— Ignorer cette colonne —</option>
                          <optgroup label="─── En-tête de commande ───">
                            {filteredOrderFields.map(f => (
                              <option key={f.id} value={f.id} disabled={usedElsewhere.has(f.id)}>
                                {f.label}{f.is_required ? " *" : ""}{f.is_custom ? " ◆" : ""}{usedElsewhere.has(f.id) ? " (déjà utilisé)" : ""}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="─── Ligne de commande ───">
                            {filteredItemFields.map(f => (
                              <option key={f.id} value={f.id} disabled={usedElsewhere.has(f.id)}>
                                {f.label}{f.is_required ? " *" : ""}{f.is_custom ? " ◆" : ""}{usedElsewhere.has(f.id) ? " (déjà utilisé)" : ""}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {section && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: section === "Ligne de commande" ? "#eff6ff" : "#f0fdf4", color: section === "Ligne de commande" ? "#1d4ed8" : "#166534", fontWeight: 600 }}>
                          {section}
                        </span>
                      )}
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
        <button style={{ ...styles.btnSecondary, whiteSpace: "nowrap" }} onClick={openSaveDialog}>
          💾 Sauvegarder ce paramétrage
        </button>
        <button style={styles.btnPrimary} onClick={() => onContinue(mappings, { headerRowIndex: headerRow, delimiter })}>
          Valider et envoyer →
        </button>
      </div>
    </div>
  );
}

// ─── Auto-formatting (applied silently after mapping) ─────────────────────────

const DATE_FIELDS = new Set(["delivery_date", "date", "planned_datetime_range", "created_at"]);
const NUMBER_FIELDS = new Set(["expected_quantity", "gross_weight", "volume", "linear_meter"]);
const INTEGER_FIELDS = new Set(["expected_quantity"]);
const BOOL_FIELDS = new Set(["is_dangerous", "is_refrigerated"]);

// Spacefill's item_packaging_type only accepts PALLET / CARDBOARD_BOX / EACH — French
// exports commonly use their own wording, so translate the common ones automatically
// instead of sending an invalid enum value that gets hard-rejected by the real API.
const PACKAGING_TYPE_SYNONYMS = {
  "palette": "PALLET", "palettes": "PALLET", "pallet": "PALLET",
  "carton": "CARDBOARD_BOX", "cartons": "CARDBOARD_BOX", "boite": "CARDBOARD_BOX", "boites": "CARDBOARD_BOX",
  "boîte": "CARDBOARD_BOX", "boîtes": "CARDBOARD_BOX", "colis": "CARDBOARD_BOX", "cardboard_box": "CARDBOARD_BOX",
  "unite": "EACH", "unités": "EACH", "unite(s)": "EACH", "unité": "EACH", "unités(s)": "EACH", "piece": "EACH", "pièce": "EACH", "each": "EACH",
};

function normalizePackagingType(v) {
  const key = v.trim().toLowerCase();
  return PACKAGING_TYPE_SYNONYMS[key] || v.toUpperCase();
}

function parseFlexibleDate(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/[.\-]/g, "/");
  // dd/mm/yyyy or d/m/yyyy
  const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, "0")}-${dmY[1].padStart(2, "0")}`;
  // yyyy/mm/dd
  const Ymd = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (Ymd) return `${Ymd[1]}-${Ymd[2].padStart(2, "0")}-${Ymd[3].padStart(2, "0")}`;
  // yyyymmdd compact
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  // Already ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return s.slice(0, 10);
  // Excel serial number
  const serial = Number(s);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  // Natural language fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function autoFormatValue(value, fieldKey) {
  if (value === null || value === undefined) return "";
  let v = String(value).trim();

  // Fix Windows-1252 artifacts
  v = v
    .replace(/Ã©/g, "é").replace(/Ã¨/g, "è").replace(/Ã /g, "à").replace(/Ã´/g, "ô")
    .replace(/Ã®/g, "î").replace(/Ã¹/g, "ù").replace(/Ã«/g, "ë").replace(/Ã§/g, "ç")
    .replace(/Ã¢/g, "â").replace(/Ã»/g, "û").replace(/Ã¯/g, "ï").replace(/Ã¼/g, "ü")
    .replace(/â€™/g, "'").replace(/â€œ/g, '"').replace(/â€/g, '"')
    .replace(/â€¦/g, "…").replace(/â€"/g, "–");

  if (DATE_FIELDS.has(fieldKey) || fieldKey.endsWith("_date")) {
    return parseFlexibleDate(v) || v;
  }

  if (NUMBER_FIELDS.has(fieldKey)) {
    const cleaned = v.replace(/\s/g, "").replace(/,/g, ".");
    const n = parseFloat(cleaned);
    if (isNaN(n)) return v;
    return INTEGER_FIELDS.has(fieldKey) ? String(Math.round(n)) : String(n);
  }

  if (BOOL_FIELDS.has(fieldKey)) {
    const lower = v.toLowerCase();
    if (["oui", "yes", "true", "1", "o"].includes(lower)) return "true";
    if (["non", "no", "false", "0", "n"].includes(lower)) return "false";
  }

  if (fieldKey === "item_packaging_type") {
    return normalizePackagingType(v);
  }

  return v;
}

function autoFormatRow(row) {
  const result = {};
  for (const [key, val] of Object.entries(row)) result[key] = autoFormatValue(val, key);
  return result;
}

// ─── Step 4 : Validation & Envoi (merged) ────────────────────────────────────

function StepValidateAndSend({ formattedRows, spacefillFields, clientId, embedToken, embedWarehouseId, embedCustomerId, orderType, onLog, onResult, onBack }) {
  const validationResult = validateRows(formattedRows, spacefillFields);
  const { valid, errored, ignored, total, errors } = validationResult;
  const blockingErrors = errors.filter(e => e.severity === "error");
  const warnings = errors.filter(e => e.severity === "warning");
  const [expandedRow, setExpandedRow] = useState(null);

  const validRows = validationResult.results.filter(r => r.valid).map(r => r.row);

  const [client, setClient] = useState(null);
  const [checking, setChecking] = useState(true);
  const [duplicates, setDuplicates] = useState([]);
  const [unknownRefs, setUnknownRefs] = useState([]);
  const [creatingRefs, setCreatingRefs] = useState(false);
  const [refsCreated, setRefsCreated] = useState(false);
  const [refErrors, setRefErrors] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const apiToken = embedToken || client?.api_token;
  const warehouseId = embedWarehouseId || client?.warehouse_id || null;
  const isEntry = orderType === "ENTRY";

  useEffect(() => {
    if (clientId) fetch(`/api/clients/${clientId}`).then(r => r.json()).then(setClient);
  }, [clientId]);

  // Log a per-field breakdown so a systematic pattern (e.g. one field always empty on
  // every other line) is easy to spot without opening each row individually.
  useEffect(() => {
    if (!errors.length) return;
    const byField = {};
    errors.forEach(e => { byField[e.spacefill_field] = (byField[e.spacefill_field] || 0) + 1; });
    const summary = Object.entries(byField).map(([field, count]) => `${field} (${count})`).join(", ");
    onLog?.("Validation", `${errors.length} anomalie${errors.length > 1 ? "s" : ""} détectée${errors.length > 1 ? "s" : ""} — ${summary}`, blockingErrors.length ? "warning" : "info");
  }, []);

  useEffect(() => {
    const token = embedToken || client?.api_token;
    if (!token) { setChecking(false); return; }
    const orderRefs = [...new Set(validRows.map(r => r.shipper_order_reference).filter(Boolean))];
    const itemRefs = isEntry ? [...new Set(validRows.map(r => r.item_reference || r.master_item_reference).filter(Boolean))] : [];
    Promise.all([
      orderRefs.length
        ? fetch("/api/check-duplicates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references: orderRefs, api_token: token }) }).then(r => r.json()).then(d => d.duplicates || [])
        : Promise.resolve([]),
      itemRefs.length
        ? fetch("/api/check-master-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references: itemRefs, api_token: token }) }).then(r => r.json()).then(d => d.unknown || [])
        : Promise.resolve([]),
    ]).then(([dups, unknown]) => {
      setDuplicates(dups);
      setUnknownRefs(unknown);
      setChecking(false);
      if (dups.length > 0) onLog?.("Envoi", `${dups.length} doublon${dups.length > 1 ? "s" : ""} détecté${dups.length > 1 ? "s" : ""}`, "error");
      else onLog?.("Envoi", `Aucun doublon — ${orderRefs.length} référence${orderRefs.length > 1 ? "s" : ""} vérifiée${orderRefs.length > 1 ? "s" : ""}`, "success");
      if (unknown.length > 0) onLog?.("Envoi", `${unknown.length} référence${unknown.length > 1 ? "s" : ""} article inconnue${unknown.length > 1 ? "s" : ""}`, "warning");
    }).catch(() => setChecking(false));
  }, [embedToken, client]);

  const dupRefs = new Set(duplicates.map(d => d.reference));
  const rowsToSend = validRows.filter(r => !dupRefs.has(r.shipper_order_reference));
  const blocked = duplicates.length > 0 && rowsToSend.length === 0;

  function exportErrors() {
    const csv = ["Ligne,Champ Spacefill,Message,Sévérité",
      ...errors.map(e => `${e.row_index + 1},${e.spacefill_field || ""},${e.error_message.replace(/,/g, ";")},${e.severity}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "rapport-erreurs.csv"; a.click();
  }

  async function createMissingRefs() {
    setCreatingRefs(true); setRefErrors([]);
    const items = unknownRefs.map(ref => {
      const row = validRows.find(r => (r.item_reference || r.master_item_reference) === ref);
      return { item_reference: ref, designation: row?.designation || ref, item_packaging_type: row?.item_packaging_type || "EACH" };
    });
    const res = await fetch("/api/create-master-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, api_token: apiToken }) });
    const data = await res.json();
    setRefErrors(data.errors || []);
    setRefsCreated(true);
    setCreatingRefs(false);
    const created = data.created?.length || 0;
    const errs = data.errors?.length || 0;
    onLog?.("Envoi", `${created} référence${created > 1 ? "s" : ""} article créée${created > 1 ? "s" : ""}${errs ? ` — ${errs} erreur${errs > 1 ? "s" : ""}` : ""}`, errs ? "warning" : "success");
  }

  async function sendToSpacefill() {
    setSending(true); setSendError("");
    const importRes = await fetch("/api/imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId || null, status: "processing", total_rows: rowsToSend.length }) });
    const iid = (await importRes.json()).id;
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ import_id: iid, client_id: clientId, rows: rowsToSend, api_token: apiToken, order_type: orderType, warehouse_id: warehouseId, customer_id: embedCustomerId || null }) });
      const data = await res.json();
      if (!res.ok) { setSendError(data.error || "Erreur lors de l'envoi."); setSending(false); return; }
      onResult({ ...data, importId: iid, clientName: client?.name, skippedDuplicates: duplicates.length });
    } catch (err) {
      setSendError("Erreur réseau : " + err.message);
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={styles.title}>Validation & Envoi</h2>

      {/* Validation summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total", value: total, color: "var(--ink)" },
          { label: "Valides", value: valid, color: "var(--primary)" },
          { label: "Erreurs", value: errored, color: errored > 0 ? "#ef4444" : "var(--ink-muted)" },
          { label: "Ignorées", value: ignored, color: "var(--ink-muted)" },
        ].map(s => (
          <div key={s.label} style={{ ...styles.infoCard, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Errors list */}
      {errors.length > 0 && (
        <div style={{ ...styles.card, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {blockingErrors.length > 0 && <span style={{ color: "#ef4444" }}>⚠ {blockingErrors.length} erreur{blockingErrors.length > 1 ? "s" : ""} bloquante{blockingErrors.length > 1 ? "s" : ""} </span>}
              {warnings.length > 0 && <span style={{ color: "#f59e0b" }}>⚡ {warnings.length} avertissement{warnings.length > 1 ? "s" : ""}</span>}
            </span>
            <button style={{ ...styles.btnSecondary, fontSize: 12, padding: "5px 12px" }} onClick={exportErrors}>⬇ Exporter</button>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 220, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg)", position: "sticky", top: 0 }}>
                  <th style={styles.th}>Ligne</th>
                  <th style={styles.th}>Champ</th>
                  <th style={styles.th}>Valeur trouvée</th>
                  <th style={styles.th}>Message</th>
                  <th style={styles.th}>Sévérité</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {errors.slice(0, 50).map((e, i) => (
                  <Fragment key={i}>
                    <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "7px 12px" }}>{e.row_index + 1}</td>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", fontSize: 12 }}>{e.spacefill_field}</td>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", fontSize: 12, color: "var(--ink-muted)" }}>
                        {e.raw_value === "" || e.raw_value === null || e.raw_value === undefined ? <em>(vide)</em> : `"${e.raw_value}"`}
                      </td>
                      <td style={{ padding: "7px 12px", color: "var(--ink-muted)" }}>{e.error_message}</td>
                      <td style={{ padding: "7px 12px" }}>
                        <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: e.severity === "error" ? "#fee2e2" : "#fef3c7", color: e.severity === "error" ? "#dc2626" : "#92400e" }}>
                          {e.severity === "error" ? "Erreur" : "Avert."}
                        </span>
                      </td>
                      <td style={{ padding: "7px 12px" }}>
                        <button style={{ ...styles.btnSecondary, fontSize: 11, padding: "3px 8px" }} onClick={() => setExpandedRow(expandedRow === i ? null : i)}>
                          {expandedRow === i ? "▲ Masquer" : "▼ Voir la ligne"}
                        </button>
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr>
                        <td colSpan={6} style={{ padding: "10px 16px", background: "var(--bg)", fontFamily: "monospace", fontSize: 12 }}>
                          <div style={{ marginBottom: 6, fontWeight: 700, color: "var(--ink-muted)" }}>Contenu complet de la ligne {e.row_index + 1} après mapping :</div>
                          {Object.entries(e.row_snapshot || {}).map(([k, v]) => (
                            <div key={k} style={{ display: "flex", gap: 8 }}>
                              <span style={{ color: "var(--ink-muted)", minWidth: 260 }}>{k}</span>
                              <span>{v === "" ? <em>(vide)</em> : String(v)}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Duplicate check */}
      {checking ? (
        <div style={{ ...styles.card, display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={styles.spinner} /><span style={{ color: "var(--ink-muted)", fontSize: 14 }}>Vérification des doublons…</span>
        </div>
      ) : duplicates.length > 0 && (
        <div style={{ ...styles.card, marginBottom: 16, borderColor: "#ef4444", background: "#fef2f2" }}>
          <span style={{ fontSize: 22 }}>🚫</span>
          <strong style={{ color: "#991b1b", marginLeft: 8 }}>{duplicates.length} commande{duplicates.length > 1 ? "s" : ""} déjà existante{duplicates.length > 1 ? "s" : ""} dans Spacefill — exclue{duplicates.length > 1 ? "s" : ""} de l'envoi.</strong>
        </div>
      )}

      {/* Unknown refs (ENTRY) */}
      {!checking && isEntry && unknownRefs.length > 0 && (
        <div style={{ ...styles.card, marginBottom: 16, borderColor: refsCreated && refErrors.length === 0 ? "#22c55e" : "#f59e0b", background: refsCreated && refErrors.length === 0 ? "#f0fdf4" : "#fffbeb" }}>
          <p style={{ fontWeight: 700, color: refsCreated && refErrors.length === 0 ? "#166534" : "#92400e", marginBottom: 8 }}>
            {refsCreated && refErrors.length === 0 ? `✅ ${unknownRefs.length} référence${unknownRefs.length > 1 ? "s" : ""} article créée${unknownRefs.length > 1 ? "s" : ""}` : `📦 ${unknownRefs.length} référence${unknownRefs.length > 1 ? "s" : ""} article inconnue${unknownRefs.length > 1 ? "s" : ""}`}
          </p>
          {!refsCreated && (
            <button style={{ ...styles.btnPrimary, opacity: creatingRefs ? 0.7 : 1 }} onClick={createMissingRefs} disabled={creatingRefs}>
              {creatingRefs ? "Création en cours…" : `Créer ${unknownRefs.length} référence${unknownRefs.length > 1 ? "s" : ""} automatiquement`}
            </button>
          )}
        </div>
      )}

      {/* Send block */}
      {!checking && (
        <div style={styles.card}>
          {!apiToken && <div style={{ ...styles.error, marginBottom: 16 }}>⚠ Token API manquant — passez votre token dans l'URL : <code>?token=xxx</code></div>}
          {sendError && <div style={styles.error}>{sendError}</div>}

          {blocked ? (
            <p style={{ textAlign: "center", color: "var(--ink-muted)", fontSize: 14 }}>Corrigez les doublons dans votre fichier, puis recommencez.</p>
          ) : sending ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={styles.spinner} />
              <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>Envoi de {rowsToSend.length} commande{rowsToSend.length > 1 ? "s" : ""}…</p>
            </div>
          ) : (
            <button
              style={{ ...styles.btnPrimary, width: "100%", padding: 16, fontSize: 16, opacity: (!apiToken || (isEntry && unknownRefs.length > 0 && !refsCreated)) ? 0.5 : 1 }}
              onClick={sendToSpacefill}
              disabled={!apiToken || rowsToSend.length === 0 || (isEntry && unknownRefs.length > 0 && !refsCreated)}
            >
              🚀 Envoyer {rowsToSend.length} commande{rowsToSend.length > 1 ? "s" : ""} à Spacefill
              {blockingErrors.length > 0 && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>({errored} ligne{errored > 1 ? "s" : ""} en erreur exclue{errored > 1 ? "s" : ""})</span>}
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

// ─── Step 5 : Result ──────────────────────────────────────────────────────────

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
  info:    { bg: "var(--bg)",  text: "var(--ink-muted)", dot: "#94a3b8" },
  success: { bg: "#f0fdf4",   text: "#166534",          dot: "#22c55e" },
  warning: { bg: "#fffbeb",   text: "#92400e",          dot: "#f59e0b" },
  error:   { bg: "#fef2f2",   text: "#991b1b",          dot: "#ef4444" },
};

function LogPanel({ logs }) {
  const [open, setOpen] = useState(false);
  if (!logs.length) return null;
  const hasError = logs.some(l => l.type === "error");
  const hasWarning = logs.some(l => l.type === "warning");
  const summaryColor = hasError ? "#ef4444" : hasWarning ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ marginTop: 32, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", fontSize: 13 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--bg-card)", border: "none", cursor: "pointer", textAlign: "left" }}>
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
  input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, color: "var(--ink)", outline: "none", boxSizing: "border-box" },
  select: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none" },
  btnPrimary: { background: "var(--primary)", color: "var(--ink)", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnSecondary: { background: "#fff", color: "var(--ink)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  actions: { display: "flex", gap: 12, marginTop: 24, justifyContent: "space-between" },
  error: { background: "#fee2e2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginTop: 12 },
  spinner: { width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" },
  th: { padding: "10px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.3px", color: "var(--ink-muted)", whiteSpace: "nowrap" },
};

// ─── Setup Screen (embed mode) ────────────────────────────────────────────────

// Shown to a 3PL opening its link: which shipper are these orders for?
function ClientPicker({ access, onPick }) {
  const [search, setSearch] = useState("");
  const list = (access.clients || []).filter(c =>
    !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 560, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: "var(--primary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 auto 16px" }}>S</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>Pour quel client ?</h1>
          <p style={{ fontSize: 14, color: "var(--ink-muted)" }}>
            {access.name} — choisissez le client pour lequel créer ces commandes.
          </p>
        </div>

        <div style={styles.card}>
          {(access.clients || []).length > 6 && (
            <input
              style={{ ...styles.input, marginBottom: 12 }}
              placeholder="Rechercher un client…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          )}

          {list.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--ink-muted)", textAlign: "center", padding: "20px 0" }}>
              {(access.clients || []).length === 0
                ? "Aucun client n'est encore rattaché à cet accès."
                : "Aucun client ne correspond à cette recherche."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map(c => (
                <button
                  key={c.id}
                  onClick={() => onPick(c)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 10,
                    background: "#fff", cursor: "pointer", textAlign: "left", width: "100%",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</span>
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
          <div style={{ width: 48, height: 48, background: "var(--primary)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 auto 16px" }}>S</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>Configuration de l'accès</h1>
          <p style={{ fontSize: 14, color: "var(--ink-muted)" }}>Entrez vos identifiants une seule fois — ils seront mémorisés sur cet appareil.</p>
        </div>
        <div style={styles.card}>
          <label style={styles.label}>Customer ID</label>
          <input style={{ ...styles.input, marginBottom: 16 }} placeholder="ex : cust_xxxxxxxx" value={customerId} onChange={e => setCustomerId(e.target.value)} />
          <label style={styles.label}>Warehouse ID</label>
          <input style={{ ...styles.input, marginBottom: 16 }} placeholder="ex : wh_xxxxxxxx" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} />
          <label style={styles.label}>Token API</label>
          <input style={{ ...styles.input, marginBottom: 24, fontFamily: "monospace", fontSize: 13 }} placeholder="eyJhbGciOi…" type="password" value={token} onChange={e => setToken(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSave()} />
          <button style={{ ...styles.btnPrimary, width: "100%", padding: 14, fontSize: 15, opacity: !token.trim() ? 0.5 : 1 }} onClick={handleSave} disabled={!token.trim()}>
            Accéder à l'import →
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

function ImportWizardInner() {
  const searchParams = useSearchParams();
  const urlCustomerId = searchParams.get("customer_id");
  const urlToken = searchParams.get("token");
  const urlWarehouseId = searchParams.get("warehouse_id");
  const urlAccessId = searchParams.get("access");

  const [credentials, setCredentials] = useState(null);
  const [setupDone, setSetupDone] = useState(false);
  const [access, setAccess] = useState(null);       // { name, type, clients[] } for an ?access= link
  const [activeClient, setActiveClient] = useState(null); // the shipper a 3PL is working for
  const [step, setStep] = useState(1);
  const [parsed, setParsed] = useState(null);
  const [detection, setDetection] = useState(null);
  const [spacefillFields, setSpacefillFields] = useState([]);
  const [mappingHistory, setMappingHistory] = useState([]);
  const [mappings, setMappings] = useState({});
  const [preloadedMappings, setPreloadedMappings] = useState(null);
  const [formattedRows, setFormattedRows] = useState([]);
  const [mappedFieldKeys, setMappedFieldKeys] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [logs, setLogs] = useState([]);

  function addLog(stepLabel, message, type = "info") {
    const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(l => [...l, { step: stepLabel, message, type, time }]);
  }

  // Pulls one shipper's credentials (never the whole set) and switches the wizard to it.
  const selectClient = useCallback(async (accessId, client) => {
    const res = await fetch(`/api/accesses/${accessId}/clients/${client.id}/credentials`);
    if (!res.ok) return;
    const creds = await res.json();
    setActiveClient(client);
    setCredentials({ customer_id: creds.customer_id || "", token: creds.token || "", warehouse_id: creds.warehouse_id || "" });
    setSetupDone(true);
    // Restart the wizard so nothing from the previous shipper carries over.
    setStep(1); setParsed(null); setPreloadedMappings(null); setDetection(null);
  }, []);

  useEffect(() => {
    // Access link (?access=…): credentials stay server-side until a shipper is chosen.
    if (urlAccessId) {
      fetch(`/api/accesses/${urlAccessId}`)
        .then(r => r.ok ? r.json() : null)
        .then(a => {
          if (!a) { setCredentials({}); setSetupDone(false); return; }
          setAccess(a);
          // A shipper access has a single client — open it straight away. A 3PL must
          // pick first: silently defaulting could file orders under the wrong shipper.
          if (a.type === "SHIPPER" && a.clients?.length === 1) {
            selectClient(a.id, a.clients[0]);
          } else {
            setCredentials({});
            setSetupDone(false);
          }
        })
        .catch(() => { setCredentials({}); setSetupDone(false); });
      return;
    }

    // Legacy link carrying the credentials directly — still supported.
    const saved = localStorage.getItem("spacefill_import_credentials");
    const stored = saved ? JSON.parse(saved) : {};
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
  }, [urlAccessId, selectClient]);

  useEffect(() => {
    fetch("/api/spacefill-fields").then(r => r.json()).then(d => {
      const dbFields = Array.isArray(d) ? d : [];
      setSpacefillFields(dbFields);
    });
    fetch("/api/mapping-history").then(r => r.json()).then(d => {
      setMappingHistory(Array.isArray(d) ? d : []);
    });
  }, []);

  // Load custom fields from Spacefill API when token is available
  useEffect(() => {
    const token = credentials?.token;
    if (!token) return;
    const customerId = credentials?.customer_id || "";
    const customUrl = `/api/spacefill-custom-fields?token=${encodeURIComponent(token)}${customerId ? `&customer_id=${encodeURIComponent(customerId)}` : ""}`;
    fetch(customUrl)
      .then(r => r.json())
      .then(custom => {
        if (Array.isArray(custom) && custom.length > 0) {
          setSpacefillFields(prev => {
            const existingKeys = new Set(prev.map(f => f.field_key));
            const newOnes = custom.filter(f => !existingKeys.has(f.field_key));
            return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
          });
        }
      })
      .catch(() => {});
  }, [credentials?.token]);

  if (credentials === null) return null;
  // 3PL link, no shipper chosen yet → ask which one these orders are for.
  if (!setupDone && access) {
    return <ClientPicker access={access} onPick={(c) => selectClient(access.id, c)} />;
  }
  if (!setupDone) {
    return <SetupScreen onSave={(creds) => { setCredentials(creds); setSetupDone(true); }} />;
  }

  const embedCustomerId = credentials.customer_id || urlCustomerId || "";
  const embedToken = credentials.token || urlToken || "";
  const embedWarehouseId = credentials.warehouse_id || urlWarehouseId || "";
  const isEmbed = !!(embedCustomerId || embedToken || access);

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

  // Apply a saved profile directly (skip to validation)
  function applyProfile(profile) {
    if (!parsed) return;
    const fieldKeyById = {};
    spacefillFields.forEach(f => { fieldKeyById[f.id] = f.field_key; });

    // Build mappings from profile rules: { column_name → spacefill_field_id }
    const m = {};
    (profile.mapping_rules || []).forEach(rule => {
      m[rule.source_column_name] = rule.spacefill_field_id;
    });

    const det = { headerRowIndex: profile.header_row_index ?? 0, delimiter: profile.delimiter || "," };
    setDetection(det);
    setMappings(m);
    setPreloadedMappings(m);

    const { rows, keys } = buildFormattedRows(m, parsed, det);
    setFormattedRows(rows);
    setMappedFieldKeys(keys);

    const result = validateRows(rows, spacefillFields);
    setValidationResult(result);

    addLog("Import", `Paramétrage "${profile.name}" appliqué — mapping en ${(profile.mapping_rules || []).length} colonnes`, "success");
    setStep(3);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ background: "var(--secondary)", padding: "14px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        {isEmbed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>S</div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>spacefill</span>
          </div>
        ) : (
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>S</div>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>spacefill</span>
            </div>
          </Link>
        )}
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>/</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 14 }}>Import commandes</span>
        {/* A 3PL works for several shippers — always show which one, and let them switch. */}
        {access?.type === "3PL" && activeClient && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Client</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{activeClient.name}</span>
            <button
              onClick={() => { setActiveClient(null); setSetupDone(false); setStep(1); setParsed(null); setPreloadedMappings(null); }}
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Changer
            </button>
          </div>
        )}
        {!isEmbed && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            <Link href="/import/history" style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, textDecoration: "none" }}>Historique</Link>
            <Link href="/clients" style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, textDecoration: "none" }}>Clients</Link>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "32px 24px" }}>
        <Stepper current={step} />

        {step === 1 && (
          <StepImport
            onParsed={(data) => {
              setParsed(data);
              const totalRows = data.rows?.length ? data.rows.length - 1 : 0;
              // If a profile was detected, pre-load mappings and go to mapping step (show for review)
              if (data.detectedProfile) {
                const profile = data.detectedProfile;
                const det = { headerRowIndex: profile.header_row_index ?? 0, delimiter: profile.delimiter || "," };
                const m = {};
                (profile.mapping_rules || []).forEach(rule => { m[rule.source_column_name] = rule.spacefill_field_id; });
                setDetection(det);
                setPreloadedMappings(m);
                const conf = data.detectedConfidence === "exact" ? "identique" : "similaire";
                addLog("Import", `Fichier chargé : ${data.fileName} — paramétrage "${profile.name}" détecté (fichier ${conf})`, "success");
              } else {
                setDetection(null);
                setPreloadedMappings(null);
                addLog("Import", `Fichier chargé : ${data.fileName} — ${totalRows} ligne${totalRows > 1 ? "s" : ""}, encodage ${data.encoding || "UTF-8"}`, "success");
              }
              setStep(2);
            }}
            onProfileSelected={(profile) => {
              if (!parsed) return;
              applyProfile(profile);
            }}
            isEmbed={isEmbed}
            customerId={embedCustomerId}
          />
        )}

        {step === 2 && parsed && (
          <StepDetectAndMap
            parsed={parsed}
            detectedProfile={parsed.detectedProfile || null}
            detectedConfidence={parsed.detectedConfidence || null}
            spacefillFields={spacefillFields}
            preloadedMappings={preloadedMappings}
            mappingHistory={mappingHistory}
            orderType={parsed.orderType || "EXIT"}
            customerId={embedCustomerId}
            onContinue={(m, det) => {
              setMappings(m);
              setDetection(det);
              const { rows, keys } = buildFormattedRows(m, parsed, det);
              setFormattedRows(rows);
              setMappedFieldKeys(keys);
              const mappedCount = Object.values(m).filter(Boolean).length;
              const totalHeaders = (parsed.rows[det?.headerRowIndex ?? 0] || []).length;
              addLog("Mapping", `${mappedCount}/${totalHeaders} colonnes mappées → ${rows.length} ligne${rows.length > 1 ? "s" : ""} préparée${rows.length > 1 ? "s" : ""}`, mappedCount < totalHeaders ? "warning" : "success");

              // Feed the matching history so future imports detect these columns automatically
              const fieldKeyById = {};
              spacefillFields.forEach(f => { fieldKeyById[f.id] = f.field_key; });
              const historyEntries = Object.entries(m)
                .filter(([, fieldId]) => fieldId)
                .map(([header, fieldId]) => ({
                  header_normalized: normalizeHeader(header),
                  header_raw: header,
                  field_key: fieldKeyById[fieldId] || fieldId,
                }));
              if (historyEntries.length) {
                fetch("/api/mapping-history", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mappings: historyEntries }),
                }).catch(() => {});
              }

              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <StepValidateAndSend
            formattedRows={formattedRows}
            spacefillFields={spacefillFields}
            clientId={null}
            embedToken={isEmbed ? embedToken : null}
            embedWarehouseId={isEmbed ? embedWarehouseId : null}
            embedCustomerId={isEmbed ? embedCustomerId : null}
            orderType={parsed?.orderType || "EXIT"}
            onLog={addLog}
            onResult={(result) => {
              const ok = result.results?.length || 0;
              const err = result.errors?.length || 0;
              addLog("Envoi", `${ok} commande${ok > 1 ? "s" : ""} créée${ok > 1 ? "s" : ""}${err ? ` — ${err} erreur${err > 1 ? "s" : ""}` : ""}${result.skippedDuplicates ? ` — ${result.skippedDuplicates} doublon${result.skippedDuplicates > 1 ? "s" : ""} ignoré${result.skippedDuplicates > 1 ? "s" : ""}` : ""}`, err > 0 ? "warning" : "success");
              setSendResult(result);
              setStep(4);
            }}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && sendResult && <StepResult result={sendResult} />}

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
