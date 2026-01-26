// Validation utilities

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function isValidPlayerName(name: string): boolean {
  return name.length >= 2 && name.length <= 50 && /^[a-zA-Z0-9\s-_,]+$/.test(name);
}

export function sanitizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validateGameAction(action: any): { valid: boolean; error?: string } {
  if (!action || typeof action !== 'object') {
    return { valid: false, error: 'Invalid action format' };
  }

  if (!['work', 'buy_canvas', 'paint', 'end_turn', 'sell'].includes(action.type)) {
    return { valid: false, error: 'Invalid action type' };
  }

  if (!action.playerId || !isValidUUID(action.playerId)) {
    return { valid: false, error: 'Invalid player ID' };
  }

  return { valid: true };
}

export function isValidCanvasSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < 3;
}

export function isValidColor(color: string): boolean {
  return ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'wild'].includes(color);
}
