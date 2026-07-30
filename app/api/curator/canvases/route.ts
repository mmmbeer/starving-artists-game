import { getCanvasCatalog } from "../../../lib/canvas-catalog";
import { isCuratorRequest } from "../../../lib/curator-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isCuratorRequest(request))) {
    return Response.json({ error: "Curator sign-in required." }, { status: 401 });
  }
  return Response.json(
    { canvases: await getCanvasCatalog() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
