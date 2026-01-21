// Canvas painting logic
import { PlayerCanvas, PaintCube, CanvasSquare } from '../../models/types';

export function canPaintSquare(
  canvas: PlayerCanvas,
  squareId: string,
  cube: PaintCube
): { valid: boolean; error?: string } {
  if (!canvas.definition) {
    return { valid: false, error: 'Canvas definition not found' };
  }
  
  // Find the square
  const square = canvas.definition.layout_json.squares.find(s => s.id === squareId);
  if (!square) {
    return { valid: false, error: 'Square not found on canvas' };
  }
  
  // Check if square is already painted
  const alreadyPainted = canvas.painted_squares.some(ps => ps.squareId === squareId);
  if (alreadyPainted) {
    return { valid: false, error: 'Square is already painted' };
  }
  
  // Check if cube color is allowed
  if (cube.is_wild) {
    // Check if canvas already has a wild cube
    const hasWild = canvas.painted_squares.some(ps => {
      // We need to check if the cube used was wild
      // This info should be stored in painted_squares
      return ps.color === 'wild';
    });
    
    if (hasWild) {
      return { valid: false, error: 'Canvas can only have one wild cube' };
    }
    
    return { valid: true };
  }
  
  // Check if regular color matches allowed colors
  if (!square.allowedColors.includes(cube.color)) {
    return { valid: false, error: 'Cube color not allowed for this square' };
  }
  
  return { valid: true };
}

export function paintSquare(
  canvas: PlayerCanvas,
  squareId: string,
  cube: PaintCube
): PlayerCanvas {
  const paintedSquares = [
    ...canvas.painted_squares,
    {
      squareId,
      cubeId: cube.id,
      color: cube.color,
    },
  ];
  
  return {
    ...canvas,
    painted_squares: paintedSquares,
  };
}

export function isCanvasComplete(canvas: PlayerCanvas): boolean {
  if (!canvas.definition) return false;
  
  const totalSquares = canvas.definition.layout_json.squares.length;
  const paintedSquares = canvas.painted_squares.length;
  
  return paintedSquares === totalSquares;
}

export function getUnpaintedSquares(canvas: PlayerCanvas): CanvasSquare[] {
  if (!canvas.definition) return [];
  
  const paintedSquareIds = new Set(canvas.painted_squares.map(ps => ps.squareId));
  
  return canvas.definition.layout_json.squares.filter(
    square => !paintedSquareIds.has(square.id)
  );
}

export function getCanvasProgress(canvas: PlayerCanvas): {
  total: number;
  painted: number;
  percentage: number;
} {
  const total = canvas.definition?.layout_json.squares.length || 0;
  const painted = canvas.painted_squares.length;
  const percentage = total > 0 ? Math.round((painted / total) * 100) : 0;
  
  return { total, painted, percentage };
}
