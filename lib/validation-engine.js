// Validate rows against Spacefill field rules

export function validateRows(rows, spacefillFields) {
  const fieldMap = {};
  for (const f of spacefillFields) fieldMap[f.field_key] = f;

  const results = rows.map((row, index) => {
    const errors = [];
    const warnings = [];

    for (const [key, value] of Object.entries(row)) {
      const field = fieldMap[key];
      if (!field) continue;
      const v = value === null || value === undefined ? "" : String(value).trim();

      // Required check
      if (field.is_required && v === "") {
        errors.push({ row_index: index, column_name: key, spacefill_field: key, error_type: "REQUIRED", error_message: `Le champ "${field.label}" est obligatoire`, severity: "error" });
        continue;
      }

      if (v === "") continue;

      // Type checks
      if (field.data_type === "number" || field.data_type === "integer") {
        if (isNaN(Number(v.replace(",", ".")))) {
          errors.push({ row_index: index, column_name: key, spacefill_field: key, error_type: "INVALID_TYPE", error_message: `"${field.label}" doit être un nombre (valeur: "${v}")`, severity: "error" });
        }
      }
      if (field.data_type === "date") {
        const d = new Date(v);
        if (isNaN(d.getTime())) {
          errors.push({ row_index: index, column_name: key, spacefill_field: key, error_type: "INVALID_DATE", error_message: `"${field.label}" doit être une date valide (valeur: "${v}")`, severity: "error" });
        }
      }
      if (field.data_type === "boolean") {
        if (!["true", "false", "1", "0", "oui", "non", "yes", "no"].includes(v.toLowerCase())) {
          warnings.push({ row_index: index, column_name: key, spacefill_field: key, error_type: "INVALID_BOOLEAN", error_message: `"${field.label}" devrait être true/false (valeur: "${v}")`, severity: "warning" });
        }
      }
      if (field.allowed_values && Array.isArray(field.allowed_values)) {
        if (!field.allowed_values.includes(v)) {
          warnings.push({ row_index: index, column_name: key, spacefill_field: key, error_type: "INVALID_VALUE", error_message: `"${field.label}" valeur non reconnue: "${v}"`, severity: "warning" });
        }
      }
    }

    return { rowIndex: index, row, errors, warnings, valid: errors.length === 0 };
  });

  const valid = results.filter(r => r.valid).length;
  const errored = results.filter(r => !r.valid).length;
  const allErrors = results.flatMap(r => [...r.errors, ...r.warnings]);

  return { results, valid, errored, ignored: 0, total: rows.length, errors: allErrors };
}
