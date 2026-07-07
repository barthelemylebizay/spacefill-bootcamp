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
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
