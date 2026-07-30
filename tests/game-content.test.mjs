import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function loadCanvases() {
  const source = readFileSync(join(root, "app/lib/canvas-data.ts"), "utf8");
  const match = source.match(/CANVASES: CanvasDefinition\[\] = (.*);\s*$/s);
  assert.ok(match, "canvas-data.ts must contain a JSON-compatible canvas array");
  return JSON.parse(match[1]);
}

test("the complete canvas library is playable and backed by web assets", () => {
  const canvases = loadCanvases();
  assert.equal(canvases.length, 148);
  assert.equal(new Set(canvases.map((canvas) => canvas.id)).size, canvases.length);

  for (const canvas of canvases) {
    assert.ok(canvas.title);
    assert.ok(canvas.artist);
    assert.ok(canvas.squares.length > 0, `${canvas.id} has no paint targets`);
    assert.ok(canvas.starValue >= 1 && canvas.starValue <= 6);
    assert.ok(canvas.foodValue >= 0 && canvas.foodValue <= 6);
    assert.ok(canvas.paintValue >= 1 && canvas.paintValue <= 25);
    assert.ok(
      existsSync(join(root, "public", canvas.image.replace(/^\//, ""))),
      `${canvas.image} is missing`,
    );

    for (const square of canvas.squares) {
      assert.ok(square.allowedColors.length >= 1);
      assert.ok(square.allowedColors.length <= 2);
    }
  }
});

test("the multiplayer API exposes create, join, poll, and action endpoints", () => {
  for (const path of [
    "app/api/games/route.ts",
    "app/api/games/[code]/route.ts",
    "app/api/games/[code]/join/route.ts",
    "app/api/games/[code]/action/route.ts",
  ]) {
    assert.ok(existsSync(join(root, path)), `${path} is missing`);
  }
  assert.ok(
    existsSync(join(root, "app/game/[code]/page.tsx")),
    "the canonical game route is missing",
  );
});

test("every player color has five transparent food icon assets", () => {
  const source = readFileSync(
    join(root, "app/lib/player-identities.ts"),
    "utf8",
  );
  const colors = ["red", "orange", "yellow", "green", "blue", "purple"];
  for (const color of colors) {
    const paths = [
      ...source.matchAll(
        new RegExp(`image: "(/food-icons/${color}-[^"]+\\.png)"`, "g"),
      ),
    ].map((match) => match[1]);
    assert.equal(paths.length, 5, `${color} should have five food icons`);
    for (const image of paths) {
      assert.ok(
        existsSync(join(root, "public", image.replace(/^\//, ""))),
        `${image} is missing`,
      );
    }
  }
});
