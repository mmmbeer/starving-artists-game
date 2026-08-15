"use client";
import type { GameAction } from "../../lib/types";
import { PlayerIcon } from "./player-ui";
import type { GameBoardController } from "./useGameBoardController";

export function ActionDock({
  board, busy, onAction,
}: {
  board: GameBoardController;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const {
    game, myTurn, panel, setPanel, completeCanvases, pendingPaint, setPendingPaint,
    setSelectedCube, setBuySlot, setSelectedStudioCubes, setSelectedMarketCubes,
    canTradeMarket, hasUsedDailyTrade,
  } = board;
  return (
      <footer className="action-dock">
        {game.phase === "ENDED" ? (
          <div className="winner-banner">
            <span>★</span>
            <strong className="winner-identities">
              {game.winnerIds.map((id) => {
                const winner = game.players.find((player) => player.id === id);
                return winner ? (
                  <span key={winner.id}>
                    <PlayerIcon
                      name={winner.displayName}
                      avatar={winner.avatar}
                    />
                    {winner.displayName}
                  </span>
                ) : null;
              })}
              <em>
                {game.winnerIds.length > 1
                  ? "share the exhibition"
                  : "wins the exhibition"}
              </em>
            </strong>
          </div>
        ) : game.phase === "SELLING" && myTurn ? (
          <div className="action-buttons selling-action">
            <button
              disabled={busy}
              onClick={() =>
                game.selling?.stage === "DECLARATIONS" &&
                completeCanvases.length === 0
                  ? onAction({
                      type: "DECLARE_SALES",
                      canvasInstanceIds: [],
                    })
                  : setPanel(
                      game.selling?.stage === "COLLECTION"
                        ? "collect"
                        : "sale",
                    )
              }
              title={
                game.selling?.stage === "DECLARATIONS" &&
                completeCanvases.length === 0
                  ? "You have no completed canvases to sell."
                  : undefined
              }
              aria-label={
                game.selling?.stage === "DECLARATIONS" &&
                completeCanvases.length === 0
                  ? "Go to sleep. You have no completed canvases to sell."
                  : undefined
              }
            >
              <b>
                {game.selling?.stage === "COLLECTION"
                  ? "↓"
                  : completeCanvases.length === 0
                    ? "☾"
                    : "★"}
              </b>
              {game.selling?.stage === "COLLECTION"
                ? "Collect"
                : completeCanvases.length === 0
                  ? "Go to sleep"
                  : "Sell"}
            </button>
          </div>
        ) : (
          <div
            className={`action-buttons${
              pendingPaint.length ? " has-pending-paint" : ""
            }`}
          >
            <button
              disabled={!myTurn || busy}
              onClick={() => onAction({ type: "WORK" })}
            >
              <b>+3</b>
              Work
            </button>
            <button
              className={panel === "buy" ? "active" : ""}
              disabled={!myTurn || busy}
              onClick={() => {
                setPanel("buy");
                setBuySlot(null);
                setSelectedStudioCubes([]);
                setPendingPaint([]);
              }}
            >
              <b>◫</b>
              Buy
            </button>
            <button
              className={`${panel === "trade" ? "active " : ""}free-trade-action`}
              disabled={
                busy || !canTradeMarket || game.paintMarket.length === 0
              }
              onClick={() => {
                setPanel("trade");
                setSelectedStudioCubes([]);
                setSelectedMarketCubes([]);
                setPendingPaint([]);
              }}
              title={
                hasUsedDailyTrade
                  ? "You have already used today's free trade."
                  : "One free Paint Market trade per day."
              }
            >
              <b>{hasUsedDailyTrade ? "✓" : "⇄"}</b>
              Trade
              <span>{hasUsedDailyTrade ? "Used today" : "Free · 1/day"}</span>
            </button>
            <button
              disabled={!myTurn || busy}
              onClick={() => onAction({ type: "PASS" })}
            >
              <b>→</b>
              Pass
            </button>
            {pendingPaint.length > 0 && (
              <>
                <button
                  className="undo-paint-action"
                  disabled={!myTurn || busy}
                  onClick={() => {
                    setPendingPaint(pendingPaint.slice(0, -1));
                    setSelectedCube(null);
                  }}
                >
                  <b>↶</b>
                  Undo
                </button>
                <button
                  className={panel === "paint" ? "active paint-action" : "paint-action"}
                  disabled={!myTurn || busy}
                  onClick={() => setPanel("paint")}
                >
                  <b>{pendingPaint.length}</b>
                  Paint
                </button>
              </>
            )}
          </div>
        )}
      </footer>

  );
}

