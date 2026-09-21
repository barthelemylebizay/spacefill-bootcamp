// Auto-suggest column → Spacefill field mappings
// Synonyms extracted from 165 real production configurations
import { normalizeHeader } from "@/lib/normalize-header";

const SYNONYMS = {
  shipper_order_reference: ["numéro de commande","numero de commande","n° commande","num commande","n°cdevente","ncdevente","bon de livraison","n° bon de livraison","order","commande","reference commande","ref commande","order_number","order_id","shipper_order_reference","numéro de conteneurs","numero conteneur","bl","n° bl","document","facture","numéro de facture","container","numéro transport","code_expe","reference","order_reference","n° d expédition","n° expédition","n° expedition","numero expedition","numéro expédition","n expédition","expedition","expédition","n°expédition","n° d'expédition"],
  item_reference:          ["référence","reference","ref","code article","code produit","article","sku","item_reference","item_code","produit","n° article","n° article","code_produit","référence produit","référence article","product_code","item_ref","master_item_reference","produit/service"],
  expected_quantity:       ["quantité","quantite","qty","quantity","expected_quantity","uea","qté","qte","nombre","nb","qté commandées","quantité de commande","quantité emballée","to_be_delivered","colis","q","volume commande"],
  item_packaging_type:     ["conditionnement","type","packaging","unit","unité","type unité","item_packaging_type","packaging_type","items.packagedescription","unité d'achat","unité qty"],
  date:                    ["date","eta","date de livraison","date livraison","delivery_date","planned_datetime_range","date prévue","date execution","date de livraison format aaaammjj","date du document","date mvt","date création","date pièce"],
  delivery_date:           ["date de livraison","delivery_date","date livraison","date mvt","bl | date livraison","date livraison théorique"],
  batch_name:              ["lot","n° lot","numéro de lot","lot externe","batch","batch_name","lot_name","numéro de série","lot fab","numéro de lot (facultatif)","numéro de lot spécifique","unité de manutention","batch_id"],
  serial_shipping_container_code: ["sscc","numpal","numéro de palette","palette","sscc palette","serial_shipping_container_code","num_pal","code barre","unité de manutention","n° etiquetage","pallet_id"],

  // EXIT — destinataire
  exit_final_recipient:               ["destinataire","nom destinataire","nom","société","customer","client","nom du client","delivery_name","exit_final_recipient","exit_final_recipient_company","intitulé","société destinataire","delivery_to","ordered_by"],
  exit_final_recipient_address_line1: ["adresse 1","adresse","address","adresse livraison","rue","delivery_address_line1","exit_final_recipient_address_line1","des_adr1","adresse livraison - partie 1","delivery_address_line_1","addressline"],
  exit_final_recipient_address_line2: ["adresse 2","address2","adresse 2","complement","complément d'adresse","exit_final_recipient_address_line2","des_adr2","adresse livraison - partie 2"],
  exit_final_recipient_address_zip:   ["code postal","cp","zip","postal_code","exit_final_recipient_address_zip","delivery_address_zip","delivery_post_code","addresszip","des_cp","code postal de l'adresse de livraison"],
  exit_final_recipient_address_city:  ["ville","city","delivery_city","exit_final_recipient_address_city","delivery_address_city","addresscity","des_ville","ville de l'adresse de livraison"],
  exit_final_recipient_address_country:["pays","country","delivery_country","exit_final_recipient_address_country","delivery_address_country","pays de l'adresse de livraison","pays livraison"],
  exit_final_recipient_address_country_code:["code pays","country_code","dest_code_pays","pays de livraison","iso pays","exit_final_recipient_address_country_code"],
  exit_final_recipient_address_details:["complément d'adresse","instructions livraison","delivery_address_details","details","batiment","bâtiment"],
  exit_final_recipient_email:         ["email","e-mail","adresse e-mail","courriel","exit_final_recipient_email","delivery_email","des_mail","email livraison"],
  exit_final_recipient_phone_number:  ["téléphone","telephone","tel","phone","mobile","numéro de téléphone","exit_final_recipient_phone_number","des_tel","tél portable","mobile phone"],
  exit_final_recipient_details:       ["contact","contact destinataire","exit_final_recipient_details"],
  exit_final_recipient_company:       ["société","company","entreprise","exit_final_recipient_company","raison sociale"],

  // ENTRY — expéditeur
  entry_expeditor:                    ["expéditeur","expediteur","fournisseur","site proprietaire","sender","entry_expeditor","entry_expeditor_name"],
  entry_expeditor_address_line1:      ["adresse expéditeur","adresse fournisseur","entry_expeditor_address_line1","adresse"],
  entry_expeditor_address_zip:        ["code postal expéditeur","entry_expeditor_address_zip","cp"],
  entry_expeditor_address_city:       ["ville expéditeur","entry_expeditor_address_city","ville"],

  // Transport
  carrier:                            ["transporteur","carrier","transport","transport_carrier","mode transport","carrier_name","transporteur (à renseigner)"],
  transport_carrier_id:               ["id transporteur","carrier_id","transport_carrier_id"],
  tracking_number:                    ["suivi","tracking","numéro de suivi","bl","numéro bl","tracking_number","awb"],
  tracking_url:                       ["url de suivi","url suivi","lien de suivi","lien suivi","tracking url","tracking_url","url tracking","lien tracking"],
  ext_erp_carrier_id:                 ["code transporteur","code carrier","carrier code","id transporteur","code transport"],
  ext_erp_service_id:                 ["code service","code service de transport","service de transport","code service transport","service code"],

  // Entrepôt
  warehouse:                          ["entrepôt","depot","warehouse","site","dépôt de livraison","shelteriste","réceptionnaire"],
  warehouse_id:                       ["warehouse_id","id entrepôt","code entrepôt"],

  // Caractéristiques
  comment:                            ["commentaire","commentaires","comment","note","remarque","observation","instructions","orkrg.id"],
  designation:                        ["désignation","libellé","designation","libelle article","description","libellé article"],
  gross_weight:                       ["poids","poids brut","weight","kg","poids_brut","gross_weight"],
  volume:                             ["volume","m3","cbm"],
  linear_meter:                       ["mètres linéaires","ml","linear","linéaire"],
  goods_type:                         ["type marchandise","goods_type","type de marchandise","type de bien"],
  is_dangerous:                       ["dangereux","adr","dangerous","hazmat","is_dangerous"],
  is_refrigerated:                    ["réfrigéré","froid","cold","refrigerated","is_refrigerated","chaîne du froid"],
  incoterm:                           ["incoterm","inco","conditions commerciales"],

  // ERP/WMS
  edi_erp_id:                         ["ref erp","edi_erp_id","référence erp","identifiant erp"],
  edi_wms_id:                         ["ref wms","edi_wms_id","référence wms"],
  billing_address_name:               ["facturation","billing","adresse facturation"],
  billing_address_zip:                ["cp facturation","code postal facturation","billing_zip"],
  billing_address_city:               ["ville facturation","billing_city"],
  billing_address_country_code:       ["pays facturation","billing_country"],
};

