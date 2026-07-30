"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import {
  PAINT_COLORS,
  type CanvasDefinition,
  type CanvasSquare,
  type PaintColor,
} from "../lib/types";

const REQUIREMENT_COLORS = PAINT_COLORS.filter(
  (color): color is Exclude<PaintColor, "wild"> => color !== "wild",
);

type LoadState = "checking" | "signed-out" | "loading" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";
type PlacementMode = "single" | "combo";

const MIN_CANVAS_ZOOM = 0.5;
const MAX_CANVAS_ZOOM = 2;
const CANVAS_ZOOM_STEP = 0.25;

function cloneCanvas(canvas: CanvasDefinition): CanvasDefinition {
  return structuredClone(canvas);
}

function nextSquareId(squares: CanvasSquare[]): string {
  let number = squares.length + 1;
  const used = new Set(squares.map((square) => square.id));
  while (used.has(`square-${number}`)) number += 1;
  return `square-${number}`;
}

function paintStyle(colors: PaintColor[]): CSSProperties {
  const values = colors.map((color) => `var(--cube-${color})`);
  const background =
    values.length > 1
      ? `linear-gradient(135deg, ${values[0]} 0 48%, white 49% 51%, ${values[1]} 52% 100%)`
      : values[0] ?? "var(--cube-wild)";
  return { background };
}

function readError(response: Response, fallback: string): Promise<string> {
  return response
    .json()
    .then((value) => {
      const body = value as { error?: unknown };
      return typeof body.error === "string" && body.error
        ? body.error
        : fallback;
    })
    .catch(() => fallback);
}

