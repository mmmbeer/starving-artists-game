import type { CSSProperties, PointerEvent } from 'react';
import { useMemo } from 'react';
import type { PaintColor } from '@shared/types/common';
import type { PaintCube } from '@shared/types/paint';
import type { CanvasSquareOverlayProps } from './types';
import { usePaintDrag } from '../paint/dragContext';

const buildStyle = (position: { x: number; y: number }): CSSProperties => ({
  '--square-top': `${position.y * 100}%`,
  '--square-left': `${position.x * 100}%`
}) as CSSProperties;

const isColorAllowed = (color: PaintColor, allowed: PaintColor[]) => allowed.includes(color);

const CanvasSquareOverlay = ({
  canvasId,
  square,
  placedCube,
  optimisticCube,
  wildUsed
}: CanvasSquareOverlayProps) => {
  const { dragCube, hoverTarget, enterSquare, leaveSquare, dropOnSquare } = usePaintDrag();
  const isHoverTarget = hoverTarget?.canvasId === canvasId && hoverTarget.squareId === square.id;
  const isWildDrag = dragCube?.color === 'wild';
  const isDragActive = Boolean(dragCube);
  const acceptsWild = !wildUsed;
  const hintState = useMemo(() => {
    if (!dragCube) {
      return null;
    }
    if (isWildDrag) {
      return acceptsWild ? 'valid' : 'invalid';
    }
    return isColorAllowed(dragCube.color, square.allowedColors) ? 'valid' : 'invalid';
  }, [dragCube, isWildDrag, acceptsWild, square.allowedColors]);

  const hasHighlight = isDragActive && hintState;
  const occupancy = optimisticCube ?? placedCube;

  const handlePointerEnter = () => {
    enterSquare({ canvasId, squareId: square.id });
  };

  const handlePointerLeave = () => {
    leaveSquare();
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    dropOnSquare({ canvasId, squareId: square.id });
  };

  const classes = ['canvas-square'];
  if (isHoverTarget) {
    classes.push('canvas-square--hovered');
  }
  if (hintState === 'valid') {
    classes.push('canvas-square--hint-valid');
  } else if (hintState === 'invalid') {
    classes.push('canvas-square--hint-invalid');
  }

  const squareStyle = buildStyle(square.position);

  return (
    <div
      className={classes.join(' ')}
      style={squareStyle}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      role="presentation"
      aria-label={`Canvas square ${square.id}`}
    >
      {occupancy && (
        <span className={`canvas-square__occupant paint-cube paint-cube--${occupancy.color}`} aria-hidden="true" />
      )}
      {hasHighlight && (
        <span className={`canvas-square__hint canvas-square__hint--${hintState}`} aria-hidden="true" />
      )}
    </div>
  );
};

export default CanvasSquareOverlay;
