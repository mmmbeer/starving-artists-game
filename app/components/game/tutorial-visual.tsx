import type { CSSProperties } from "react";
import type {
  CanvasDefinition,
  PaintColor,
} from "../../lib/types";
import { COLOR_LABELS, initials } from "./config";
import {
  CubeArtwork,
} from "./cube-ui";

export function TutorialCube({
  color,
  className = "",
}: {
  color: PaintColor;
  className?: string;
}) {
  return (
    <span
      className={`tutorial-cube cube-${color}${className ? ` ${className}` : ""}`}
      aria-label={`${COLOR_LABELS[color]} paint cube`}
    >
      <CubeArtwork color={color} />
    </span>
  );
}

export function TutorialCanvas({
  definition,
  painted = 0,
  cost,
  className = "",
}: {
  definition: CanvasDefinition;
  painted?: number;
  cost?: number;
  className?: string;
}) {
  return (
    <article
      className={`tutorial-canvas${className ? ` ${className}` : ""}`}
      style={
        {
          "--tutorial-canvas-ratio": definition.aspectRatio,
        } as CSSProperties
      }
    >
      <div className="tutorial-canvas-art">
        <img
          src={definition.image}
          alt={`${definition.title} by ${definition.artist}`}
        />
        {definition.squares.map((square, index) => {
          const cubeColor =
            index < painted ? square.allowedColors[0] ?? null : null;
          return (
            <span
              className={`tutorial-requirement ${square.shape}${
                square.allowedColors.length > 1 ? " split" : ""
              }${cubeColor ? " painted" : ""}`}
              key={square.id}
              style={
                {
                  left: `${square.x * 100}%`,
                  top: `${square.y * 100}%`,
                  "--tutorial-requirement-a": `var(--cube-${square.allowedColors[0]})`,
                  "--tutorial-requirement-b": `var(--cube-${
                    square.allowedColors[1] ?? square.allowedColors[0]
                  })`,
                  "--tutorial-cube-delay": `${index * 180}ms`,
                } as CSSProperties
              }
            >
              {cubeColor && <TutorialCube color={cubeColor} />}
            </span>
          );
        })}
        {cost !== undefined && (
          <span className="tutorial-canvas-cost">
            {cost} cube{cost === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="tutorial-canvas-meta">
        <span>
          <strong>{definition.title}</strong>
          <small>
            {definition.artist} · {definition.year}
          </small>
        </span>
        <b>
          ★ {definition.starValue} · ● {definition.foodValue} · ▰{" "}
          {definition.paintValue}
        </b>
      </div>
    </article>
  );
}

export function TutorialScene({
  page,
  canvases,
}: {
  page: number;
  canvases: CanvasDefinition[];
}) {
  const starryNight = canvases[2];

  if (page === 0) {
    return (
      <div className="tutorial-scene tutorial-goal-scene">
        <TutorialCanvas
          definition={starryNight}
          painted={4}
          className="hero-tutorial-canvas"
        />
        <div className="tutorial-goal-score">
          <span>★</span>
          <strong>{starryNight.starValue} fame</strong>
          <small>Build the best exhibition</small>
        </div>
      </div>
    );
  }

  if (page === 1) {
    return (
      <div className="tutorial-scene tutorial-morning-scene">
        <div className="tutorial-market-arrival">
          <span>Paint Market</span>
          <div>
            {(["red", "yellow", "blue", "purple"] as PaintColor[]).map(
              (color, index) => (
                <TutorialCube
                  color={color}
                  className={`arrival-cube arrival-${index + 1}`}
                  key={color}
                />
              ),
            )}
          </div>
        </div>
        <div className="tutorial-nutrition-drop">
          <strong>Nutrition</strong>
          <div>
            {[0, 1, 2, 3, 4].map((index) => (
              <span className={index === 4 ? "fading" : ""} key={index}>
                ●
              </span>
            ))}
          </div>
          <small>5 → 4</small>
        </div>
        <div className="tutorial-first-player">
          <i>1st</i>
          <span>Marker passes clockwise</span>
        </div>
      </div>
    );
  }

  if (page === 2) {
    return (
      <div className="tutorial-scene tutorial-turn-scene">
        <div className="tutorial-phase-line">
          <span className="active">1 Morning</span>
          <i />
          <span>2 Afternoon</span>
          <i />
          <span>3 Evening</span>
        </div>
        <div className="tutorial-player-turns">
          {["Georgia", "Vincent", "Frida"].map((name, index) => (
            <span className={index === 0 ? "acting" : ""} key={name}>
              <i>{initials(name)}</i>
              <b>{name}</b>
              {index === 0 && <small>Choose 1 action</small>}
            </span>
          ))}
        </div>
        <div className="tutorial-action-strip">
          {["Work +3", "Buy", "Paint 1–4", "Trade"].map((action) => (
            <b key={action}>{action}</b>
          ))}
        </div>
      </div>
    );
  }

  if (page === 3) {
    return (
      <div className="tutorial-scene tutorial-buy-scene">
        <div className="tutorial-market-canvases">
          {canvases.map((canvas, index) => (
            <TutorialCanvas
              definition={canvas}
              cost={index + 1}
              className={index === 1 ? "chosen" : ""}
              key={canvas.id}
            />
          ))}
        </div>
        <div className="tutorial-payment">
          <span>Your studio</span>
          <div>
            <TutorialCube color="green" className="pay-one" />
            <TutorialCube color="purple" className="pay-two" />
          </div>
          <b>Pay 2 →</b>
          <span>Paint Market</span>
        </div>
      </div>
    );
  }

  if (page === 4) {
    return (
      <div className="tutorial-scene tutorial-paint-scene">
        <div className="tutorial-paint-rack">
          {(["orange", "yellow", "blue", "wild"] as PaintColor[]).map(
            (color, index) => (
              <TutorialCube
                color={color}
                className={`paint-flight paint-flight-${index + 1}`}
                key={color}
              />
            ),
          )}
        </div>
        <TutorialCanvas
          definition={starryNight}
          painted={4}
          className="painting-demo"
        />
        <span className="tutorial-wild-note">
          <TutorialCube color="wild" /> Wild: one per canvas
        </span>
      </div>
    );
  }

  if (page === 5) {
    return (
      <div className="tutorial-scene tutorial-trade-scene">
        <div className="tutorial-trade-side">
          <span>Give</span>
          <div>
            <TutorialCube color="red" />
            <TutorialCube color="black" />
          </div>
        </div>
        <div className="tutorial-trade-arrow">
          <strong>2 : 1</strong>
          <span>→</span>
        </div>
        <div className="tutorial-trade-side take">
          <span>Take</span>
          <div>
            <TutorialCube color="blue" />
          </div>
        </div>
        <div className="tutorial-trade-rates">
          <b>Free · once per day</b>
          <b>2 → 1</b>
          <b>5 → 2</b>
          <b>9 → 3</b>
        </div>
      </div>
    );
  }

  if (page === 6) {
    return (
      <div className="tutorial-scene tutorial-sale-scene">
        <TutorialCanvas
          definition={starryNight}
          painted={4}
          className="sale-canvas"
        />
        <div className="tutorial-sale-rewards">
          <span>
            <i>★</i>
            <strong>+{starryNight.starValue} fame</strong>
          </span>
          <span>
            <i>●</i>
            <strong>+{starryNight.foodValue} food</strong>
          </span>
          <span>
            <i>▰</i>
            <strong>{starryNight.paintValue} paint claim</strong>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorial-scene tutorial-end-scene">
      <div className="tutorial-collection-order">
        <span className="first">
          <b>1st seller</b>
          <strong>Pick up to 4</strong>
        </span>
        <span className="second">
          <b>2nd seller</b>
          <strong>Pick up to 2</strong>
        </span>
        <span>
          <b>Others</b>
          <strong>Pick 1</strong>
        </span>
      </div>
      <div className="tutorial-finish-line">
        <span>2 players</span>
        <b>16 fame or 7 sold</b>
        <span>3 players</span>
        <b>14 fame or 6 sold</b>
        <span>4 players</span>
        <b>12 fame or 5 sold</b>
      </div>
    </div>
  );
}