// Loose form, for comparing against SYNONYMS (words separated by spaces).
function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Value-based detection ────────────────────────────────────────────────────
// When a header is unrecognizable (ERP codes like "ZTAB_042", "__EMPTY_3"), the data
// underneath still gives it away. Only ever used to *break ties* or rescue a column
// no header rule matched, never to override a real historical match.

const VALUE_PATTERNS = [
  { field: "delivery_email", test: v => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v) },
  { field: "delivery_phone_number", test: v => /^(\+\d{1,3}[\s.-]?)?[\d\s.()-]{9,17}$/.test(v) && (v.match(/\d/g) || []).length >= 9 },
  { field: "delivery_address_zip", test: v => /^\d{4,5}$/.test(v) },
  { field: "serial_shipping_container_code", test: v => /^\d{18}$/.test(v) },
  { field: "date", test: v => /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(v) || /^(19|20)\d{6}$/.test(v) },
  { field: "delivery_address_country", test: v => /^(france|belgique|belgium|espagne|spain|italie|italy|allemagne|germany|suisse|pays-bas|portugal|luxembourg)$/i.test(v) },
  { field: "item_packaging_type", test: v => /^(pallet|palette|carton|cardboard_box|boite|boîte|each|unite|unité|colis)$/i.test(v) },
];

// Detects a field from a column's sample values. Requires a strong majority so a single
// numeric-looking row can't drag a whole column to the wrong field.
function detectFromValues(samples) {
  const values = samples.map(v => String(v ?? "").trim()).filter(Boolean);
  if (values.length < 2) return null;

  for (const { field, test } of VALUE_PATTERNS) {
    const hits = values.filter(test).length;
    if (hits / values.length >= 0.8) return field;
  }
  return null;
}

// ─── Fuzzy history matching ───────────────────────────────────────────────────
// "n_de_commande" vs "n_commande": same intent, different wording. Token overlap
// (Jaccard) catches these without matching unrelated columns.

