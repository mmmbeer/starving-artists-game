import type { CanvasRendererProps } from './types';
import CanvasSquareOverlay from './CanvasSquareOverlay';
import './CanvasRenderer.css';

const composeKey = (canvasId: string, squareId: string) => `${canvasId}:${squareId}`;

const CanvasRenderer = ({ canvas, optimisticPlacements, wildUsed }: CanvasRendererProps) => {
  const squares = canvas.definition.squares.map((square) => {
    const optimisticCube = optimisticPlacements[composeKey(canvas.id, square.id)];

    return (
      <CanvasSquareOverlay
        key={square.id}
        canvasId={canvas.id}
        square={square}
        placedCube={canvas.placedCubes[square.id]}
        optimisticCube={optimisticCube}
        wildUsed={wildUsed}
      />
    );
  });

  return (
    <article className="canvas-card">
      <header className="canvas-card__header">
        <div>
          <p className="canvas-card__title">{canvas.definition.title}</p>
          <p className="canvas-card__meta">
            Star: {canvas.definition.starValue} · Paint: {canvas.definition.paintValue}
          </p>
        </div>
        {wildUsed && <span className="canvas-card__wild-flag">Wild cube deployed</span>}
      </header>
      <div className="canvas-card__media">
        {canvas.definition.filename ? (
          <img
            src={canvas.definition.filename}
            alt={canvas.definition.title}
            className="canvas-card__image"
          />
        ) : (
          <div className="canvas-card__placeholder" aria-hidden="true" />
        )}
        <div className="canvas-card__overlay">{squares}</div>
      </div>
    </article>
  );
};

export default CanvasRenderer;
