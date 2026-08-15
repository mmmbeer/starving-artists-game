"use client";

import Link from "next/link";
import type { PaintColor } from "../lib/types";
import {
  CANVAS_ZOOM_STEP,
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
  paintStyle,
  REQUIREMENT_COLORS,
} from "./curator/curator-utils";
import { CuratorAccess } from "./curator/CuratorAccess";
import { useCuratorController } from "./curator/useCuratorController";
import { ConfirmDialog } from "./ui/ConfirmDialog";

export default function CuratorApp() {
  const {
    loadState,
    confirmation,
    canvases,
    selectedId,
    draft,
    selectedSquareId,
    setSelectedSquareId,
    placementMode,
    setPlacementMode,
    singleColor,
    setSingleColor,
    comboColors,
    canvasZoom,
    setCanvasZoom,
    fittedCanvasSize,
    search,
    setSearch,
    password,
    setPassword,
    message,
    dirty,
    saveState,
    draggingSquareId,
    canvasStageRef,
    canvasSurfaceRef,
    filteredCanvases,
    selectedSquare,
    requirementCounts,
    comboCount,
    selectCanvas,
    signIn,
    signOut,
    save,
    updateComboColor,
    changeZoom,
    toggleSelectedColor,
    removeSelectedSquare,
    updateSelectedPosition,
    handleCanvasDrop,
    handleCanvasClick,
    beginPointerMove,
    continuePointerMove,
    finishPointerMove,
    updateField,
  } = useCuratorController();

  if (loadState !== "ready") {
    return (
      <CuratorAccess
        loadState={loadState}
        message={message}
        onPasswordChange={setPassword}
        onSignIn={signIn}
        password={password}
      />
    );
  }

  return (
    <main className="curator-shell">
      <ConfirmDialog confirmation={confirmation} />
      <header className="curator-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Starving Artists</strong>
            <small>Curator</small>
          </span>
        </Link>
        <div className="curator-header-actions">
          <span>{canvases.length} canvases</span>
          <button className="curator-text-button" onClick={signOut} type="button">
            Sign out
          </button>
        </div>
      </header>

      <div className="curator-workspace">
        <aside className="curator-gallery-panel">
          <div className="curator-panel-heading">
            <div>
              <p className="eyebrow">Canvas library</p>
              <h1>Collection</h1>
            </div>
            <label className="curator-search">
              <span className="sr-only">Search canvases</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title or artist"
                type="search"
                value={search}
              />
            </label>
          </div>
          <div className="curator-gallery" role="list">
            {filteredCanvases.map((canvas) => (
              <button
                aria-current={canvas.id === selectedId ? "true" : undefined}
                className="curator-gallery-card"
                key={canvas.id}
                onClick={() => selectCanvas(canvas.id)}
                role="listitem"
                type="button"
              >
                <span className="curator-gallery-art">
                  <img alt="" loading="lazy" src={canvas.image} />
                </span>
                <span>
                  <strong>{canvas.title}</strong>
                  <small>
                    {canvas.artist}
                    {canvas.year ? ` · ${canvas.year}` : ""}
                  </small>
                </span>
                <em>{canvas.squares.length}</em>
              </button>
            ))}
          </div>
        </aside>

        {draft ? (
          <section className="curator-editor">
            <div className="curator-placement-section">
              <div className="curator-placement-heading">
                <div>
                  <p className="eyebrow">Editing canvas</p>
                  <h3>{draft.title}</h3>
                  <p>{draft.id}</p>
                </div>
                <strong>{draft.squares.length} spaces</strong>
              </div>

              <div className="curator-editor-layout">
                <div className="curator-placement-column">
                  <div className="curator-placement-tools">
                    <div className="curator-placement-tools-heading">
                      <strong>Color spaces</strong>
                      <div
                        className="curator-placement-mode"
                        aria-label="Requirement type"
                        role="group"
                      >
                      <button
                        aria-pressed={placementMode === "single"}
                        onClick={() => setPlacementMode("single")}
                        type="button"
                      >
                        Single
                      </button>
                      <button
                        aria-pressed={placementMode === "combo"}
                        onClick={() => setPlacementMode("combo")}
                        type="button"
                      >
                        Combo
                        <b>{comboCount}</b>
                      </button>
                    </div>
                  </div>

                    {placementMode === "single" ? (
                      <div className="curator-palette" aria-label="Draggable color spaces">
                        {REQUIREMENT_COLORS.map((color) => (
                          <button
                            aria-label={`${color} color space`}
                            aria-pressed={singleColor === color}
                            className="curator-palette-item"
                            draggable
                            key={color}
                            onClick={() => setSingleColor(color)}
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "application/x-paint-color",
                                color,
                              );
                              event.dataTransfer.effectAllowed = "copy";
                            }}
                            style={paintStyle([color])}
                            title={`${color} · ${requirementCounts[color]} placed`}
                            type="button"
                          >
                            <span>{requirementCounts[color]}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="curator-combo-builder">
                        <span
                          aria-label={`${comboColors[0]} or ${comboColors[1]} color space`}
                          className="curator-combo-preview"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              "application/x-paint-colors",
                              JSON.stringify(comboColors),
                            );
                            event.dataTransfer.effectAllowed = "copy";
                          }}
                          role="img"
                          style={paintStyle(comboColors)}
                        />
                        <select
                          aria-label="First combo color"
                          onChange={(event) =>
                            updateComboColor(0, event.target.value as PaintColor)
                          }
                          value={comboColors[0]}
                        >
                          {REQUIREMENT_COLORS.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                        <span className="curator-combo-or">or</span>
                        <select
                          aria-label="Second combo color"
                          onChange={(event) =>
                            updateComboColor(1, event.target.value as PaintColor)
                          }
                          value={comboColors[1]}
                        >
                          {REQUIREMENT_COLORS.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {selectedSquare ? (
                    <div
                      aria-label="Selected color space"
                      className="curator-selection-toolbar"
                      role="toolbar"
                    >
                      <strong>Colors</strong>
                      <div className="curator-color-toggles">
                        {REQUIREMENT_COLORS.map((color) => (
                          <button
                            aria-label={color}
                            aria-pressed={selectedSquare.allowedColors.includes(color)}
                            key={color}
                            onClick={() => toggleSelectedColor(color)}
                            style={paintStyle([color])}
                            type="button"
                          />
                        ))}
                      </div>
                      <label>
                        X
                        <input
                          aria-label="X position percentage"
                          max="98"
                          min="2"
                          onChange={(event) =>
                            updateSelectedPosition("x", event.target.value)
                          }
                          type="number"
                          value={Math.round(selectedSquare.x * 100)}
                        />
                      </label>
                      <label>
                        Y
                        <input
                          aria-label="Y position percentage"
                          max="98"
                          min="2"
                          onChange={(event) =>
                            updateSelectedPosition("y", event.target.value)
                          }
                          type="number"
                          value={Math.round(selectedSquare.y * 100)}
                        />
                      </label>
                      <button
                        aria-label="Delete selected color space"
                        className="curator-toolbar-delete"
                        onClick={removeSelectedSquare}
                        title="Delete selected space (Delete)"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}

                  <div className="curator-canvas-workspace">
                    <div className="curator-zoom-controls">
                      <span>Canvas view</span>
                      <button
                        aria-label="Zoom out"
                        disabled={canvasZoom <= MIN_CANVAS_ZOOM}
                        onClick={() => changeZoom(canvasZoom - CANVAS_ZOOM_STEP)}
                        type="button"
                      >
                        −
                      </button>
                      <button
                        className="curator-zoom-value"
                        onClick={() => setCanvasZoom(1)}
                        title="Fit canvas"
                        type="button"
                      >
                        {Math.round(canvasZoom * 100)}%
                      </button>
                      <button
                        aria-label="Zoom in"
                        disabled={canvasZoom >= MAX_CANVAS_ZOOM}
                        onClick={() => changeZoom(canvasZoom + CANVAS_ZOOM_STEP)}
                        type="button"
                      >
                        +
                      </button>
                      <button
                        className="curator-fit-button"
                        onClick={() => setCanvasZoom(1)}
                        type="button"
                      >
                        Fit
                      </button>
                    </div>
                    <div className="curator-canvas-stage" ref={canvasStageRef}>
                      <div
                        className="curator-canvas-surface"
                        onClick={handleCanvasClick}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = draggingSquareId
                            ? "move"
                            : "copy";
                        }}
                        onDrop={handleCanvasDrop}
                        ref={canvasSurfaceRef}
                        style={{
                          width: fittedCanvasSize.width * canvasZoom,
                          height: fittedCanvasSize.height * canvasZoom,
                        }}
                      >
                        <img alt={draft.title} draggable={false} src={draft.image} />
                        {draft.squares.map((square, index) => (
                          <button
                            aria-label={`Paint requirement ${index + 1}: ${square.allowedColors.join(" or ")}`}
                            aria-pressed={selectedSquareId === square.id}
                            className={`curator-marker ${square.shape}`}
                            key={square.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedSquareId(square.id);
                            }}
                            onPointerCancel={finishPointerMove}
                            onPointerDown={(event) =>
                              beginPointerMove(event, square.id)
                            }
                            onPointerMove={continuePointerMove}
                            onPointerUp={finishPointerMove}
                            style={{
                              ...paintStyle(square.allowedColors),
                              left: `${square.x * 100}%`,
                              top: `${square.y * 100}%`,
                            }}
                            type="button"
                          >
                            <span>{index + 1}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="curator-metadata-column">
                  <aside className="curator-metadata-panel">
                    <div>
                      <p className="eyebrow">Card details</p>
                      <h4>Metadata</h4>
                    </div>
                    <label>
                      Title
                      <input
                        onChange={(event) => updateField("title", event.target.value)}
                        value={draft.title}
                      />
                    </label>
                    <label>
                      Artist
                      <input
                        onChange={(event) => updateField("artist", event.target.value)}
                        value={draft.artist}
                      />
                    </label>
                    <label>
                      Year
                      <input
                        onChange={(event) => updateField("year", event.target.value)}
                        value={draft.year}
                      />
                    </label>
                    <div className="curator-value-fields">
                      <label>
                        Food
                        <input
                          min="0"
                          onChange={(event) =>
                            updateField("foodValue", event.target.value)
                          }
                          type="number"
                          value={draft.foodValue}
                        />
                      </label>
                      <label>
                        Paint
                        <input
                          min="0"
                          onChange={(event) =>
                            updateField("paintValue", event.target.value)
                          }
                          type="number"
                          value={draft.paintValue}
                        />
                      </label>
                      <label>
                        Stars
                        <input
                          min="0"
                          onChange={(event) =>
                            updateField("starValue", event.target.value)
                          }
                          type="number"
                          value={draft.starValue}
                        />
                      </label>
                    </div>
                    <small>{draft.id}</small>
                  </aside>
                  <div className="curator-save-actions">
                    <span aria-live="polite">
                      {saveState === "saved" ? "Saved" : null}
                    </span>
                    {message ? (
                      <span className="curator-error">{message}</span>
                    ) : null}
                    <button
                      className="primary-button"
                      disabled={!dirty || saveState === "saving"}
                      onClick={save}
                      type="button"
                    >
                      {saveState === "saving" ? "Saving…" : "Save canvas"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
