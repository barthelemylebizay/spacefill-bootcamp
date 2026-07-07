// AI generation service — uses Anthropic API if key is set, otherwise returns structured mock

const ARTICLE_TYPES = {
  create_chart: "Créer un chart from scratch",
  modify_chart: "Modifier un chart existant",
  use_chart: "Utiliser un chart de la bibliothèque",
};

function detectIntent(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes("modifier") || lower.includes("changer") || lower.includes("edit") || lower.includes("update")) return "modify_chart";
  if (lower.includes("utiliser") || lower.includes("comprendre") || lower.includes("lire") || lower.includes("interpréter")) return "use_chart";
  return "create_chart";
}

const SPACEFILL_API_CONTEXT = `
## Modèle de données Spacefill (API officielle)

### Types d'ordres (order_type)
- ENTRY : réception de marchandises à l'entrepôt (approvisionnement)
- EXIT : expédition de marchandises depuis l'entrepôt (livraison client)
- SALE : vente directe

### Statuts d'un ordre (status)
- DRAFT_ORDER_STATE : brouillon, pas encore soumis
- WAREHOUSE_NEEDS_TO_CONFIRM_PLANNED_EXECUTION_DATE_STATE : en attente de confirmation de date par l'entrepôt
- ORDER_IS_READY_TO_BE_EXECUTED_STATE : prêt à être exécuté
- UNLOADING_STARTED_STATE / UNLOADING_FINISHED_STATE : déchargement en cours / terminé (ENTRY)
- PREPARATION_STARTED_STATE / PREPARATION_FINISHED_STATE : préparation en cours / terminée (EXIT)
- COMPLETED_ORDER_STATE : ordre complété avec succès
- PARTIALLY_COMPLETED : partiellement complété
- CANCELED_ORDER_STATE : annulé
- FAILED_ORDER_STATE : échoué

### Types de packaging (packaging_type / item_packaging_type)
- PALLET : palette
- CARDBOARD_BOX : carton
- EACH : à l'unité

### Priorités d'incident (priority)
- NO PRIORITY, LOW, MEDIUM, HIGH, URGENT

### Champs clés des ordres
- shipper_order_reference : référence unique de la commande côté expéditeur
- warehouse_id : entrepôt concerné
- transport_carrier_id : transporteur (DHL, TNT, Geodis, DPD, UPS...)
- tracking_number : numéro de suivi colis
- goods_type : type de marchandise (PALLET, GENERAL, FOOD, FRAGILE...)
- linear_meter : mètres linéaires occupés dans le camion
- gross_weight : poids brut en kg
- volume : volume en m³
- is_dangerous : marchandise dangereuse (ADR)
- is_refrigerated : chaîne du froid requise
- incoterm : conditions commerciales (EXW, DAP, DDP...)
- custom_fields : champs personnalisés définis par le client
- pickup_address_city : ville d'enlèvement (pour ENTRY)
- delivery_address_city : ville de livraison (pour EXIT)

### Champs clés des incidents
- type : type d'incident (qualité, retard, dommage...)
- priority : urgence (LOW à URGENT)
- assigned_to : personne en charge
- closed_at : date de résolution
- resolution_time : temps de résolution en heures

### Datasources disponibles et leur usage
- exit_orders_with_custom_fields : ordres de sortie (expéditions) avec champs personnalisés
- entry_orders_with_custom_fields : ordres d'entrée (réceptions) avec champs personnalisés
- additional_requests / additional_requests_with_custom_fields : prestations additionnelles
- packaging_items : articles et conditionnements
- incident_items : articles concernés par des incidents
- incident_comments : commentaires sur les incidents
- incidents_with_custom_fields : incidents avec champs personnalisés
- entry_orders_with_packaging_items : réceptions avec détail conditionnement
- entry_orders_with_incidents : réceptions liées à des incidents
- exit_orders_with_incidents : expéditions liées à des incidents
- exit_orders_with_packaging_items : expéditions avec détail conditionnement
- incidents_with_comments : incidents avec leur historique de commentaires
`;