export default function CuratorApp() {
  const [loadState, setLoadState] = useState<LoadState>("checking");
  const [canvases, setCanvases] = useState<CanvasDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CanvasDefinition | null>(null);
  const [selectedSquareId, setSelectedSquareId] = useState<string | null>(null);
  const [placementMode, setPlacementMode] = useState<PlacementMode>("single");
  const [singleColor, setSingleColor] = useState<PaintColor>("red");
  const [comboColors, setComboColors] = useState<[PaintColor, PaintColor]>([
    "red",
    "blue",
  ]);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [fittedCanvasSize, setFittedCanvasSize] = useState({
    width: 560,
    height: 560,
  });
  const [search, setSearch] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [draggingSquareId, setDraggingSquareId] = useState<string | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null);
  const draggingSquareRef = useRef<string | null>(null);

  const loadCanvases = useCallback(async () => {
    setLoadState("loading");
    const response = await fetch("/api/curator/canvases", {
      cache: "no-store",
    });
    if (response.status === 401) {
      setLoadState("signed-out");
      return;
    }
    if (!response.ok) {
      setMessage(await readError(response, "The canvas gallery could not load."));
      setLoadState("signed-out");
      return;
    }
    const body = (await response.json()) as { canvases: CanvasDefinition[] };
    setCanvases(body.canvases);
    const selected = body.canvases[0] ?? null;
    setSelectedId(selected?.id ?? null);
    setDraft(selected ? cloneCanvas(selected) : null);
    setSelectedSquareId(null);
    setCanvasZoom(1);
    setDirty(false);
    setSaveState("idle");
    setLoadState("ready");
  }, []);

  useEffect(() => {
    fetch("/api/curator/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((value) => {
        const body = value as { authenticated?: boolean };
        if (body.authenticated) return loadCanvases();
        setLoadState("signed-out");
      })
      .catch(() => {
        setMessage("The curator could not be opened.");
        setLoadState("signed-out");
      });
  }, [loadCanvases]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const filteredCanvases = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return canvases;
    return canvases.filter((canvas) =>
      `${canvas.title} ${canvas.artist} ${canvas.year}`.toLowerCase().includes(query),
    );
  }, [canvases, search]);

  const selectedSquare =
    draft?.squares.find((square) => square.id === selectedSquareId) ?? null;

  const requirementCounts = useMemo(() => {
    const counts = Object.fromEntries(
      REQUIREMENT_COLORS.map((color) => [color, 0]),
    ) as Record<string, number>;
    for (const square of draft?.squares ?? []) {
      if (square.allowedColors.length === 1) {
        counts[square.allowedColors[0]] += 1;
      }
    }
    return counts;
  }, [draft]);

  const comboCount = useMemo(
    () =>
      (draft?.squares ?? []).filter((square) => square.allowedColors.length > 1)
        .length,
    [draft],
  );

  const activePlacementColors =
    placementMode === "combo" ? comboColors : [singleColor];

  const draftAspectRatio = draft?.aspectRatio;

  useEffect(() => {
    const stage = canvasStageRef.current;
    if (!stage || !draftAspectRatio) return;

    const fitCanvas = () => {
      const rect = stage.getBoundingClientRect();
      const availableWidth = Math.max(180, rect.width - 32);
      const availableHeight = Math.max(240, rect.height - 32);
      const width = Math.min(
        availableWidth,
        availableHeight * draftAspectRatio,
      );
      setFittedCanvasSize({
        width,
        height: width / draftAspectRatio,
      });
    };

    fitCanvas();
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [draftAspectRatio, selectedId]);

  function updateDraft(mutator: (canvas: CanvasDefinition) => CanvasDefinition) {
    setDraft((current) => (current ? mutator(current) : current));
    setDirty(true);
    setSaveState("idle");
  }

  function updateField(
    field: "title" | "artist" | "year" | "starValue" | "foodValue" | "paintValue",
    value: string,
  ) {
    updateDraft((current) => ({
      ...current,
      [field]:
        field === "title" || field === "artist" || field === "year"
          ? value
          : Number(value),
    }));
  }

  function selectCanvas(id: string) {
    if (id === selectedId) return;
    if (dirty && !window.confirm("Discard the unsaved changes to this canvas?")) {
      return;
    }
    const selected = canvases.find((canvas) => canvas.id === id);
    if (!selected) return;
    setSelectedId(id);
    setDraft(cloneCanvas(selected));
    setSelectedSquareId(null);
    setCanvasZoom(1);
    setDirty(false);
    setSaveState("idle");
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/curator/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setMessage(await readError(response, "The password was not accepted."));
      return;
    }
    setPassword("");
    await loadCanvases();
  }

  async function signOut() {
    if (dirty && !window.confirm("Sign out and discard unsaved changes?")) return;
    await fetch("/api/curator/session", { method: "DELETE" });
    setCanvases([]);
    setDraft(null);
    setSelectedId(null);
    setLoadState("signed-out");
  }

  async function save() {
    if (!draft || saveState === "saving") return;
    setSaveState("saving");
    setMessage("");
    const response = await fetch(
      `/api/curator/canvases/${encodeURIComponent(draft.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
    );
    if (response.status === 401) {
      setLoadState("signed-out");
      setSaveState("error");
      return;
    }
    if (!response.ok) {
      setMessage(await readError(response, "The canvas could not be saved."));
      setSaveState("error");
      return;
    }
    const body = (await response.json()) as { canvas: CanvasDefinition };
    setCanvases((current) =>
      current.map((canvas) => (canvas.id === body.canvas.id ? body.canvas : canvas)),
    );
    setDraft(cloneCanvas(body.canvas));
    setDirty(false);
    setSaveState("saved");
  }

  function coordinates(clientX: number, clientY: number) {
    const rect = canvasSurfaceRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(0.98, Math.max(0.02, (clientX - rect.left) / rect.width)),
      y: Math.min(0.98, Math.max(0.02, (clientY - rect.top) / rect.height)),
    };
  }

  function addRequirement(colors: PaintColor[], x: number, y: number) {
    if (!draft || draft.squares.length >= 32) return;
    const allowedColors = [...new Set(colors)].slice(0, 2);
    if (allowedColors.length < 1) return;
    const square: CanvasSquare = {
      id: nextSquareId(draft.squares),
      x,
      y,
      allowedColors,
      shape: allowedColors.length > 1 ? "diamond" : "square",
    };
    updateDraft((current) => ({
      ...current,
      squares: [...current.squares, square],
    }));
    setSelectedSquareId(square.id);
  }

  function moveRequirement(squareId: string, x: number, y: number) {
    updateDraft((current) => ({
      ...current,
      squares: current.squares.map((square) =>
        square.id === squareId ? { ...square, x, y } : square,
      ),
    }));
  }

  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const point = coordinates(event.clientX, event.clientY);
    if (!point) return;
    const squareId = event.dataTransfer.getData("application/x-square-id");
    const encodedColors = event.dataTransfer.getData(
      "application/x-paint-colors",
    );
    const color = event.dataTransfer.getData(
      "application/x-paint-color",
    ) as PaintColor;
    if (squareId) moveRequirement(squareId, point.x, point.y);
    else if (encodedColors) {
      try {
        const colors = JSON.parse(encodedColors) as PaintColor[];
        if (
          colors.length > 0 &&
          colors.length <= 2 &&
          colors.every((entry) =>
            (REQUIREMENT_COLORS as readonly string[]).includes(entry),
          )
        ) {
          addRequirement(colors, point.x, point.y);
        }
      } catch {
        // Ignore malformed drag data from outside the curator.
      }
    }
    else if ((REQUIREMENT_COLORS as readonly string[]).includes(color)) {
      addRequirement([color], point.x, point.y);
    }
    setDraggingSquareId(null);
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".curator-marker")) return;
    const point = coordinates(event.clientX, event.clientY);
    if (point) addRequirement(activePlacementColors, point.x, point.y);
  }

  function beginPointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
    squareId: string,
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingSquareRef.current = squareId;
    setDraggingSquareId(squareId);
    setSelectedSquareId(squareId);
  }

  function continuePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const squareId = draggingSquareRef.current;
    if (!squareId || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    event.preventDefault();
    const point = coordinates(event.clientX, event.clientY);
    if (point) moveRequirement(squareId, point.x, point.y);
  }

  function finishPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingSquareRef.current = null;
    setDraggingSquareId(null);
  }

  function updateComboColor(index: 0 | 1, color: PaintColor) {
    setComboColors((current) => {
      const next = [...current] as [PaintColor, PaintColor];
      next[index] = color;
      if (next[0] === next[1]) {
        next[index === 0 ? 1 : 0] =
          REQUIREMENT_COLORS.find((entry) => entry !== color) ?? "red";
      }
      return next;
    });
  }

  function changeZoom(nextZoom: number) {
    setCanvasZoom(
      Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, nextZoom)),
    );
  }

  function toggleSelectedColor(color: PaintColor) {
    if (!selectedSquare) return;
    const hasColor = selectedSquare.allowedColors.includes(color);
    let colors = hasColor
      ? selectedSquare.allowedColors.filter((entry) => entry !== color)
      : [...selectedSquare.allowedColors, color];
    if (colors.length < 1) colors = [color];
    colors = colors.slice(-2);
    updateDraft((current) => ({
      ...current,
      squares: current.squares.map((square) =>
        square.id === selectedSquare.id
          ? {
              ...square,
              allowedColors: colors,
              shape: colors.length > 1 ? "diamond" : "square",
            }
          : square,
      ),
    }));
  }

  function removeSelectedSquare() {
    if (!selectedSquare) return;
    updateDraft((current) => ({
      ...current,
      squares: current.squares.filter((square) => square.id !== selectedSquare.id),
    }));
    setSelectedSquareId(null);
  }

  function updateSelectedPosition(axis: "x" | "y", value: string) {
    if (!selectedSquare) return;
    const percentage = Number(value);
    if (!Number.isFinite(percentage)) return;
    const position = Math.min(0.98, Math.max(0.02, percentage / 100));
    updateDraft((current) => ({
      ...current,
      squares: current.squares.map((square) =>
        square.id === selectedSquare.id
          ? { ...square, [axis]: position }
          : square,
      ),
    }));
  }

  useEffect(() => {
    if (!selectedSquareId) return;
    const deleteSelectedSquare = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [contenteditable='']",
        )
      ) {
        return;
      }
      event.preventDefault();
      setDraft((current) =>
        current
          ? {
              ...current,
              squares: current.squares.filter(
                (square) => square.id !== selectedSquareId,
              ),
            }
          : current,
      );
      setSelectedSquareId(null);
      setDirty(true);
      setSaveState("idle");
    };
    window.addEventListener("keydown", deleteSelectedSquare);
    return () => window.removeEventListener("keydown", deleteSelectedSquare);
  }, [selectedSquareId]);

  if (loadState === "checking" || loadState === "loading") {
    return (
      <main className="curator-login">
        <div className="curator-login-card">
          <span className="curator-spinner" aria-hidden="true" />
          <p>Opening the collection…</p>
        </div>
      </main>
    );
  }

  if (loadState === "signed-out") {
    return (
      <main className="curator-login">
        <form className="curator-login-card" onSubmit={signIn}>
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
          <div>
            <p className="eyebrow">Collection access</p>
            <h1>Enter the archive.</h1>
            <p>Use the administrator password to edit the game’s canvas library.</p>
          </div>
          <label>
            Administrator password
            <input
              autoComplete="current-password"
              autoFocus
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          {message ? <p className="curator-error">{message}</p> : null}
          <button className="primary-button" type="submit">
            Open collection
          </button>
          <Link className="curator-back-link" href="/">
            Return to the game
          </Link>
        </form>
      </main>
    );
  }

  return (
    <main className="curator-shell">
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
