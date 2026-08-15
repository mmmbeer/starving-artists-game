"use client";
import { useState } from "react";
import type { CanvasDefinition, PlayerState } from "../../lib/types";
import { Modal } from "../ui/Modal";
import { PlayerIcon } from "./player-ui";
import { TutorialModal, WrittenRulesModal } from "./tutorial-modals";

export function GameHelpControls({
  compact = false,
  emphasizeTutorial = false,
  canvases,
}: {
  compact?: boolean;
  emphasizeTutorial?: boolean;
  canvases: CanvasDefinition[];
}) {
  const [openHelp, setOpenHelp] = useState<"tutorial" | "rules" | null>(null);

  return (
    <>
      <div className={`game-help-controls${compact ? " compact" : ""}`}>
        <button
          type="button"
          className={emphasizeTutorial ? "tutorial-header-button emphasized" : "tutorial-header-button"}
          onClick={() => setOpenHelp("tutorial")}
        >
          Tutorial
        </button>
        <button
          type="button"
          className="rules-header-button"
          onClick={() => setOpenHelp("rules")}
        >
          Rules
        </button>
        <button
          type="button"
          className="help-icon-button"
          onClick={() => setOpenHelp("rules")}
          aria-label="Open game rules"
          title="Game rules"
        >
          ?
        </button>
      </div>
      {openHelp === "tutorial" && (
        <TutorialModal
          onClose={() => setOpenHelp(null)}
          onOpenRules={() => setOpenHelp("rules")}
          canvases={canvases}
        />
      )}
      {openHelp === "rules" && (
        <WrittenRulesModal
          onClose={() => setOpenHelp(null)}
          onOpenTutorial={() => setOpenHelp("tutorial")}
          canvases={canvases}
        />
      )}
    </>
  );
}

export function AbandonGameControl({
  gameName,
  busy,
  onConfirm,
}: {
  gameName: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        className="abandon-game-button"
        onClick={() => setConfirming(true)}
      >
        Abandon game
      </button>
      {confirming && (
        <Modal
          title="Abandon Game?"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirming(false)}
              >
                Keep game
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? "Abandoning…" : "Abandon game"}
              </button>
            </>
          }
        >
          <div className="abandon-game-warning">
            <strong>{gameName}</strong>
            <span>
              This closes the game for every player. It cannot be resumed.
            </span>
          </div>
        </Modal>
      )}
    </>
  );
}

export function KickPlayerControl({
  player,
  inLobby,
  busy,
  onConfirm,
}: {
  player: PlayerState;
  inLobby: boolean;
  busy: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        className="kick-player-button"
        disabled={busy}
        onClick={() => setConfirming(true)}
        aria-label={`Kick ${player.displayName}`}
        title={`Kick ${player.displayName}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 19c0-2.2-2-4-4.5-4S6 16.8 6 19" />
          <circle cx="10.5" cy="8.5" r="3.2" />
          <path d="m16.5 8 5 5m0-5-5 5" />
        </svg>
      </button>
      {confirming && (
        <Modal
          title={`Kick ${player.displayName}?`}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirming(false)}
              >
                Keep player
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  onConfirm();
                }}
              >
                {busy ? "Removing…" : "Kick player"}
              </button>
            </>
          }
        >
          <div className="kick-player-warning">
            <PlayerIcon
              name={player.displayName}
              avatar={player.avatar}
              className="kick-player-avatar"
            />
            <div>
              <strong>Remove {player.displayName} from this game?</strong>
              <span>
                {inLobby
                  ? "Their seat will open immediately. They can only return by joining again."
                  : "Their studio and turn will be removed. If they are taking their turn, play advances immediately."}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}



