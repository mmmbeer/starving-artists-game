"use client";
import Link from "next/link";
import { useState } from "react";
import type {
  CanvasDefinition,
  GameAction,
  GameEnvelope,
  PlayerCredential,
} from "../../lib/types";
import {
  AbandonGameControl,
  GameHelpControls,
  KickPlayerControl,
} from "./game-controls";
import { PlayerIcon } from "./player-ui";

export function Lobby({
  tutorialCanvases,
  envelope,
  credential,
  busy,
  error,
  onAction,
  onAbandon,
}: {
  tutorialCanvases: CanvasDefinition[];
  envelope: GameEnvelope;
  credential: PlayerCredential;
  busy: boolean;
  error: string;
  onAction: (action: GameAction) => void;
  onAbandon: () => void;
}) {
  const game = envelope.game;
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/game/${game.code}`;
  const isHost = game.hostPlayerId === credential.playerId;

  return (
    <main className="lobby-page">
      <header className="lobby-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Starving Artists</strong>
          </span>
        </Link>
        <div className="lobby-header-actions">
          <GameHelpControls
            emphasizeTutorial
            canvases={tutorialCanvases}
          />
          {isHost && (
            <AbandonGameControl
              gameName={game.name}
              busy={busy}
              onConfirm={onAbandon}
            />
          )}
        </div>
      </header>
      <section className="lobby-shell">
        <div className="lobby-title">
          <h1>{game.name}</h1>
        </div>
        <div className="share-panel">
          <div>
            <span>Game code</span>
            <strong>{game.code}</strong>
          </div>
          <button
            className="secondary-button"
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "Link copied" : "Copy invite link"}
          </button>
        </div>
        <div className="player-seats">
          {[0, 1, 2, 3].map((index) => {
            const player = game.players[index];
            return player ? (
              <article className="player-seat filled" key={player.id}>
                <PlayerIcon
                  name={player.displayName}
                  avatar={player.avatar}
                />
                <div>
                  <strong>{player.displayName}</strong>
                  {player.id === game.hostPlayerId && <span>Host</span>}
                </div>
                <b>✓</b>
                {isHost && player.id !== game.hostPlayerId && (
                  <KickPlayerControl
                    player={player}
                    inLobby
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
            ) : (
              <article className="player-seat" key={index}>
                <i>+</i>
                <div>
                  <strong>Open seat</strong>
                </div>
              </article>
            );
          })}
        </div>
        <div className="lobby-actions">
          {isHost ? (
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => onAction({ type: "START_GAME" })}
            >
              {busy ? "Setting the easels…" : "Start the game"}
            </button>
          ) : (
            <p>
              <span className="spinner" /> Waiting for host
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
      </section>
    </main>
  );
}


