import { testApiToken } from "@/lib/spacefill-api";

export async function POST(request) {
  const { api_token } = await request.json();
  if (!api_token) return Response.json({ valid: false, message: "Token manquant." });
  const result = await testApiToken(api_token);
  return Response.json({ ...result, message: result.valid ? "Token valide ✓" : `Token invalide (status ${result.status})` });
}
