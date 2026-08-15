"use client";
import type { GameAction } from "../../lib/types";
import { KickPlayerControl } from "./game-controls";
import { PlayerIcon } from "./player-ui";
import type { GameBoardController } from "./useGameBoardController";

export function PlayerScoreStrip({
  board, busy, onAction,
}: {
  board: GameBoardController;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const {
    game, credential, currentPlayer, isHost,
    setStudioPeekPlayerId, setStudioPeekCanvasId,
  } = board;
  return (
      <section className="score-strip">
        {game.players.map((player) => (
          <article
            key={player.id}
            className={`${player.id === currentPlayer?.id ? "current" : ""}${
              player.starved ? " starved" : ""
            }`}
          >
            <button
              type="button"
              className="score-player-button"
              onClick={() => {
                setStudioPeekPlayerId(player.id);
                setStudioPeekCanvasId(null);
              }}
              aria-label={`View ${player.displayName}'s studio`}
            >
              <PlayerIcon
                name={player.displayName}
                avatar={player.avatar}
              />
              <div>
                <strong>
                  {player.displayName}
                  {player.id === credential.playerId ? " · You" : ""}
                </strong>
                <span>
                  ★ {player.score} &nbsp; ● {player.nutrition}/5 &nbsp; ◫{" "}
                  {player.soldCanvasCount}
                </span>
              </div>
              {player.id === game.firstPlayerId && (
                <b title="First player">1st</b>
              )}
            </button>
            {isHost && player.id !== game.hostPlayerId && (
              <KickPlayerControl
                player={player}
                inLobby={false}
                busy={busy}
                onConfirm={() =>
                  onAction({
                    type: "KICK_PLAYER",
                    playerId: player.id,
                  })
                }
              />
            )}
          </article>
        ))}
      </section>

  );
}

