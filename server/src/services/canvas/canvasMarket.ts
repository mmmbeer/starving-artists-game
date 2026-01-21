// Canvas market management
import { CanvasDefinition } from '../../models/types';
import { shuffleArray } from '../../utils/helpers';
import * as canvasDb from '../../database/canvasDb';

export async function createCanvasDeck(): Promise<number[]> {
  const allCanvases = await canvasDb.getAllCanvasDefinitions();
  const canvasIds = allCanvases.map(c => c.id);
  return shuffleArray(canvasIds);
}

export function drawCanvasCards(
  deck: number[],
  count: number
): { drawn: number[]; remaining: number[] } {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { drawn, remaining };
}

export async function createInitialMarket(
  deck: number[]
): Promise<{
  market: Array<CanvasDefinition | null>;
  remaining: number[];
}> {
  const { drawn, remaining } = drawCanvasCards(deck, 3);
  const canvases = await canvasDb.getCanvasDefinitions(drawn);
  
  // Fill market slots (some might be null if deck is empty)
  const market: Array<CanvasDefinition | null> = [
    canvases[0] || null,
    canvases[1] || null,
    canvases[2] || null,
  ];
  
  return { market, remaining };
}

export async function refillMarketSlot(
  market: Array<CanvasDefinition | null>,
  slotIndex: number,
  deck: number[]
): Promise<{
  market: Array<CanvasDefinition | null>;
  remaining: number[];
}> {
  if (deck.length === 0) {
    market[slotIndex] = null;
    return { market, remaining: deck };
  }
  
  const { drawn, remaining } = drawCanvasCards(deck, 1);
  const canvas = await canvasDb.getCanvasDefinition(drawn[0]);
  
  market[slotIndex] = canvas;
  return { market, remaining };
}

export function getCanvasCost(slotIndex: number): number {
  // Costs are 1, 2, 3 paint cubes by position
  return slotIndex + 1;
}

export function shiftMarketLeft(
  market: Array<CanvasDefinition | null>
): Array<CanvasDefinition | null> {
  // After purchase, shift remaining cards to the left
  const newMarket: Array<CanvasDefinition | null> = [null, null, null];
  let writeIndex = 0;
  
  for (let i = 0; i < market.length; i++) {
    if (market[i] !== null) {
      newMarket[writeIndex] = market[i];
      writeIndex++;
    }
  }
  
  return newMarket;
}

export async function resetMarket(
  deck: number[]
): Promise<{
  market: Array<CanvasDefinition | null>;
  remaining: number[];
}> {
  // Discard current market and draw 3 new cards
  return createInitialMarket(deck);
}
