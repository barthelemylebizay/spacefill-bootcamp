import { parseFile, getPreviewRows } from "@/lib/file-parser";

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) return Response.json({ error: "Aucun fichier fourni." }, { status: 400 });

  const buffer = await file.arrayBuffer();
  try {
    const parsed = parseFile(Buffer.from(buffer), file.name);
    const preview = getPreviewRows(parsed.rows, parsed.headerRowIndex, 10);
    return Response.json({
      ...parsed,
      preview,
      fileName: file.name,
      fileSize: file.size,
      // Kept with the import for a week so a failed run can be replayed against the exact
      // bytes that were uploaded. Skipped for large files to stay out of row-size trouble.
      rawFile: file.size <= 2_000_000 ? Buffer.from(buffer).toString("base64") : null,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
