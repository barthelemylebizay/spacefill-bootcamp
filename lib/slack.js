// Slack notifications for finished imports.
//
// Server-only: the webhook URL is a secret (anyone holding it can post to the channel),
// so it lives in SLACK_WEBHOOK_URL and is never sent to the browser. Without that
// variable the whole thing is a no-op, which keeps local work quiet by default.

const WEBHOOK = process.env.SLACK_WEBHOOK_URL;

export function slackConfigured() {
  return Boolean(WEBHOOK);
}

/** Groups identical failure messages so one bad token reads as one line, not twenty. */
function summariseErrors(errors) {
  const byReason = new Map();
  for (const e of errors) {
    const reason = String(e.error || "Erreur inconnue").slice(0, 160);
    byReason.set(reason, (byReason.get(reason) || 0) + 1);
  }
  return [...byReason.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([reason, n]) => `• ${reason}${n > 1 ? `  _(${n} commandes)_` : ""}`)
    .join("\n");
}

/**
 * Posts one message per finished import. Never throws and never blocks: an unreachable
 * Slack must not fail an import that Spacefill already accepted.
 */
export async function notifyImportFinished({ clientName, accessName, fileName, created, errors = [], appUrl }) {
  if (!WEBHOOK) return;

  const failed = errors.length;
  const ok = created;
  const icon = failed === 0 ? "✅" : ok === 0 ? "🚨" : "⚠️";
  const titre = failed === 0
    ? `${ok} commande${ok > 1 ? "s" : ""} créée${ok > 1 ? "s" : ""}`
    : ok === 0
      ? `Import en échec — aucune commande créée`
      : `Import partiel — ${ok} créée${ok > 1 ? "s" : ""}, ${failed} en échec`;

  const lignes = [
    `${icon} *${titre}*`,
    `*Client :* ${clientName || "—"}${accessName && accessName !== clientName ? `  _(via ${accessName})_` : ""}`,
    fileName ? `*Fichier :* ${fileName}` : null,
    failed ? `\n*Motifs :*\n${summariseErrors(errors)}` : null,
    appUrl ? `\n<${appUrl}/import/history|Voir l'historique des imports>` : null,
  ].filter(Boolean);

  try {
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lignes.join("\n") }),
    });
  } catch {
    // Slack down or webhook revoked — the import itself is unaffected.
  }
}
