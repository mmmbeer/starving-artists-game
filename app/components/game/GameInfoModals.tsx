"use client";
import { CanvasCubeReference } from "./cube-ui";
import { Modal } from "../ui/Modal";
import { PlayerIcon } from "./player-ui";
import { StudioCanvas } from "./StudioCanvas";
import type { GameBoardController } from "./useGameBoardController";

export function GameInfoModals({ board }: { board: GameBoardController }) {
  const {
    canvasPreview, previewDefinition, setCanvasPreview, setPanel, setBuySlot,
    setSelectedStudioCubes, setPendingPaint, saleSelection, setSaleSelection,
    studioPeekPlayer, setStudioPeekPlayerId, studioPeekCanvasId,
    setStudioPeekCanvasId, envelope, showNutritionWarning,
    setDismissedNutritionWarningDay, game, me,
  } = board;
  return (
    <>
      {canvasPreview && previewDefinition && (
        <Modal
          title={previewDefinition.title}
          onClose={() => setCanvasPreview(null)}
          footerRail={
            <CanvasCubeReference definition={previewDefinition} />
          }
          footer={
            <>
              <button
                className="secondary-button"
                onClick={() => setCanvasPreview(null)}
              >
                Close
              </button>
              {canvasPreview.action && (
                <button
                  className="primary-button"
                  onClick={() => {
                    if (canvasPreview.action?.kind === "buy") {
                      setPanel("buy");
                      setBuySlot(canvasPreview.action.slotIndex);
                      setSelectedStudioCubes([]);
                      setPendingPaint([]);
                    } else if (canvasPreview.action?.kind === "sale") {
                      const canvasInstanceId =
                        canvasPreview.action.canvasInstanceId;
                      setSaleSelection((current) =>
                        current.includes(canvasInstanceId)
                          ? current.filter(
                              (entry) => entry !== canvasInstanceId,
                            )
                          : [...current, canvasInstanceId],
                      );
                    }
                    setCanvasPreview(null);
                  }}
                >
                  {canvasPreview.action.kind === "buy"
                    ? "Select Canvas"
                    : saleSelection.includes(
                          canvasPreview.action.canvasInstanceId,
                        )
                      ? "Remove"
                      : "Select to Sell"}
                </button>
              )}
            </>
          }
        >
          <div className="canvas-zoom">
            <img
              src={previewDefinition.image}
              alt={`${previewDefinition.title} by ${previewDefinition.artist}`}
            />
          </div>
          <div className="canvas-zoom-caption">
            <strong>{previewDefinition.artist}</strong>
            {previewDefinition.year && <span>{previewDefinition.year}</span>}
          </div>
        </Modal>
      )}

      {studioPeekPlayer && (
        <Modal
          title={`${studioPeekPlayer.displayName}'s Studio`}
          onClose={() => {
            setStudioPeekPlayerId(null);
            setStudioPeekCanvasId(null);
          }}
          footer={
            <button
              className="primary-button"
              onClick={() => {
                setStudioPeekPlayerId(null);
                setStudioPeekCanvasId(null);
              }}
            >
              Close
            </button>
          }
        >
          <div className="studio-peek-summary">
            <PlayerIcon
              name={studioPeekPlayer.displayName}
              avatar={studioPeekPlayer.avatar}
            />
            <span>
              <strong>{studioPeekPlayer.canvases.length}</strong>
              <small>
                canvas{studioPeekPlayer.canvases.length === 1 ? "" : "es"} in
                studio
              </small>
            </span>
          </div>
          {studioPeekPlayer.canvases.length ? (
            <div className="studio-peek-canvases">
              {studioPeekPlayer.canvases.map((owned) => {
                const definition = envelope.canvases[owned.definitionId];
                if (!definition) return null;
                return (
                  <StudioCanvas
                    key={owned.instanceId}
                    owned={owned}
                    definition={definition}
                    active={studioPeekCanvasId === owned.instanceId}
                    pending={[]}
                    selectedCubeId={null}
                    cubes={[]}
                    onSelect={() =>
                      setStudioPeekCanvasId((current) =>
                        current === owned.instanceId ? null : owned.instanceId,
                      )
                    }
                    onPreview={() => {
                      setStudioPeekPlayerId(null);
                      setStudioPeekCanvasId(null);
                      setCanvasPreview({ definitionId: definition.id });
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="modal-empty">No canvases in this studio</div>
          )}
        </Modal>
      )}

      {showNutritionWarning && (
        <Modal
          title="Nutrition Warning"
          onClose={() => setDismissedNutritionWarningDay(game.day)}
          footer={
            <button
              className="primary-button"
              onClick={() => setDismissedNutritionWarningDay(game.day)}
            >
              Continue
            </button>
          }
        >
          <div className="nutrition-warning">
            <PlayerIcon
              name={me.displayName}
              avatar={me.avatar}
              className="nutrition-warning-icon"
            />
            <div>
              <strong>One nutrition remains.</strong>
              <span>
                Sell a completed canvas tonight. If nutrition falls again at
                the start of the next day, you starve.
              </span>
            </div>
          </div>
        </Modal>
      )}


    </>
  );
}

