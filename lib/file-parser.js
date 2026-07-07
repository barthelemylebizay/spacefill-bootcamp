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

function parseCSV(buffer) {
  // Detect BOM and encoding
  let text;
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    // UTF-8 BOM
    text = new TextDecoder("utf-8").decode(buffer.slice(3));
  } else {
    try {
      text = new TextDecoder("utf-8").decode(buffer);
      // Check if it looks like garbled latin-1
      if (text.includes("â€") || text.includes("Ã©")) {
        text = new TextDecoder("latin1").decode(buffer);
      }
    } catch {
      text = new TextDecoder("latin1").decode(buffer);
    }
  }

  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const rows = lines.map(line => parseCSVLine(line, delimiter));

  return {
    rows,
    encoding: "UTF-8",
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

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
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
