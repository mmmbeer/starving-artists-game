import type { PointerEventHandler } from 'react';
import type { PaintCube } from '@shared/types/paint';
import { usePaintDrag } from './dragContext';

interface DraggablePaintCubeProps {
  cube: PaintCube;
}

const DraggablePaintCube = ({ cube }: DraggablePaintCubeProps) => {
  const { startDrag, dragCube, canDrag, isDragging } = usePaintDrag();
  const isActive = isDragging && dragCube?.id === cube.id;

  const handlePointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (!canDrag || isActive) {
      return;
    }
    event.preventDefault();
    startDrag(cube, event.clientX, event.clientY);
  };

  return (
    <button
      type="button"
      className={`paint-cube paint-cube--${cube.color} ${isActive ? 'paint-cube--ghosted' : ''}`}
      onPointerDown={handlePointerDown}
      disabled={!canDrag}
      aria-label={`Paint cube ${cube.color}`}
    >
      <span className="paint-cube__label">{cube.color}</span>
      {cube.color === 'wild' && <span className="paint-cube__wild-badge">wild</span>}
    </button>
  );
};

export default DraggablePaintCube;
