"use client";
import type { GameAction } from "../../lib/types";
import { CanvasCard, Cube } from "./cube-ui";
import { Modal } from "../ui/Modal";
import type { GameBoardController } from "./useGameBoardController";

export function MarketActionModals({
  board, busy, onAction,
}: {
  board: GameBoardController;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const {
    panel, myTurn, closePanel, buySlot, selectedStudioCubes,
    setSelectedStudioCubes, selectedMarketCubes, setSelectedMarketCubes,
    setCanvasPreview, game, envelope, me, toggle,
    canTradeMarket, tradeValid,
  } = board;
  return (
    <>
      {panel === "buy" && myTurn && (
        <Modal
          title="Acquire Canvas"
          onClose={closePanel}
          footerRail={
            buySlot !== null ? (
              <>
                <div className="modal-row-heading">
                  <strong>Payment</strong>
                  <span>
                    {selectedStudioCubes.length}/{buySlot + 1}
                  </span>
                </div>
                <div className="cube-rack modal-cube-rack">
                  {me.studioCubes.map((cube) => (
                    <Cube
                      key={cube.id}
                      cube={cube}
                      selected={selectedStudioCubes.includes(cube.id)}
                      onClick={() =>
                        toggle(
                          cube.id,
                          selectedStudioCubes,
                          setSelectedStudioCubes,
                          buySlot + 1,
                        )
                      }
                    />
                  ))}
                </div>
              </>
            ) : undefined
          }
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={
                  busy ||
                  buySlot === null ||
                  selectedStudioCubes.length !== buySlot + 1
                }
                onClick={() => {
                  if (buySlot !== null) {
                    onAction({
                      type: "BUY_CANVAS",
                      slotIndex: buySlot,
                      paymentCubeIds: selectedStudioCubes,
                    });
                  }
                }}
              >
                Acquire
              </button>
            </>
          }
        >
          <div className="modal-canvas-grid">
            {game.canvasMarket.map((definitionId, index) => {
              const definition = envelope.canvases[definitionId];
              if (!definition) return null;
              return (
                <CanvasCard
                  key={definitionId}
                  definition={definition}
                  cost={index + 1}
                  compact
                  selected={buySlot === index}
                  onClick={() =>
                    setCanvasPreview({
                      definitionId,
                      action: { kind: "buy", slotIndex: index },
                    })
                  }
                />
              );
            })}
          </div>
        </Modal>
      )}

      {panel === "trade" && canTradeMarket && (
        <Modal
          title="Trade Paint"
          onClose={closePanel}
          footerRail={
            <>
              <div className="modal-row-heading">
                <strong>Give</strong>
                <span>{selectedStudioCubes.length}</span>
              </div>
              <div className="cube-rack modal-cube-rack">
                {me.studioCubes.map((cube) => (
                  <Cube
                    key={cube.id}
                    cube={cube}
                    selected={selectedStudioCubes.includes(cube.id)}
                    onClick={() =>
                      toggle(
                        cube.id,
                        selectedStudioCubes,
                        setSelectedStudioCubes,
                        9,
                      )
                    }
                  />
                ))}
              </div>
              <div className="trade-rate">2:1 · 5:2 · 9:3</div>
            </>
          }
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={busy || !tradeValid}
                onClick={() =>
                  onAction({
                    type: "TRADE_MARKET",
                    giveCubeIds: selectedStudioCubes,
                    takeCubeIds: selectedMarketCubes,
                  })
                }
              >
                Make free trade
              </button>
            </>
          }
        >
          <div className="trade-grid">
            <section>
              <div className="modal-row-heading">
                <strong>Take</strong>
                <span>{selectedMarketCubes.length}</span>
              </div>
              <div className="cube-rack modal-cube-rack">
                {game.paintMarket.map((cube) => (
                  <Cube
                    key={cube.id}
                    cube={cube}
                    selected={selectedMarketCubes.includes(cube.id)}
                    onClick={() =>
                      toggle(
                        cube.id,
                        selectedMarketCubes,
                        setSelectedMarketCubes,
                        3,
                      )
                    }
                  />
                ))}
              </div>
            </section>
          </div>
        </Modal>
      )}


    </>
  );
}

