// Auto-suggest column → Spacefill field mappings
// Synonyms extracted from 165 real production configurations

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

function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function score(headerNorm, fieldKey, syns, historyCount) {
  const fieldNorm = normalize(fieldKey);
  if (headerNorm === fieldNorm) return 100;
  if (historyCount > 0) return Math.min(97, 91 + historyCount);
  if (syns.some(s => normalize(s) === headerNorm)) return 90;
  if (fieldNorm === headerNorm) return 100;
  if (syns.some(s => {
    const sn = normalize(s);
    return sn.length > 3 && (headerNorm.includes(sn) || sn.includes(headerNorm));
  })) return 60;
  if (normalize(fieldKey).split("_").some(part => part.length > 3 && headerNorm.includes(part))) return 30;
  return 0;
}

// history: [{ header_normalized, field_key, occurrences }] — real past matches, used to
// out-rank generic synonym guesses whenever a client's own header has been mapped before.
export function suggestMappings(headers, spacefillFields, history = []) {
  const normalizeStrip = (h) => normalize(h).replace(/\s+/g, "_");
  const historyByHeader = {};
  history.forEach(h => {
    if (!historyByHeader[h.header_normalized]) historyByHeader[h.header_normalized] = {};
    historyByHeader[h.header_normalized][h.field_key] = h.occurrences || 1;
  });

  return headers.map(header => {
    const norm = normalize(header);
    const normKey = normalizeStrip(header);
    const historyForHeader = historyByHeader[normKey] || {};
    let bestField = null;
    let bestScore = 0;

    for (const field of spacefillFields) {
      const syns = SYNONYMS[field.field_key] || [];
      const s = score(norm, field.field_key, syns, historyForHeader[field.field_key] || 0);
      if (s > bestScore) { bestScore = s; bestField = field; }
    }

    return {
      sourceColumn: header,
      suggestedField: bestScore >= 30 ? bestField : null,
      confidence: bestScore,
    };
  });
}
