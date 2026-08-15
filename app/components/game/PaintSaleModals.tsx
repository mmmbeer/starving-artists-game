"use client";
import type { GameAction } from "../../lib/types";
import { COLOR_LABELS } from "./config";
import { CanvasCard, Cube, CubeArtwork } from "./cube-ui";
import { Modal } from "../ui/Modal";
import type { GameBoardController } from "./useGameBoardController";

export function PaintSaleModals({
  board, busy, onAction,
}: {
  board: GameBoardController;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const {
    panel, myTurn, pendingPaint, closePanel, me, game, envelope,
    completeCanvases, saleSelection, setCanvasPreview, collectionLimit,
    selectedMarketCubes, setSelectedMarketCubes, toggle,
  } = board;
  return (
    <>
      {panel === "paint" && myTurn && pendingPaint.length > 0 && (
        <Modal
          title="Apply Paint"
          onClose={closePanel}
          footerRail={
            <>
              <div className="modal-row-heading">
                <strong>Placement</strong>
                <span>{pendingPaint.length}</span>
              </div>
              <div className="cube-rack modal-cube-rack placement-rail">
                {pendingPaint.map((placement) => {
                  const cube = me.studioCubes.find(
                    (entry) => entry.id === placement.cubeId,
                  );
                  return cube ? (
                    <Cube key={placement.cubeId} cube={cube} disabled />
                  ) : null;
                })}
              </div>
            </>
          }
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={busy || pendingPaint.length === 0}
                onClick={() =>
                  onAction({
                    type: "PAINT",
                    placements: pendingPaint,
                  })
                }
              >
                {pendingPaint.length < 4
                  ? `Paint ${pendingPaint.length} anyway`
                  : "Paint 4"}
              </button>
            </>
          }
        >
          {pendingPaint.length < 4 && (
            <div className="paint-action-warning" role="alert">
              <strong>Use fewer than four paints?</strong>
              <span>
                This action can place up to four cubes. Any unused placements
                are lost.
              </span>
            </div>
          )}
          <div className="paint-confirm-list">
            {pendingPaint.map((placement) => {
              const owned = me.canvases.find(
                (entry) =>
                  entry.instanceId === placement.canvasInstanceId,
              );
              const definition = owned
                ? envelope.canvases[owned.definitionId]
                : undefined;
              const cube = me.studioCubes.find(
                (entry) => entry.id === placement.cubeId,
              );
              const square = definition?.squares.find(
                (entry) => entry.id === placement.squareId,
              );
              if (!cube || !square || !definition) return null;
              return (
                <div
                  key={`${placement.canvasInstanceId}:${placement.squareId}`}
                >
                  <span className="mini-cube">
                    <CubeArtwork color={cube.color} />
                  </span>
                  <strong>{definition.title}</strong>
                  <span>
                    {COLOR_LABELS[cube.color]} ·{" "}
                    {square.allowedColors
                      .map((color) => COLOR_LABELS[color])
                      .join(" / ")}
                  </span>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {panel === "sale" && myTurn && (
        <Modal
          title="Sell Canvases"
          onClose={closePanel}
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={busy}
                onClick={() =>
                  onAction({
                    type: "DECLARE_SALES",
                    canvasInstanceIds: saleSelection,
                  })
                }
              >
                {saleSelection.length
                  ? `Sell ${saleSelection.length}`
                  : "Sell None"}
              </button>
            </>
          }
        >
          {completeCanvases.length > 0 ? (
            <div className="modal-canvas-grid sale-grid">
              {completeCanvases.map((canvas) => {
                const definition = envelope.canvases[canvas.definitionId];
                if (!definition) return null;
                return (
                  <CanvasCard
                    key={canvas.instanceId}
                    definition={definition}
                    compact
                    selected={saleSelection.includes(canvas.instanceId)}
                    onClick={() =>
                      setCanvasPreview({
                        definitionId: canvas.definitionId,
                        action: {
                          kind: "sale",
                          canvasInstanceId: canvas.instanceId,
                        },
                      })
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="modal-empty">No completed canvases</div>
          )}
        </Modal>
      )}

      {panel === "collect" && myTurn && (
        <Modal
          title={`Collect Paint · ${collectionLimit}`}
          onClose={closePanel}
          footer={
            <>
              <button className="secondary-button" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={
                  busy ||
                  selectedMarketCubes.length < 1 ||
                  selectedMarketCubes.length > collectionLimit
                }
                onClick={() =>
                  onAction({
                    type: "COLLECT_PAINT",
                    cubeIds: selectedMarketCubes,
                  })
                }
              >
                Collect {selectedMarketCubes.length}
              </button>
            </>
          }
        >
          <div className="cube-rack modal-cube-rack collect-rack">
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
                    collectionLimit,
                  )
                }
              />
            ))}
          </div>
        </Modal>
      )}


    </>
  );
}

