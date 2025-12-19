import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PaintCube } from '@shared/types/paint';
import './PaintCubeLayer.css';

type DropTarget = {
  canvasId: string;
  squareId: string;
};

export type PaintDropIntent = DropTarget & {
  cubeId: string;
  cubeColor: PaintCube['color'];
};

interface PaintDragContextValue {
  isDragging: boolean;
  dragCube?: PaintCube;
  pointer: { x: number; y: number } | null;
  hoverTarget: DropTarget | null;
  canDrag: boolean;
  startDrag: (cube: PaintCube, clientX: number, clientY: number) => void;
  enterSquare: (target: DropTarget) => void;
  leaveSquare: () => void;
  dropOnSquare: (target: DropTarget) => void;
}

interface PaintDragProviderProps {
  children: React.ReactNode;
  canDrag: boolean;
  onDrop: (intent: PaintDropIntent) => void;
}

const PaintDragContext = createContext<PaintDragContextValue | undefined>(undefined);

export const usePaintDrag = () => {
  const context = useContext(PaintDragContext);
  if (!context) {
    throw new Error('usePaintDrag must be used within a PaintDragProvider');
  }
  return context;
};

/**
 * PaintDragProvider captures pointer motion, hover targets, and drop intent.
 * All styling is governed by shared tokens so this content stays logic-only.
 * Optimistic drops are reported via onDrop and resolved once the server responds.
 */
export const PaintDragProvider = ({ children, canDrag, onDrop }: PaintDragProviderProps) => {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    cube?: PaintCube;
    pointer: { x: number; y: number } | null;
  }>({
    isDragging: false,
    cube: undefined,
    pointer: null
  });
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);

  const startDrag = useCallback(
    (cube: PaintCube, clientX: number, clientY: number) => {
      if (!canDrag) {
        return;
      }
      setDragState({ isDragging: true, cube, pointer: { x: clientX, y: clientY } });
      setHoverTarget(null);
    },
    [canDrag]
  );

  const updatePointer = useCallback((x: number, y: number) => {
    setDragState((previous) => (previous.isDragging ? { ...previous, pointer: { x, y } } : previous));
  }, []);

  const finishDrag = useCallback(() => {
    setDragState({ isDragging: false, cube: undefined, pointer: null });
    setHoverTarget(null);
  }, []);

  const enterSquare = useCallback(
    (target: DropTarget) => {
      if (!dragState.isDragging) {
        return;
      }
      setHoverTarget(target);
    },
    [dragState.isDragging]
  );

  const leaveSquare = useCallback(() => {
    setHoverTarget(null);
  }, []);

  const dropOnSquare = useCallback(
    (target: DropTarget) => {
      if (!dragState.isDragging || !dragState.cube) {
        return;
      }
      onDrop({
        canvasId: target.canvasId,
        squareId: target.squareId,
        cubeId: dragState.cube.id,
        cubeColor: dragState.cube.color
      });
      finishDrag();
    },
    [dragState, onDrop, finishDrag]
  );

  useEffect(() => {
    if (!dragState.isDragging) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      updatePointer(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      finishDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState.isDragging, updatePointer, finishDrag]);

  const value = useMemo(
    () => ({
      isDragging: dragState.isDragging,
      dragCube: dragState.cube,
      pointer: dragState.pointer,
      hoverTarget,
      canDrag,
      startDrag,
      enterSquare,
      leaveSquare,
      dropOnSquare
    }),
    [
      dragState.isDragging,
      dragState.cube,
      dragState.pointer,
      hoverTarget,
      canDrag,
      startDrag,
      enterSquare,
      leaveSquare,
      dropOnSquare
    ]
  );

  return (
    <PaintDragContext.Provider value={value}>
      {children}
      {dragState.isDragging && dragState.pointer && dragState.cube && (
        <div
          className="paint-drag-ghost"
          style={{
            left: dragState.pointer.x,
            top: dragState.pointer.y
          }}
        >
          <span className={`paint-cube paint-cube--${dragState.cube.color}`} />
        </div>
      )}
    </PaintDragContext.Provider>
  );
};
