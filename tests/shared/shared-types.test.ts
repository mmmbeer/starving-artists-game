import { GamePhase, PaintColor } from '../../shared/types/game';

describe('shared type surfaces', () => {
  it('exports canonical game phases', () => {
    expect(GamePhase.LOBBY).toBe('LOBBY');
    expect(GamePhase.SELLING).toBe('SELLING');
  });

  it('includes the fixed paint palette', () => {
    const palette: PaintColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'wild'];
    expect(palette).toContain('wild');
  });
});
