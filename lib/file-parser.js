// File parsing — CSV, XLS, XLSX with auto-detection of encoding, delimiter, header row
import * as XLSX from "xlsx";

export function parseFile(fileBuffer, fileName) {
  const ext = fileName.split(".").pop().toLowerCase();

  if (ext === "csv") {
    return parseCSV(fileBuffer);
  } else if (ext === "xlsx" || ext === "xls") {
    return parseExcel(fileBuffer);
  }
  throw new Error(`Format non supporté : .${ext}`);
}

// Decodes the bytes without mangling accents, whatever the export tool used.
// Order matters: a strict UTF-8 attempt first (it fails loudly on non-UTF-8 bytes),
// then Windows-1252 — which is what Excel on Windows produces and which, unlike
// latin1, carries €, œ, ’ and the curly quotes French files are full of.
function decodeText(buffer) {
  const bytes = new Uint8Array(buffer);

  // UTF-16 byte-order marks (Excel "Unicode text" exports).
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder("utf-16le").decode(buffer.slice(2)), encoding: "UTF-16" };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder("utf-16be").decode(buffer.slice(2)), encoding: "UTF-16" };
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { text: new TextDecoder("utf-8").decode(buffer.slice(3)), encoding: "UTF-8" };

  try {
    // fatal: true makes an invalid byte sequence throw instead of silently producing
    // replacement characters, which is exactly how accents used to end up mangled.
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buffer), encoding: "UTF-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(buffer), encoding: "Windows-1252" };
  }
}

// Repairs text that is already double-encoded (UTF-8 bytes read as Windows-1252 by the
// tool that produced the file): "Ã©" back to "é". Only applied when the tell-tale
// sequences are present, so correct text is never touched.
const MOJIBAKE = /Ã[©¨ªüçÂ´¢]|â€|Ãª|Ã´|Ã®|Ã¯|Ã»|Ã¹|Ã€|Ã‰/;
function repairMojibake(text) {
  if (!MOJIBAKE.test(text)) return text;
  try {
    const bytes = Uint8Array.from([...text].map(ch => ch.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return MOJIBAKE.test(repaired) ? text : repaired;
  } catch {
    return text;
  }
}

function parseCSV(buffer) {
  const decoded = decodeText(buffer);
  const text = repairMojibake(decoded.text);

  const delimiter = detectDelimiter(text);
  const rows = parseCSVText(text, delimiter).filter(row => row.some(cell => cell.trim() !== ""));

  return {
    rows,
    encoding: decoded.encoding,
    delimiter,
    headerRowIndex: 0,
    totalRows: rows.length,
  };
}

function detectDelimiter(text) {
  const sample = text.split("\n").slice(0, 5).join("\n");
  const counts = {
    ",": (sample.match(/,/g) || []).length,
    ";": (sample.match(/;/g) || []).length,
    "\t": (sample.match(/\t/g) || []).length,
    "|": (sample.match(/\|/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// Tokenizes the whole file at once (not line-by-line) so a quoted field containing a
// literal newline — common in address exports — doesn't get split into two rows.
function parseCSVText(text, delimiter) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  if (current !== "" || row.length) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  return {
    rows: rows.map(row => row.map(cell => cell === null || cell === undefined ? "" : String(cell))),
    encoding: "UTF-8",
    delimiter: null,
    headerRowIndex: 0,
    totalRows: rows.length,
  };
}

export function extractHeaders(rows, headerRowIndex) {
  return (rows[headerRowIndex] || []).map(h => String(h).trim());
}

export function extractDataRows(rows, headerRowIndex) {
  return rows.slice(headerRowIndex + 1).filter(row => row.some(cell => String(cell).trim() !== ""));
}

export function getPreviewRows(rows, headerRowIndex, count = 10) {
  const headers = extractHeaders(rows, headerRowIndex);
  const data = extractDataRows(rows, headerRowIndex).slice(0, count);
  return { headers, data };
}
