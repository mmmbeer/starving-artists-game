"use client";

import Link from "next/link";
import type {
  CanvasDefinition,
  GameAction,
  GameEnvelope,
  PlayerCredential,
} from "../../lib/types";
import { ActionDock } from "./ActionDock";
import { GameInfoModals } from "./GameInfoModals";
import { GameStatusHeader } from "./GameStatusHeader";
import { GameWorkspace } from "./GameWorkspace";
import { MarketActionModals } from "./MarketActionModals";
import { PaintSaleModals } from "./PaintSaleModals";
import { PlayerScoreStrip } from "./PlayerScoreStrip";
import { useGameBoardController } from "./useGameBoardController";

export function GameBoard({
  tutorialCanvases,
  envelope,
  credential,
  busy,
  error,
  connected,
  onAction,
  onAbandon,
}: {
  tutorialCanvases: CanvasDefinition[];
  envelope: GameEnvelope;
  credential: PlayerCredential;
  busy: boolean;
  error: string;
  connected: boolean;
  onAction: (action: GameAction) => void;
  onAbandon: () => void;
}) {
  const me = envelope.game.players.find(
    (player) => player.id === credential.playerId,
  );
  if (!me) {
    return (
      <main className="fatal-state">
        <h1>This player is not seated in the game.</h1>
        <Link href="/">Return home</Link>
      </main>
    );
  }

  return (
    <GameBoardContent
      busy={busy}
      connected={connected}
      credential={credential}
      envelope={envelope}
      error={error}
      me={me}
      onAbandon={onAbandon}
      onAction={onAction}
      tutorialCanvases={tutorialCanvases}
    />
  );
}

function GameBoardContent({
  tutorialCanvases,
  envelope,
  credential,
  me,
  busy,
  error,
  connected,
  onAction,
  onAbandon,
}: Parameters<typeof GameBoard>[0] & {
  me: NonNullable<GameEnvelope["game"]["players"][number]>;
}) {
  const board = useGameBoardController({ envelope, credential, me });
  return (
    <main className="game-page">
      <GameStatusHeader
        board={board}
        busy={busy}
        connected={connected}
        onAbandon={onAbandon}
        tutorialCanvases={tutorialCanvases}
      />
      <PlayerScoreStrip board={board} busy={busy} onAction={onAction} />
      <GameWorkspace board={board} />
      <ActionDock board={board} busy={busy} onAction={onAction} />
      <MarketActionModals board={board} busy={busy} onAction={onAction} />
      <PaintSaleModals board={board} busy={busy} onAction={onAction} />
      <GameInfoModals board={board} />
      {error && <div className="game-error">{error}</div>}
    </main>
  );
}
