// Score tracking and win condition service
import * as playerDb from '../../database/playerDb';
import * as gameDb from '../../database/gameDb';
import { Player } from '../../models/types';
import { WIN_CONDITIONS } from '../../utils/constants';

export async function updatePlayerScore(
  playerId: string,
  pointsToAdd: number
): Promise<number> {
  const player = await playerDb.getPlayer(playerId);
  if (!player) throw new Error('Player not found');
  
  const newScore = player.score + pointsToAdd;
  await playerDb.updatePlayerScore(playerId, newScore);
  
  return newScore;
}

export async function checkWinCondition(
  gameId: string
): Promise<{ won: boolean; winner: Player | null; reason?: string }> {
  const players = await playerDb.getGamePlayers(gameId);
  const playerCount = players.length;
  
  if (playerCount < 2 || playerCount > 4) {
    return { won: false, winner: null };
  }
  
  const winCondition = WIN_CONDITIONS[playerCount as 2 | 3 | 4];
  
  // Check for painting count win
  for (const player of players) {
    if (player.paintings_completed >= winCondition.paintings) {
      return {
        won: true,
        winner: player,
        reason: `Completed ${winCondition.paintings} paintings`,
      };
    }
  }
  
  // Check for points win
  for (const player of players) {
    if (player.score >= winCondition.points) {
      return {
        won: true,
        winner: player,
        reason: `Reached ${winCondition.points} points`,
      };
    }
  }
  
  return { won: false, winner: null };
}

export async function determineWinnerByStarvation(
  gameId: string
): Promise<Player> {
  const players = await playerDb.getGamePlayers(gameId);
  
  // Sort by score, then paintings, then food earned
  const sorted = [...players].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.paintings_completed !== b.paintings_completed) {
      return b.paintings_completed - a.paintings_completed;
    }
    if (a.food_earned !== b.food_earned) {
      return b.food_earned - a.food_earned;
    }
    // Final tiebreaker: paint cube count (would need to query)
    return 0;
  });
  
  return sorted[0];
}

export async function declareWinner(
  gameId: string,
  winnerId: string
): Promise<void> {
  await gameDb.setGameWinner(gameId, winnerId);
}

export async function getLeaderboard(
  gameId: string
): Promise<Player[]> {
  const players = await playerDb.getGamePlayers(gameId);
  
  return [...players].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.paintings_completed !== b.paintings_completed) {
      return b.paintings_completed - a.paintings_completed;
    }
    return b.food_earned - a.food_earned;
  });
}