function buildSystemPrompt(context) {
  return `Tu es un expert Superset et Analytics chez Spacefill, une startup logistique. Tu génères des articles d'aide structurés, clairs et concrets pour aider les équipes non-techniques (Finance, CS, Ops, Commercial) à utiliser Superset.

${SPACEFILL_API_CONTEXT}

Contexte de génération disponible :
- Datasources disponibles : ${JSON.stringify(context.datasources?.map(d => ({ name: d.name, domain: d.business_domain })) || [])}
- Champs mappés : ${JSON.stringify(context.fieldsMapping?.slice(0, 20) || [])}
- Sources de connaissance actives : ${JSON.stringify(context.knowledgeSources?.map(s => s.title) || [])}
- Charts disponibles : ${JSON.stringify(context.chartLibrary?.map(c => c.name) || [])}

Génère un article d'aide en ${context.language} avec cette structure JSON exacte :
{
  "title": "titre de l'article",
  "article_type": "${context.articleType}",
  "language": "${context.language}",
  "datasource_used": "nom de la datasource",
  "fields_used": ["champ1", "champ2"],
  "sources_used": ["source1"],
  "content": "contenu markdown complet de l'article"
}

Le contenu doit être en markdown avec des sections claires, des étapes numérotées, et des conseils pratiques.`;
}

function pickDatasource(prompt, datasources) {
  const lower = prompt.toLowerCase();
  if (!datasources?.length) return null;
  if (lower.includes("incident")) return datasources.find(d => d.name === "incidents_with_custom_fields") || datasources.find(d => d.name.includes("incident"));
  if (lower.includes("réception") || lower.includes("reception") || lower.includes("entrée") || lower.includes("entry") || lower.includes("approvisionnement")) return datasources.find(d => d.name === "entry_orders_with_custom_fields") || datasources.find(d => d.name.includes("entry"));
  if (lower.includes("expédition") || lower.includes("sortie") || lower.includes("exit") || lower.includes("livraison")) return datasources.find(d => d.name === "exit_orders_with_custom_fields") || datasources.find(d => d.name.includes("exit"));
  if (lower.includes("packaging") || lower.includes("conditionnement") || lower.includes("palette") || lower.includes("carton")) return datasources.find(d => d.name.includes("packaging"));
  if (lower.includes("prestation") || lower.includes("additional")) return datasources.find(d => d.name.includes("additional_requests"));
  // default: exit orders (most common for analytics)
  return datasources.find(d => d.name === "exit_orders_with_custom_fields") || datasources[0];
}

