// Helper functions
import { v4 as uuidv4 } from 'uuid';
import { PaintCube, PaintColor } from '../models/types';
import { PAINT_COLORS } from './constants';

export function generateId(): string {
  return uuidv4();
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createPaintCube(color: PaintColor): PaintCube {
  return {
    id: generateId(),
    color,
    is_wild: color === 'wild',
  };
}

export function createInitialPaintBag(): PaintCube[] {
  const cubes: PaintCube[] = [];
  
  // Add regular colors (approximately 18 of each based on game rules)
  const regularColors = PAINT_COLORS.filter(c => c !== 'wild');
  for (const color of regularColors) {
    for (let i = 0; i < 18; i++) {
      cubes.push(createPaintCube(color as PaintColor));
    }
  }
  
  // Add wild cubes (approximately 24 based on game rules)
  for (let i = 0; i < 24; i++) {
    cubes.push(createPaintCube('wild'));
  }
  
  return shuffleArray(cubes);
}

export function drawFromBag(bag: PaintCube[], count: number): { drawn: PaintCube[]; remaining: PaintCube[] } {
  const drawn = bag.slice(0, count);
  const remaining = bag.slice(count);
  return { drawn, remaining };
}

export function calculateTurnOrder(playerCount: number): number[] {
  const order = Array.from({ length: playerCount }, (_, i) => i);
  return shuffleArray(order);
}

export function getNextPlayer(currentTurnOrder: number, totalPlayers: number): number {
  return (currentTurnOrder + 1) % totalPlayers;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
