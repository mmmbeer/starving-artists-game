import { fireEvent, render } from '@testing-library/react';
import type { PaintCube } from '@shared/types/paint';
import type { ReactNode } from 'react';
import CanvasSquareOverlay from '../../src/game/canvas/CanvasSquareOverlay';
import DraggablePaintCube from '../../src/game/paint/DraggablePaintCube';
import { PaintDragProvider, type PaintDropIntent } from '../../src/game/paint/dragContext';
import { describe, expect, it, vi } from 'vitest';

const sampleCube: PaintCube = { id: 'cube-red', color: 'red' };
const invalidCube: PaintCube = { id: 'cube-blue', color: 'blue' };
const squareDefinition = {
  id: 'square-1',
  position: { x: 0.3, y: 0.4 },
  allowedColors: ['red']
};

const renderWithProviders = (
  content: ReactNode,
  onDrop: (intent: PaintDropIntent) => void = () => undefined,
  canDrag = true
) => render(<PaintDragProvider onDrop={onDrop} canDrag={canDrag}>{content}</PaintDragProvider>);

describe('drag and drop hints', () => {
  it('shows a ghost during drag and removes it after pointer up', () => {
    const { container, getByRole } = renderWithProviders(<DraggablePaintCube cube={sampleCube} />);
    const cubeButton = getByRole('button', { name: /paint cube red/i });
    fireEvent.pointerDown(cubeButton, { pointerId: 1, clientX: 20, clientY: 20 });
    expect(container.querySelector('.paint-drag-ghost')).toBeTruthy();
    fireEvent.pointerUp(document.body, { pointerId: 1 });
    expect(container.querySelector('.paint-drag-ghost')).toBeNull();
  });

  it('flags squares as valid when dragging a matching cube', () => {
    const { getByRole } = renderWithProviders(
      <>
        <DraggablePaintCube cube={sampleCube} />
        <CanvasSquareOverlay
          canvasId="canvas-1"
          square={squareDefinition}
          wildUsed={false}
        />
      </>
    );

    const cubeButton = getByRole('button', { name: /paint cube red/i });
    const square = document.querySelector('[aria-label="Canvas square square-1"]') as HTMLElement;
    fireEvent.pointerDown(cubeButton, { pointerId: 2, clientX: 30, clientY: 30 });
    fireEvent.pointerEnter(square, { pointerId: 2 });
    expect(square.className).toContain('canvas-square--hint-valid');
  });

  it('flags squares as invalid when dragging a non-matching cube', () => {
    const { getByRole } = renderWithProviders(
      <>
        <DraggablePaintCube cube={invalidCube} />
        <CanvasSquareOverlay
          canvasId="canvas-1"
          square={squareDefinition}
          wildUsed={false}
        />
      </>
    );

    const cubeButton = getByRole('button', { name: /paint cube blue/i });
    const square = document.querySelector('[aria-label="Canvas square square-1"]') as HTMLElement;
    fireEvent.pointerDown(cubeButton, { pointerId: 3, clientX: 10, clientY: 10 });
    fireEvent.pointerEnter(square, { pointerId: 3 });
    expect(square.className).toContain('canvas-square--hint-invalid');
  });

  it('reports drop intents and reconciles the ghost after drop', () => {
    const onDrop = vi.fn();
    const { container, getByRole } = renderWithProviders(
      <>
        <DraggablePaintCube cube={sampleCube} />
        <CanvasSquareOverlay
          canvasId="canvas-1"
          square={squareDefinition}
          wildUsed={false}
        />
      </>,
      onDrop
    );

    const cubeButton = getByRole('button', { name: /paint cube red/i });
    const square = document.querySelector('[aria-label="Canvas square square-1"]') as HTMLElement;
    fireEvent.pointerDown(cubeButton, { pointerId: 4, clientX: 15, clientY: 15 });
    fireEvent.pointerEnter(square, { pointerId: 4 });
    fireEvent.pointerUp(square, { pointerId: 4 });

    expect(onDrop).toHaveBeenCalledWith({
      canvasId: 'canvas-1',
      squareId: 'square-1',
      cubeId: 'cube-red',
      cubeColor: 'red'
    });
    expect(container.querySelector('.paint-drag-ghost')).toBeNull();
  });

  it('applies relative coordinates so hit areas survive resizing', () => {
    const { container } = renderWithProviders(
      <CanvasSquareOverlay canvasId="canvas-1" square={squareDefinition} wildUsed={false} />
    );

    const square = container.querySelector('[aria-label="Canvas square square-1"]') as HTMLElement;
    expect(square.style.getPropertyValue('--square-left')).toContain('%');
    expect(square.style.getPropertyValue('--square-top')).toContain('%');
  });
});
