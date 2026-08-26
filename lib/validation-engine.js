// Validate rows against Spacefill field rules

export function validateRows(rows, spacefillFields) {
  const fieldMap = {};
  for (const f of spacefillFields) fieldMap[f.field_key] = f;
  const requiredFields = spacefillFields.filter(f => f.is_required && !f.is_hidden);

  const results = rows.map((row, index) => {
    const errors = [];
    const warnings = [];

    // Required check — run against every required field, not just columns present in the
    // row. A required field that was never mapped at all has no key in `row`, so checking
    // only Object.entries(row) silently let unmapped-required rows through validation.
    for (const field of requiredFields) {
      const raw = row[field.field_key];
      const v = raw === null || raw === undefined ? "" : String(raw).trim();
      if (v === "") {
        errors.push({ row_index: index, column_name: field.field_key, spacefill_field: field.field_key, error_type: "REQUIRED", error_message: `Le champ "${field.label}" est obligatoire`, severity: "error", raw_value: raw, row_snapshot: row });
      }
    }

    for (const [key, value] of Object.entries(row)) {
      const field = fieldMap[key];
      if (!field) continue;
      const v = value === null || value === undefined ? "" : String(value).trim();

      if (field.is_required && v === "") continue; // already reported above

      if (v === "") continue;

      // Type checks
      if (field.data_type === "number" || field.data_type === "integer") {
        if (isNaN(Number(v.replace(",", ".")))) {
          errors.push({ row_index: index, column_name: key, spacefill_field: key, error_type: "INVALID_TYPE", error_message: `"${field.label}" doit être un nombre (valeur: "${v}")`, severity: "error", raw_value: value, row_snapshot: row });
        }
      }
      if (field.data_type === "date") {
        const d = new Date(v);
        if (isNaN(d.getTime())) {
          errors.push({ row_index: index, column_name: key, spacefill_field: key, error_type: "INVALID_DATE", error_message: `"${field.label}" doit être une date valide (valeur: "${v}")`, severity: "error", raw_value: value, row_snapshot: row });
        }
      }
      if (field.data_type === "boolean") {
        if (!["true", "false", "1", "0", "oui", "non", "yes", "no"].includes(v.toLowerCase())) {
          warnings.push({ row_index: index, column_name: key, spacefill_field: key, error_type: "INVALID_BOOLEAN", error_message: `"${field.label}" devrait être true/false (valeur: "${v}")`, severity: "warning", raw_value: value, row_snapshot: row });
        }
      }
      if (field.allowed_values && Array.isArray(field.allowed_values)) {
        if (!field.allowed_values.includes(v)) {
          // Spacefill's API hard-rejects the whole order for an out-of-enum value —
          // this must block sending, not just warn, or it fails only after the real call.
          errors.push({ row_index: index, column_name: key, spacefill_field: key, error_type: "INVALID_VALUE", error_message: `"${field.label}" valeur non reconnue: "${v}" (attendu : ${field.allowed_values.join(", ")})`, severity: "error", raw_value: value, row_snapshot: row });
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
