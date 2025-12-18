import { GamePhase } from '../types';

export const ACTION_PHASES: GamePhase[] = [GamePhase.MORNING, GamePhase.AFTERNOON];

export const PHASE_SEQUENCE: GamePhase[] = [
  GamePhase.LOBBY,
  GamePhase.MORNING,
  GamePhase.AFTERNOON,
  GamePhase.SELLING,
  GamePhase.ENDED
];

export const isActionPhase = (phase: GamePhase): boolean => ACTION_PHASES.includes(phase);

export const isSellingPhase = (phase: GamePhase): boolean => phase === GamePhase.SELLING;

export const getNextPhase = (current: GamePhase): GamePhase => {
  if (current === GamePhase.SELLING) {
    return GamePhase.MORNING;
  }
  const currentIndex = PHASE_SEQUENCE.indexOf(current);
  if (currentIndex === -1 || currentIndex === PHASE_SEQUENCE.length - 1) {
    return GamePhase.ENDED;
  }
  return PHASE_SEQUENCE[currentIndex + 1];
};
