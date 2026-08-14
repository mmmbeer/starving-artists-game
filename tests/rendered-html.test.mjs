import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("declares production search metadata in the root layout", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /metadataBase:\s*new URL\("https:\/\/www\.starvingartistsgame\.com"\)/);
  assert.match(layout, /alternates:\s*\{ canonical:\s*"\/" \}/);
  assert.match(layout, /googleBot:/);
  assert.doesNotMatch(layout, /"codex-preview":\s*"development"/);
});

test("gameplay UI exposes touch painting and confirmation dialogs", () => {
  const component = readFileSync("app/components/GameApp.tsx", "utf8");
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(component, /onPointerDown=/);
  assert.match(component, /elementFromPoint/);
  assert.match(component, /createPortal\(/);
  assert.match(component, /typeof document === "undefined" \? null : document\.body/);
  assert.doesNotMatch(component, /setDragOverlayRoot\(document\.body\)/);
  assert.match(component, /dragPoint &&\s+dragOverlayRoot &&/);
  assert.match(component, /data-paint-canvas=/);
  assert.match(component, /data-paint-square=/);
  assert.match(component, /className="studio-paint-targets"/);
  assert.match(component, /if \(!fallback\) \{/);
  assert.match(component, /completeCollection\.length - 1/);
  assert.match(component, /left: `\$\{square\.x \* 100\}%`/);
  assert.match(component, /top: `\$\{square\.y \* 100\}%`/);
  assert.match(styles, /\.studio-paint-targets \.canvas-requirement/);
  assert.match(
    styles,
    /\.studio-paint-targets \.canvas-requirement\.diamond\s*\{[^}]*translate\(-50%, -50%\) scale\(0\.88\)/s,
  );
  assert.match(
    styles,
    /\.studio-paint-targets \.canvas-requirement\.filled\s*\{[^}]*translate\(-50%, -50%\)/s,
  );
  assert.match(component, /role="dialog"/);
  assert.match(component, /title="Acquire Canvas"/);
  assert.match(component, /title="Trade Paint"/);
  assert.match(component, /title="Apply Paint"/);
  assert.match(component, /nextPaint\.length === 4/);
  assert.match(component, /className="undo-paint-action"/);
  assert.match(component, /Use fewer than four paints\?/);
  assert.match(component, /placement\.canvasInstanceId === owned\.instanceId/);
  assert.doesNotMatch(
    component,
    /type: "PAINT",\s*canvasInstanceId:/,
  );
  assert.match(component, /title="Sell Canvases"/);
  assert.match(component, /className="feature-modal-footer"/);
  assert.match(component, /footerRail=/);
  assert.match(component, /function CanvasCubeReference/);
  assert.match(component, /className="canvas-zoom"/);
  assert.match(component, /setCanvasPreview/);
  assert.match(component, /const DAY_PHASES/);
  assert.match(component, /className="day-phase-track"/);
  assert.match(component, /className=\{`nutrition-meter/);
  assert.match(component, /Array\.from\(\{ length: me\.nutrition \}/);
  assert.match(component, /title="Nutrition Warning"/);
  assert.match(component, /One nutrition remains\./);
  assert.match(component, /personalActionsRemaining/);
  assert.match(component, /phaseActionsRemaining/);
  assert.match(component, /function TurnWaitOverlay/);
  assert.match(component, /is taking their turn/);
  assert.match(component, /className="turn-wait-pixels"/);
  assert.match(component, /new ResizeObserver\(measureGrid\)/);
  assert.match(component, /"--wait-columns": pixelGrid\.columns/);
  assert.match(component, /View \$\{player\.displayName\}'s studio/);
  assert.match(component, /className="studio-peek-canvases"/);
  assert.match(component, /className="studio-paint-palette"/);
  assert.match(component, /studio-paint-swatch/);
  assert.match(component, /--studio-canvas-image/);
  assert.match(component, /aria-expanded=\{active\}/);
  assert.match(component, /function AvatarPicker/);
  assert.match(component, /function PlayerIcon/);
  assert.match(component, /function CubeArtwork/);
  assert.match(component, /function CubeRequirementArtwork/);
  assert.match(component, /wild: "\/cubes\/clear\.png"/);
  assert.match(component, /className="randomize-button"/);
  assert.match(component, /randomPlayerName/);
  assert.match(component, /randomStudioName/);
  assert.match(component, /"Go to sleep"/);
  assert.match(component, /You have no completed canvases to sell/);
  assert.match(styles, /\.studio-rack \.paint-cube\s*{\s*touch-action: none;/);
  assert.match(styles, /\.feature-modal\s*{/);
  assert.match(styles, /grid-template-rows: auto minmax\(0, 1fr\) auto;/);
  assert.match(styles, /\.canvas-card-meta\s*{\s*position: absolute;/);
  assert.match(styles, /\.canvas-cube-reference\s*{/);
  assert.match(styles, /\.day-status\s*{/);
  assert.match(styles, /\.day-action-counts\s*{/);
  assert.match(styles, /\.day-status\.waiting\s*{/);
  assert.match(styles, /\.turn-wait-overlay\s*{/);
  assert.match(styles, /container-type: size;/);
  assert.match(
    styles,
    /grid-template-columns: repeat\(var\(--wait-columns\), var\(--wait-pixel-size\)\);/,
  );
  assert.match(styles, /justify-content: space-between;/);
  assert.match(
    styles,
    /\.turn-wait-pixel\s*{[\s\S]*width: var\(--wait-pixel-size\);[\s\S]*height: var\(--wait-pixel-size\);/,
  );
  assert.match(styles, /@keyframes turn-wait-paint\s*{/);
  assert.match(styles, /\.score-player-button\s*{/);
  assert.match(styles, /\.studio-peek-canvases\s*{/);
  assert.match(styles, /\.nutrition-meter\s*{/);
  assert.match(styles, /\.nutrition-warning\s*{/);
  assert.match(styles, /\.studio-canvas-heading\.collapsed\s*{/);
  assert.match(styles, /var\(--studio-canvas-image\)/);
  assert.match(styles, /\.studio-paint-swatch\.needed\s*{/);
  assert.match(styles, /\.studio-paint-swatch\.applied\s*{/);
  assert.match(styles, /\.avatar-color-rail\s*{/);
  assert.match(styles, /\.avatar-icon-grid\s*{/);
  assert.match(styles, /\.player-avatar\s*{/);
  assert.match(styles, /\.cube-artwork\s*{/);
  assert.match(styles, /\.cube-requirement-art\.split \.cube-artwork/);
  assert.match(styles, /\.paint-action-warning\s*{/);
  assert.match(styles, /button\.paint-action\s*{/);
});

test("lobby and game headers expose an animated tutorial and complete rules", () => {
  const component = readFileSync("app/components/GameApp.tsx", "utf8");
  const home = readFileSync("app/page.tsx", "utf8");
  const gameRoute = readFileSync("app/game/[code]/page.tsx", "utf8");
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(component, /const TUTORIAL_PAGES = \[/);
  assert.match(component, /function TutorialModal/);
  assert.match(component, /function WrittenRulesModal/);
  assert.match(component, /function TutorialScene/);
  assert.match(component, /function TutorialCanvas/);
  assert.match(component, /function GameHelpControls/);
  assert.match(component, /className="tutorial-progress"/);
  assert.match(component, /className="rules-document"/);
  assert.match(component, /Read full rules/);
  assert.match(component, /aria-label="Open game rules"/);
  assert.match(component, /initialTutorialCanvases/);
  assert.match(component, /Object\.values\(envelope\.canvases\)/);
  assert.match(component, /selectTutorialCanvases\(canvases\)/);
  assert.match(component, /\{canvases\.map\(\(canvas, index\) =>/);
  assert.match(home, /selectTutorialCanvases\(await getCanvasCatalog\(\)\)/);
  assert.match(
    gameRoute,
    /selectTutorialCanvases\(await getCanvasCatalog\(\)\)/,
  );
  assert.match(component, /Place one to four cubes/);
  assert.match(component, /2→1, 5→2, or 9→3/);
  assert.match(component, /16 fame or 7 canvases/);
  assert.match(component, /14 fame or 6 canvases/);
  assert.match(component, /12 fame or 5 canvases/);
  assert.match(component, /35-card canvas deck/);
  assert.match(styles, /\.tutorial-modal\s*,\s*\.rules-modal\s*{/);
  assert.match(styles, /\.tutorial-page\s*{/);
  assert.match(
    styles,
    /\.tutorial-copy\s*{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior-y:\s*contain;[^}]*scrollbar-gutter:\s*stable;/s,
  );
  assert.match(
    styles,
    /@media \(max-width:\s*900px\)\s*{[\s\S]*?\.tutorial-copy\s*{[^}]*overflow-y:\s*visible;[^}]*scrollbar-gutter:\s*auto;/s,
  );
  assert.match(
    styles,
    /\.tutorial-canvas-art\s*{[^}]*container-type:\s*inline-size;/s,
  );
  assert.match(
    styles,
    /\.tutorial-requirement\s*{[^}]*width:\s*8\.57cqi;[^}]*height:\s*8\.57cqi;/s,
  );
  assert.match(
    styles,
    /\.tutorial-requirement \.tutorial-cube\s*{[^}]*width:\s*112\.5%;[^}]*height:\s*112\.5%;/s,
  );
  assert.match(styles, /\.rules-layout\s*{/);
  assert.match(styles, /\.rules-contents\s*{/);
  assert.match(styles, /@keyframes tutorial-cube-place\s*{/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("curator canvas editor fits, zooms, drags, and creates combo spaces", () => {
  const component = readFileSync("app/components/CuratorApp.tsx", "utf8");
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(component, /new ResizeObserver\(fitCanvas\)/);
  assert.match(component, /className="curator-canvas-stage"/);
  assert.match(component, /setCanvasZoom/);
  assert.match(component, /className="curator-zoom-controls"/);
  assert.match(component, /onPointerMove=\{continuePointerMove\}/);
  assert.match(component, /moveRequirement\(squareId, point\.x, point\.y\)/);
  assert.match(component, /placementMode === "combo"/);
  assert.match(component, /application\/x-paint-colors/);
  assert.match(component, /shape: allowedColors\.length > 1 \? "diamond"/);
  assert.match(component, /className="curator-editor-layout"/);
  assert.match(component, /className="curator-metadata-panel"/);
  assert.match(component, /className="curator-metadata-column"/);
  assert.match(component, /aria-label="Draggable color spaces"/);
  assert.match(component, /className="curator-selection-toolbar"/);
  assert.match(component, /event\.key !== "Delete"/);
  assert.match(component, /updateSelectedPosition\("x"/);
  assert.match(component, /updateSelectedPosition\("y"/);
  assert.doesNotMatch(component, /className="curator-editor-heading"/);
  assert.doesNotMatch(component, /Paint requirements/);
  assert.doesNotMatch(component, />Canvas editor</);
  assert.ok(
    component.indexOf('className="curator-metadata-panel"') <
      component.indexOf("Save canvas"),
  );
  assert.doesNotMatch(component, /Drag a color onto the art/);
  assert.match(styles, /\.curator-canvas-stage\s*{/);
  assert.match(styles, /overflow: auto;/);
  assert.match(styles, /\.curator-combo-builder\s*{/);
  assert.match(styles, /\.curator-zoom-controls\s*{/);
  assert.match(styles, /\.curator-editor-layout\s*{/);
  assert.match(styles, /\.curator-selection-toolbar\s*{/);
  assert.match(styles, /\.curator-metadata-panel\s*{/);
  assert.match(styles, /\.curator-metadata-column\s*{/);
});

test("landing page presents the complete canvas catalog as a rotating museum wall", () => {
  const component = readFileSync("app/components/GameApp.tsx", "utf8");
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(component, /function MuseumWall/);
  assert.match(component, /import\("\.\.\/lib\/canvas-data"\)/);
  assert.match(component, /const completeCollection = CANVASES\.map/);
  assert.match(component, /queue = shuffleMuseumQueue/);
  assert.match(component, /function createMuseumPlacement/);
  assert.match(component, /function museumArtworkCrop/);
  assert.match(component, /landscape\s*=\s*artwork\.aspectRatio > 1/);
  assert.match(component, /"--museum-image-width"/);
  assert.match(component, /"--museum-image-height"/);
  assert.match(component, /"--museum-image-left"/);
  assert.match(component, /"--museum-image-top"/);
  assert.match(component, /function chooseMuseumSlotCount/);
  assert.match(component, /function arrangeMuseumSlots/);
  assert.match(component, /scheduleRehang/);
  assert.match(component, /new ResizeObserver/);
  assert.match(component, /boundsRef/);
  assert.match(component, /"--museum-x"/);
  assert.match(component, /"--museum-y"/);
  assert.match(component, /aria-label="Rotating museum collection"/);
  assert.match(component, /className="museum-placard"/);
  assert.match(component, /\{artwork\.title\}/);
  assert.match(component, /\{artwork\.artist\}/);
  assert.match(component, /\{artwork\.year\}/);
  assert.doesNotMatch(component, /hero-card hero-card-one/);

  assert.match(styles, /\.museum-wall\s*{/);
  assert.match(styles, /height: 100dvh;/);
  assert.match(styles, /height: calc\(100dvh - 66px\);/);
  assert.match(
    styles,
    /@media \(min-width: 981px\)\s*{[\s\S]*?\.hero\s*{[\s\S]*?align-items: stretch;[\s\S]*?padding-block: 0;[\s\S]*?\.hero-copy\s*{[\s\S]*?align-self: center;[\s\S]*?\.hero-gallery\s*{[\s\S]*?align-self: stretch;[\s\S]*?height: auto;/,
  );
  assert.match(styles, /top: var\(--museum-y\);/);
  assert.match(styles, /left: var\(--museum-x\);/);
  assert.match(styles, /top: var\(--museum-image-top\);/);
  assert.match(styles, /left: var\(--museum-image-left\);/);
  assert.match(styles, /width: var\(--museum-image-width\);/);
  assert.match(styles, /\.museum-piece\.departing\s*{/);
  assert.match(styles, /\.museum-piece\.arriving\s*{/);
  assert.match(styles, /\.museum-placard\s*{/);
  assert.match(styles, /@keyframes museum-plunk\s*{/);
  assert.match(styles, /@keyframes museum-placard-arrive\s*{/);
  assert.match(styles, /@keyframes museum-glass-flash\s*{/);
});

test("game routes and host moderation controls are wired into the UI", () => {
  const component = readFileSync("app/components/GameApp.tsx", "utf8");
  const actionRoute = readFileSync(
    "app/api/games/[code]/action/route.ts",
    "utf8",
  );
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(component, /href=\{`\/game\/\$\{recent\.code\}`\}/);
  assert.match(component, /`\$\{window\.location\.origin\}\/game\/\$\{game\.code\}`/);
  assert.match(component, /function AbandonGameControl/);
  assert.match(component, /title="Abandon Game\?"/);
  assert.match(component, /act\(\{ type: "ABANDON_GAME" \}\)/);
  assert.match(component, /function KickPlayerControl/);
  assert.match(component, /title=\{`Kick \$\{player\.displayName\}\?`\}/);
  assert.match(component, /type: "KICK_PLAYER"/);
  assert.match(component, /You were removed from this game\./);
  assert.match(component, /loadRecentGames/);
  assert.match(component, /result\.game\.status !== "LOBBY"/);
  assert.match(actionRoute, /action\.type === "ABANDON_GAME"/);
  assert.match(actionRoute, /action\.type === "KICK_PLAYER"/);
  assert.match(styles, /\.recent-games\s*{/);
  assert.match(styles, /\.abandon-game-button\s*{/);
  assert.match(styles, /\.kick-player-button\s*{/);
  assert.match(styles, /\.kick-player-warning\s*{/);
  assert.match(styles, /\.danger-button\s*{/);
});

test("ships each cropped cube artwork asset", () => {
  for (const color of [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "black",
    "clear",
    "white",
  ]) {
    assert.equal(
      existsSync(`public/cubes/${color}.png`),
      true,
      `missing ${color} cube`,
    );
  }
});
