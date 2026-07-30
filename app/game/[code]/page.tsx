import GameApp from "../../components/GameApp";
import { getCanvasCatalog } from "../../lib/canvas-catalog";
import { selectTutorialCanvases } from "../../lib/tutorial-canvases";

export const dynamic = "force-dynamic";

export default async function GameRoute({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const tutorialCanvases = selectTutorialCanvases(await getCanvasCatalog());
  return (
    <GameApp
      initialGameCode={code.toUpperCase()}
      initialTutorialCanvases={tutorialCanvases}
    />
  );
}
