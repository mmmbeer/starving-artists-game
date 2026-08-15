"use client";
import Link from "next/link";
import type { CanvasDefinition } from "../../lib/types";
import { DAY_PHASES } from "./config";
import { AbandonGameControl, GameHelpControls } from "./game-controls";
import { PlayerIcon, TurnWaitOverlay } from "./player-ui";
import type { GameBoardController } from "./useGameBoardController";

export function GameStatusHeader({
  board, tutorialCanvases, busy, connected, onAbandon,
}: {
  board: GameBoardController;
  tutorialCanvases: CanvasDefinition[];
  busy: boolean;
  connected: boolean;
  onAbandon: () => void;
}) {
  const {
    game, me, currentPlayer, myTurn, isHost, dayPhase, dayPhaseIndex,
    phaseActionsRemaining, phaseRemainingLabel, personalActionsRemaining,
    waitingForTurn,
  } = board;
  return (
    <>
      <header className="game-header">
        <Link className="brand brand-small" href="/">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Starving Artists</strong>
            <small>{game.code}</small>
          </span>
        </Link>
        <div className="turn-display">
          <i className={`status-dot ${connected ? "live" : "offline"}`} />
          {currentPlayer && (
            <PlayerIcon
              name={currentPlayer.displayName}
              avatar={currentPlayer.avatar}
              className="turn-avatar"
            />
          )}
          <span>
            {myTurn ? "Your turn" : `${currentPlayer?.displayName ?? "—"} is acting`}
          </span>
        </div>
        <div className="game-header-actions">
          <GameHelpControls compact canvases={tutorialCanvases} />
          {isHost && (
            <AbandonGameControl
              gameName={game.name}
              busy={busy}
              onConfirm={onAbandon}
            />
          )}
          <div
            className={`nutrition-meter${me.nutrition === 1 ? " critical" : ""}`}
            aria-label={`Nutrition ${me.nutrition} of 5`}
            title={`Nutrition ${me.nutrition} of 5`}
          >
            <span>Nutrition</span>
            <div>
              {Array.from({ length: me.nutrition }, (_, index) => (
                <PlayerIcon
                  key={index}
                  name={me.displayName}
                  avatar={me.avatar}
                  className="nutrition-icon"
                />
              ))}
              {me.starved && <strong>Starved</strong>}
            </div>
          </div>
        </div>
      </header>

      <section
        className={`day-status phase-${game.phase.toLowerCase()}${
          waitingForTurn ? " waiting" : ""
        }`}
        aria-label={`Day ${game.day}, ${dayPhase?.label ?? "complete"}`}
      >
        <div className="day-status-title">
          <span>Day {game.day}</span>
          <strong>{dayPhase?.label ?? "Final Gallery"}</strong>
          <small>
            {game.selling?.stage === "COLLECTION"
              ? "Paint collection"
              : dayPhase?.detail ?? "Complete"}
          </small>
        </div>

        <div className="day-phase-track" aria-label="Daily phases">
          {DAY_PHASES.map((entry, index) => {
            const state =
              game.phase === "ENDED" || index < dayPhaseIndex
                ? "complete"
                : index === dayPhaseIndex
                  ? "current"
                  : "upcoming";
            return (
              <span
                className={state}
                key={entry.phase}
                aria-current={state === "current" ? "step" : undefined}
              >
                <i>{index + 1}</i>
                <b>{entry.label}</b>
              </span>
            );
          })}
        </div>

        <div className="day-action-counts">
          <div>
            <strong>{phaseActionsRemaining}</strong>
            <span>{phaseRemainingLabel}</span>
          </div>
          <div>
            <strong>{personalActionsRemaining}</strong>
            <span>your turn actions left today</span>
          </div>
        </div>
        {waitingForTurn && currentPlayer && (
          <TurnWaitOverlay
            player={currentPlayer}
            animationKey={`${game.id}:${game.day}:${game.phase}:${currentPlayer.id}`}
          />
        )}
      </section>

    </>
  );
}

