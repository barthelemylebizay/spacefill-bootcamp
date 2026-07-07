import { mockStore } from "@/lib/mock-data";

export async function GET() {
  return Response.json(mockStore.dashboards || []);
}
