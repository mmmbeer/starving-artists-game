"use client";
import { CanvasCard, Cube } from "./cube-ui";
import { PlayerIcon } from "./player-ui";
import { StudioCanvas } from "./StudioCanvas";
import type { GameBoardController } from "./useGameBoardController";

export function GameWorkspace({ board }: { board: GameBoardController }) {
  const {
    game, envelope, me, myTurn, panel, activeOwned, availableCubes,
    collectionLimit, canTradeMarket, buySlot, selectedMarketCubes, setSelectedMarketCubes,
    selectedCanvas, setSelectedCanvas, selectedCube, setSelectedCube,
    selectedStudioCubes, pendingPaint, setPendingPaint, setCanvasPreview,
    toggle, placeCube,
  } = board;
  return (
      <div className="game-grid">
        <section className="shared-board">
          <div className="section-heading">
            <h2>Canvas Market</h2>
          </div>
          <div className="canvas-market">
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
                      action:
                        myTurn &&
                        (game.phase === "MORNING" ||
                          game.phase === "AFTERNOON")
                          ? { kind: "buy", slotIndex: index }
                          : undefined,
                    })
                  }
                />
              );
            })}
          </div>

          <div className="paint-market-section">
            <div className="section-heading small">
              <h2>Paint Market</h2>
            </div>
            <div className="cube-rack market-rack">
              {game.paintMarket.length ? (
                game.paintMarket.map((cube) => (
                  <Cube
                    cube={cube}
                    key={cube.id}
                    selected={selectedMarketCubes.includes(cube.id)}
                    disabled={
                      (!myTurn && !(panel === "trade" && canTradeMarket)) ||
                      (panel !== "trade" &&
                        game.selling?.stage !== "COLLECTION")
                    }
                    onClick={() =>
                      toggle(
                        cube.id,
                        selectedMarketCubes,
                        setSelectedMarketCubes,
                        game.selling?.stage === "COLLECTION"
                          ? collectionLimit
                          : 3,
                      )
                    }
                  />
                ))
              ) : (
                <p className="empty-state">The market is empty.</p>
              )}
            </div>
          </div>
        </section>

        <section className="my-studio">
          <div className="section-heading">
            <div className="studio-owner">
              <PlayerIcon name={me.displayName} avatar={me.avatar} />
              <h2>{me.displayName}&apos;s Studio</h2>
            </div>
          </div>

          <div className="cube-rack studio-rack">
            {availableCubes.length ? (
              availableCubes.map((cube) => (
                <Cube
                  cube={cube}
                  key={cube.id}
                  draggable={
                    myTurn &&
                    Boolean(activeOwned) &&
                    (game.phase === "MORNING" ||
                      game.phase === "AFTERNOON")
                  }
                  onPointerDrop={(canvasInstanceId, squareId, cubeId) => {
                    placeCube(canvasInstanceId, squareId, cubeId);
                  }}
                  selected={
                    selectedCube === cube.id ||
                    selectedStudioCubes.includes(cube.id)
                  }
                  disabled={!myTurn}
                  onClick={() => {
                    if (activeOwned) {
                      setSelectedCube(
                        selectedCube === cube.id ? null : cube.id,
                      );
                    }
                  }}
                />
              ))
            ) : (
              <p className="empty-state">No loose paint cubes.</p>
            )}
          </div>

          <div className="studio-canvases">
            {me.canvases.length ? (
              me.canvases.map((owned) => {
                const definition = envelope.canvases[owned.definitionId];
                if (!definition) return null;
                return (
                  <StudioCanvas
                    key={owned.instanceId}
                    owned={owned}
                    definition={definition}
                    active={selectedCanvas === owned.instanceId}
                    pending={
                      pendingPaint.filter(
                        (placement) =>
                          placement.canvasInstanceId === owned.instanceId,
                      )
                    }
                    selectedCubeId={selectedCube}
                    cubes={me.studioCubes}
                    onSelect={() => {
                      setSelectedCanvas(
                        selectedCanvas === owned.instanceId
                          ? null
                          : owned.instanceId,
                      );
                      setSelectedCube(null);
                    }}
                    onPreview={() =>
                      setCanvasPreview({ definitionId: definition.id })
                    }
                    onPlace={
                      myTurn &&
                      (game.phase === "MORNING" ||
                        game.phase === "AFTERNOON")
                        ? (squareId, cubeId) =>
                            placeCube(owned.instanceId, squareId, cubeId)
                        : undefined
                    }
                    onClear={() => {
                      setPendingPaint(
                        pendingPaint.filter(
                          (placement) =>
                            placement.canvasInstanceId !== owned.instanceId,
                        ),
                      );
                      setSelectedCube(null);
                    }}
                  />
                );
              })
            ) : (
              <div className="studio-empty">
                <span>◫</span>
                <h3>No canvases</h3>
              </div>
            )}
          </div>
        </section>
      </div>

  );
}
