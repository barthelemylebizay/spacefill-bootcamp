// Canonical header normalization — SINGLE source of truth.
//
// This exact formula is what `mapping_history.header_normalized` and
// `mapping_profiles.headers_fingerprint` were built with. Any other place that turns a
// column header into a lookup key MUST import this, or lookups silently miss:
// a second, slightly different formula previously made 161 of 426 stored matches
// unreachable (every header containing an apostrophe or a "|" separator).
export function normalizeHeader(h) {
  return String(h)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/['’‘]/g, "")           // apostrophes vanish: "d'expédition" -> "dexpedition"
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function makeFingerprint(headers) {
  return headers.map(normalizeHeader).sort().join("|");
}
