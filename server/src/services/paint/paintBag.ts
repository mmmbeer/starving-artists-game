// Paint bag and market management
import { PaintCube, PaintColor } from '../../models/types';
import { createPaintCube, drawFromBag } from '../../utils/helpers';
import { PAINT_COLORS } from '../../utils/constants';

export function createPaintBag(): PaintCube[] {
  const cubes: PaintCube[] = [];
  
  // Regular colors: 18 of each (7 colors = 126 cubes)
  const regularColors = PAINT_COLORS.filter(c => c !== 'wild');
  for (const color of regularColors) {
    for (let i = 0; i < 18; i++) {
      cubes.push(createPaintCube(color));
    }
  }
  
  // Wild cubes: 24
  for (let i = 0; i < 24; i++) {
    cubes.push(createPaintCube('wild'));
  }
  
  return cubes;
}

export function drawPaintCubes(
  bag: PaintCube[],
  count: number
): { drawn: PaintCube[]; remaining: PaintCube[] } {
  return drawFromBag(bag, count);
}

export function addToPaintMarket(
  market: PaintCube[],
  cubes: PaintCube[]
): PaintCube[] {
  return [...market, ...cubes];
}

export function removeFromPaintMarket(
  market: PaintCube[],
  cubeIds: string[]
): PaintCube[] {
  return market.filter(cube => !cubeIds.includes(cube.id));
}

export function canTakeCubeFromMarket(
  cube: PaintCube,
  playerCubes: PaintCube[]
): boolean {
  // Check if player already has a wild cube
  if (cube.is_wild) {
    return !playerCubes.some(c => c.is_wild);
  }
  return true;
}

export function executePaintTrade(
  playerCubes: PaintCube[],
  tradedCubeIds: string[],
  receivedCubes: PaintCube[]
): PaintCube[] {
  const remaining = playerCubes.filter(c => !tradedCubeIds.includes(c.id));
  return [...remaining, ...receivedCubes];
}

export function validateTradeRatio(
  tradedCount: number,
  receivedCount: number
): boolean {
  // 2 for 1, 5 for 2, 9 for 3
  if (tradedCount === 2 && receivedCount === 1) return true;
  if (tradedCount === 5 && receivedCount === 2) return true;
  if (tradedCount === 9 && receivedCount === 3) return true;
  return false;
}
