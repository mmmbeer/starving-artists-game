"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type React from "react";
import type {
  CanvasDefinition,
  CanvasSquare,
  PaintColor,
} from "../../lib/types";
import {
  fetchCuratorCanvases,
  getCuratorSession,
  signInCurator,
  signOutCurator,
  updateCuratorCanvas,
} from "../../lib/curator-api";
import { errorMessage, HttpError } from "../../lib/http-client";
import { useConfirmation } from "../ui/useConfirmation";
import {
  cloneCanvas,
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
  nextSquareId,
  REQUIREMENT_COLORS,
  type LoadState,
  type PlacementMode,
  type SaveState,
} from "./curator-utils";

export function useCuratorController() {
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
  const confirmation = useConfirmation();

  const loadCanvases = useCallback(async () => {
    setLoadState("loading");
    try {
      const nextCanvases = await fetchCuratorCanvases();
      setCanvases(nextCanvases);
      const selected = nextCanvases[0] ?? null;
      setSelectedId(selected?.id ?? null);
      setDraft(selected ? cloneCanvas(selected) : null);
      setSelectedSquareId(null);
      setCanvasZoom(1);
      setDirty(false);
      setSaveState("idle");
      setLoadState("ready");
    } catch (reason) {
      setMessage(errorMessage(reason, "The canvas gallery could not load."));
      setLoadState("signed-out");
    }
  }, []);

  useEffect(() => {
    getCuratorSession()
      .then((session) => {
        if (session.authenticated) return loadCanvases();
        setLoadState("signed-out");
      })
      .catch((reason) => {
        setMessage(errorMessage(reason, "The curator could not be opened."));
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

  async function selectCanvas(id: string) {
    if (id === selectedId) return;
    if (
      dirty &&
      !(await confirmation.confirm({
        title: "Discard unsaved changes?",
        message: "The changes to this canvas have not been saved.",
        confirmLabel: "Discard changes",
      }))
    ) {
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
    try {
      await signInCurator(password);
      setPassword("");
      await loadCanvases();
    } catch (reason) {
      setMessage(errorMessage(reason, "The password was not accepted."));
    }
  }

  async function signOut() {
    if (
      dirty &&
      !(await confirmation.confirm({
        title: "Sign out without saving?",
        message: "The changes to this canvas have not been saved.",
        confirmLabel: "Discard and sign out",
      }))
    ) {
      return;
    }
    try {
      await signOutCurator();
      setCanvases([]);
      setDraft(null);
      setSelectedId(null);
      setLoadState("signed-out");
    } catch (reason) {
      setMessage(errorMessage(reason, "The curator session could not be closed."));
    }
  }

  async function save() {
    if (!draft || saveState === "saving") return;
    setSaveState("saving");
    setMessage("");
    try {
      const canvas = await updateCuratorCanvas(draft);
      setCanvases((current) =>
        current.map((entry) => (entry.id === canvas.id ? canvas : entry)),
      );
      setDraft(cloneCanvas(canvas));
      setDirty(false);
      setSaveState("saved");
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 401) {
        setLoadState("signed-out");
      }
      setMessage(errorMessage(reason, "The canvas could not be saved."));
      setSaveState("error");
    }
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

  return {
    loadState, canvases, selectedId, draft, confirmation,
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
    search, setSearch, password, setPassword, message, dirty, saveState,
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
  };
}