// French filler words inflate similarity ("ville de livraison" vs "ville livraison"
// should read as identical), so they're dropped before comparing.
const STOP_TOKENS = new Set(["de", "du", "la", "le", "les", "des", "d", "l", "en", "au", "aux", "a", "et", "pour", "par", "sur"]);

function tokens(normKey) {
  return new Set(normKey.split("_").filter(t => t.length > 1 && !STOP_TOKENS.has(t)));
}

function jaccard(a, b) {
  const inter = [...a].filter(t => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

// Scoring tiers, highest wins:
//   100  header IS the field key
//   91-97 exact historical match (more past uses = higher)
//   85-89 fuzzy historical match
//   90   exact synonym
//   70   value-based detection
//   60   partial synonym
//   30   field-key word appears in header
// Words that identify a field on their own, whatever else the header says. "Code SKU"
// otherwise drifted to the SSCC field because of the generic word "code".
const DECISIVE_WORDS = {
  item_reference: ["sku"],
};

function hasWord(headerNorm, word) {
  return headerNorm.split(" ").includes(word);
}

function score(headerNorm, fieldKey, syns, historyCount, fuzzyHistory, valueField) {
  const fieldNorm = normalize(fieldKey);
  if (headerNorm === fieldNorm) return 100;
  if ((DECISIVE_WORDS[fieldKey] || []).some(w => hasWord(headerNorm, w))) return 98;
  if (historyCount > 0) return Math.min(97, 91 + historyCount);
  if (syns.some(s => normalize(s) === headerNorm)) return 90;
  if (fuzzyHistory > 0) return Math.round(85 + fuzzyHistory * 4); // 0.75→88, 1.0→89
  if (valueField === fieldKey) return 70;
  if (syns.some(s => {
    const sn = normalize(s);
    return sn.length > 3 && (headerNorm.includes(sn) || sn.includes(headerNorm));
  })) return 60;
  if (fieldNorm.split(" ").some(part => part.length > 3 && headerNorm.includes(part))) return 30;
  return 0;
}

/**
 * Suggest a Spacefill field for each file column.
 *
 * @param headers          column headers from the file
 * @param spacefillFields  candidate fields (already filtered to visible ones)
 * @param history          [{header_normalized, field_key, occurrences}] real past matches
 * @param sampleRows       optional array of data rows (arrays aligned to `headers`),
 *                         used for value-based detection when the header is cryptic
 */
export function suggestMappings(headers, spacefillFields, history = [], sampleRows = []) {
  // Index history by the SAME normalization used to write it (lib/normalize-header.js).
  const historyByHeader = {};
  history.forEach(h => {
    if (!historyByHeader[h.header_normalized]) historyByHeader[h.header_normalized] = {};
    historyByHeader[h.header_normalized][h.field_key] = h.occurrences || 1;
  });
  const historyKeys = Object.keys(historyByHeader).map(k => ({ key: k, toks: tokens(k) }));

  return headers.map((header, colIndex) => {
    const norm = normalize(header);
    const normKey = normalizeHeader(header);
    const exactHistory = historyByHeader[normKey] || {};

    // Fuzzy history: closest past header above the similarity floor.
    let fuzzyHistory = {};
    if (Object.keys(exactHistory).length === 0 && normKey) {
      const myToks = tokens(normKey);
      // 0.6 floor: "ville livraison client" vs "ville livraison" (0.67) matches, while
      // "code postal livraison" vs "code postal client" (0.5) stays rejected.
      let best = null, bestSim = 0.6;
      if (myToks.size > 0) {
        for (const { key, toks } of historyKeys) {
          const sim = jaccard(myToks, toks);
          if (sim > bestSim) { bestSim = sim; best = key; }
        }
      }
      if (best) {
        for (const [fk] of Object.entries(historyByHeader[best])) fuzzyHistory[fk] = bestSim;
      }
    }

    const valueField = detectFromValues(sampleRows.map(r => r?.[colIndex]));

    let bestField = null;
    let bestScore = 0;
    for (const field of spacefillFields) {
      const syns = SYNONYMS[field.field_key] || [];
      const s = score(norm, field.field_key, syns, exactHistory[field.field_key] || 0, fuzzyHistory[field.field_key] || 0, valueField);
      if (s > bestScore) { bestScore = s; bestField = field; }
    }

    return {
      sourceColumn: header,
      suggestedField: bestScore >= 30 ? bestField : null,
      confidence: bestScore,
      // How the suggestion was reached — surfaced as a badge in the mapping table.
      source: bestScore === 0 ? null
        : bestScore >= 91 ? "history"
        : bestScore >= 85 ? "history-fuzzy"
        : bestScore === 70 ? "values"
        : "name",
    };
  });
}