function generateMockArticle(prompt, articleType, language, datasource, chart, allDatasources) {
  const lang = language || "Français";

  // Use provided datasource or auto-pick from the real list
  const ds = datasource || pickDatasource(prompt, allDatasources);
  const dsName = ds?.name || "exit_orders_with_custom_fields";

  const templates = {
    create_chart: `# ${prompt}

## Objectif
Créer un chart Superset permettant de visualiser ${prompt.toLowerCase().replace(/créer un chart /i, "")}.

## Datasource à sélectionner
**${dsName}** — contient les données nécessaires pour cette analyse.

## Champs à utiliser

| Rôle | Champ API | Libellé métier |
|------|-----------|----------------|
| Axe X | \`created_at\` | Date de création |
| Axe Y | \`COUNT(*)\` | Nombre total |
| Filtre | \`status\` | Statut |
| Grouper par | \`goods_type\` | Type de marchandise |

## Pas à pas (5 étapes)

1. **Ouvrir Superset** → menu "Charts" → bouton **+ Chart**
2. **Sélectionner la datasource** : choisir _${dsName}_ dans la liste
3. **Choisir le type de chart** : sélectionner _Bar Chart_ ou _Line Chart_ selon l'évolution souhaitée
4. **Configurer les axes** : glisser les champs indiqués dans les zones X, Y et Filtres
5. **Enregistrer** : cliquer sur _Save_ puis nommer le chart de manière descriptive

## Résultat attendu
Un chart interactif affichant les données filtrables par entrepôt et par période.

## Questions fréquentes

**Q : Le chart est vide après la configuration ?**
→ Vérifier que la période de filtre inclut bien des données existantes.

**Q : Comment changer les couleurs ?**
→ Dans l'onglet _Customize_ du builder, modifier la palette de couleurs.`,

    modify_chart: `# ${prompt}

## Chart de référence
**${chart?.name || "Chart existant"}** — accessible dans la bibliothèque Superset.

## Modification souhaitée
${prompt}

## Champs à modifier

| Action | Champ | Nouvelle valeur |
|--------|-------|----------------|
| Modifier | \`time_range\` | Derniers 30 jours |
| Ajouter filtre | \`status\` | = "delivered" |

## Pas à pas

1. **Ouvrir le chart** : aller dans "Charts" → chercher le chart → cliquer sur **Edit**
2. **Identifier le champ à modifier** dans le panneau de configuration à gauche
3. **Appliquer la modification** selon le tableau ci-dessus
4. **Prévisualiser** en cliquant sur _Run Query_
5. **Sauvegarder** en cliquant sur _Save_ (ou _Save as_ pour garder l'original)

## Conseils
- Utiliser _Save as_ pour tester sans risquer de casser le chart original
- Vérifier les dashboards qui utilisent ce chart avant de sauvegarder

## Résultat attendu
Le chart affiche maintenant les données avec la modification appliquée.`,

    use_chart: `# ${prompt}

## À propos de ce chart
**${chart?.name || "Chart de la bibliothèque Spacefill"}**

${chart?.description || "Ce chart permet de visualiser les indicateurs clés de performance logistique de Spacefill."}

## Ce que ce chart mesure
${chart?.business_goal || "Suivi des performances opérationnelles par entrepôt et par période."}

## À qui ce chart est utile
- Équipes Operations : suivi quotidien des flux
- Management : vue d'ensemble des KPIs
- Customer Success : reporting client

## Comment l'interpréter

| Indicateur | Signification | Seuil d'alerte |
|-----------|---------------|----------------|
| Tendance montante | Performance en amélioration | — |
| Pic soudain | Événement exceptionnel | > +50% |
| Valeur à 0 | Données manquantes | Toujours |

## Filtres disponibles
- **Période** : sélectionner la plage de dates en haut à droite
- **Entrepôt** : filtrer par site logistique
- **Statut** : filtrer par état des opérations

## Cas d'usage fréquents
1. Reporting hebdomadaire client
2. Détection d'anomalies opérationnelles
3. Comparaison de performance entre entrepôts

## Questions fréquentes

**Q : Les données ne correspondent pas à ce que j'attends ?**
→ Vérifier les filtres actifs en haut du dashboard.

**Q : Comment partager ce chart ?**
→ Utiliser le bouton "..." → "Share" → copier le lien.`,
  };

  return {
    title: prompt,
    article_type: articleType,
    language: lang,
    datasource_used: dsName,
    fields_used: ["created_at", "status", "goods_type"],
    sources_used: ["Documentation Superset interne"],
    content: templates[articleType] || templates.create_chart,
  };
}

export async function generateArticle({ prompt, articleType, language, datasources, fieldsMapping, knowledgeSources, chartLibrary, datasource, chart, additionalContext }) {
  const detectedType = articleType === "auto" ? detectIntent(prompt) : (articleType || "create_chart");
  const lang = language || "Français";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && !apiKey.includes("your_anthropic")) {
    try {
      const context = { articleType: detectedType, language: lang, datasources, fieldsMapping, knowledgeSources, chartLibrary };
      const systemPrompt = buildSystemPrompt(context);
      const userMessage = `Demande : "${prompt}"${additionalContext ? `\nContexte métier : ${additionalContext}` : ""}${datasource ? `\nDatasource suggérée : ${datasource.name}` : ""}${chart ? `\nChart de référence : ${chart.name}` : ""}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return { ...parsed, detected_intent: detectedType };
        }
      }
    } catch (e) {
      console.error("AI generation failed, falling back to mock:", e.message);
    }
  }

  // Fallback mock
  const result = generateMockArticle(prompt, detectedType, lang, datasource, chart, datasources);
  return { ...result, detected_intent: detectedType };
}
