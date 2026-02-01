// Helper functions
import { v4 as uuidv4 } from 'uuid';
import { PaintCube, PaintColor } from '../models/types';
import { PAINT_CUBE_DISTRIBUTION } from './constants';

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
  
  Object.entries(PAINT_CUBE_DISTRIBUTION).forEach(([color, count]) => {
    for (let i = 0; i < count; i++) {
      cubes.push(createPaintCube(color as PaintColor));
    }
  });
  
  return shuffleArray(cubes);
}

export function drawFromBag(bag: PaintCube[], count: number): { drawn: PaintCube[]; remaining: PaintCube[] } {
  const shuffled = shuffleArray(bag);
  const drawn = shuffled.slice(0, count);
  const remaining = shuffled.slice(count);
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
