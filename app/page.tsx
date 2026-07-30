import GameApp from "./components/GameApp";
import { getCanvasCatalog } from "./lib/canvas-catalog";
import { selectTutorialCanvases } from "./lib/tutorial-canvases";

export const dynamic = "force-dynamic";

export default async function Home() {
  const tutorialCanvases = selectTutorialCanvases(await getCanvasCatalog());
  return <GameApp initialTutorialCanvases={tutorialCanvases} />;
}
