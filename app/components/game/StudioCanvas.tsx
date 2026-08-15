"use client";
import type {
  CanvasDefinition,
  OwnedCanvas,
  PaintCube,
} from "../../lib/types";
import { COLOR_LABELS, type PendingPaintPlacement } from "./config";
import { CubeRequirementArtwork, RequirementMark } from "./cube-ui";

export function StudioCanvas({
  owned,
  definition,
  active,
  pending,
  selectedCubeId,
  cubes,
  onSelect,
  onPreview,
  onPlace,
  onClear,
}: {
  owned: OwnedCanvas;
  definition: CanvasDefinition;
  active: boolean;
  pending: PendingPaintPlacement[];
  selectedCubeId: string | null;
  cubes: PaintCube[];
  onSelect: () => void;
  onPreview: () => void;
  onPlace?: (squareId: string, cubeId: string) => void;
  onClear?: () => void;
}) {
  const pendingMap = Object.fromEntries(
    pending.map((placement) => [
      placement.squareId,
      cubes.find((cube) => cube.id === placement.cubeId),
    ]),
  );
  const appliedPaintCount =
    Object.keys(owned.placedCubes).length + pending.length;
  const filled = appliedPaintCount === definition.squares.length;
  return (
    <article className={`studio-canvas${active ? " active" : ""}`}>
      <button
        className={`studio-canvas-heading${active ? "" : " collapsed"}`}
        type="button"
        onClick={onSelect}
        style={
          {
            "--studio-canvas-image": `url("${definition.image}")`,
          } as React.CSSProperties
        }
        aria-expanded={active}
      >
        <span className="studio-canvas-title">
          <strong>{definition.title}</strong>
          <small>{definition.artist}</small>
        </span>
        <span
          className="studio-paint-palette"
          aria-label={`${appliedPaintCount} of ${definition.squares.length} paints applied`}
        >
          {definition.squares.map((square) => {
            const appliedCube =
              pendingMap[square.id] ?? owned.placedCubes[square.id];
            const paletteColors = appliedCube
              ? [appliedCube.color]
              : square.allowedColors;
            return (
              <i
                key={square.id}
                className={`studio-paint-swatch${
                  appliedCube ? " applied" : " needed"
                }${paletteColors.length > 1 ? " split" : ""}`}
                style={
                  paletteColors.length > 1
                    ? ({
                        "--studio-paint-a": `var(--cube-${paletteColors[0]})`,
                        "--studio-paint-b": `var(--cube-${paletteColors[1]})`,
                      } as React.CSSProperties)
                    : ({
                        "--studio-paint-a": `var(--cube-${paletteColors[0]})`,
                      } as React.CSSProperties)
                }
                title={`${paletteColors.map((color) => COLOR_LABELS[color]).join(" or ")} paint ${
                  appliedCube ? "applied" : "needed"
                }`}
              >
                <CubeRequirementArtwork colors={paletteColors} />
                {appliedCube ? <span className="paint-applied-mark">✓</span> : ""}
              </i>
            );
          })}
          {filled && <b>Complete</b>}
        </span>
      </button>
      {active && (
        <div className="studio-workspace">
          <div
            className="studio-art"
            style={{ aspectRatio: definition.aspectRatio }}
          >
            <button
              type="button"
              className="studio-art-preview"
              onClick={onPreview}
              aria-label={`View ${definition.title}`}
            >
              <img src={definition.image} alt="" />
            </button>
            <div
              className="studio-paint-targets"
              aria-label={`Paint spaces for ${definition.title}`}
            >
              {definition.squares.map((square) => (
                <RequirementMark
                  key={square.id}
                  square={square}
                  cube={owned.placedCubes[square.id]}
                  pendingCube={pendingMap[square.id]}
                  selectedCubeId={selectedCubeId}
                  canvasInstanceId={owned.instanceId}
                  onCanvas
                  onDropCube={onPlace}
                />
              ))}
            </div>
          </div>
          <div className="studio-workspace-footer">
            <span>Drag paint directly onto a marked space.</span>
            {pending.length > 0 && (
              <button className="clear-paint" type="button" onClick={onClear}>
                Clear pending
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

