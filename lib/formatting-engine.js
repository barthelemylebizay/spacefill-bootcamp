// Apply formatting rules to a row of mapped data

export function applyFormattingRules(mappedRow, rules) {
  const result = { ...mappedRow };
  const sorted = [...rules].sort((a, b) => (a.execution_order || 0) - (b.execution_order || 0));

  for (const rule of sorted) {
    const { target_field, rule_type, rule_config = {} } = rule;
    const val = result[target_field];

    try {
      result[target_field] = applyRule(val, rule_type, rule_config, result);
    } catch {
      // Keep original value on rule error
    }
  }
  return result;
}

function applyRule(value, ruleType, config, row) {
  const v = value === null || value === undefined ? "" : String(value);
  switch (ruleType) {
    case "trim": return v.trim();
    case "uppercase": return v.toUpperCase();
    case "lowercase": return v.toLowerCase();
    case "replace": return v.replace(new RegExp(config.from || "", "g"), config.to || "");
    case "date_format": return formatDate(v, config.input_format, config.output_format);
    case "number": return v.replace(/[^0-9.,\-]/g, "").replace(",", ".") || "";
    case "default": return v.trim() === "" ? (config.default_value || "") : v;
    case "map_values": {
      const dict = config.mapping || {};
      return dict[v] !== undefined ? dict[v] : (config.fallback !== undefined ? config.fallback : v);
    }
    case "concat": {
      const fields = config.fields || [];
      const sep = config.separator || " ";
      return fields.map(f => row[f] || "").join(sep).trim();
    }
    case "split": {
      const parts = v.split(config.separator || " ");
      return parts[config.index || 0] || "";
    }
    case "substring": return v.substring(config.start || 0, config.end);
    case "pad_left": return v.padStart(config.length || 0, config.char || "0");
    case "boolean": {
      const truthy = (config.true_values || ["true", "oui", "yes", "1", "o"]).map(s => s.toLowerCase());
      return truthy.includes(v.toLowerCase()) ? "true" : "false";
    }
    default: return v;
  }
}

function formatDate(value, inputFormat, outputFormat) {
  if (!value) return "";
  // Common date patterns
  let d;
  const clean = value.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split("/");
    d = new Date(`${year}-${month}-${day}`);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split("-");
    d = new Date(`${year}-${month}-${day}`);
  } else {
    d = new Date(clean);
  }
  if (isNaN(d.getTime())) return value;
  const fmt = outputFormat || "YYYY-MM-DD";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return fmt.replace("YYYY", y).replace("MM", m).replace("DD", day);
}

export const RULE_TYPES = [
  { value: "trim", label: "Supprimer les espaces" },
  { value: "uppercase", label: "Majuscules" },
  { value: "lowercase", label: "Minuscules" },
  { value: "replace", label: "Remplacer un texte" },
  { value: "date_format", label: "Convertir une date" },
  { value: "number", label: "Nettoyer un nombre" },
  { value: "default", label: "Valeur par défaut si vide" },
  { value: "map_values", label: "Dictionnaire de valeurs" },
  { value: "concat", label: "Concaténer plusieurs champs" },
  { value: "split", label: "Extraire une partie" },
  { value: "boolean", label: "Convertir en booléen" },
  { value: "pad_left", label: "Compléter à gauche (ex: 0001)" },
];
