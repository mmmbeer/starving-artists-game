import type { CanvasDefinition } from "./types";
import { requestJson } from "./http-client";

export async function getCuratorSession() {
  const { data } = await requestJson<{
    authenticated?: boolean;
    configured?: boolean;
  }>("/api/curator/session", { cache: "no-store" }, "The curator could not be opened.");
  return data ?? {};
}

export async function signInCurator(password: string) {
  await requestJson(
    "/api/curator/session",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    },
    "The password was not accepted.",
  );
}

export async function signOutCurator() {
  await requestJson(
    "/api/curator/session",
    { method: "DELETE" },
    "The curator session could not be closed.",
  );
}

export async function fetchCuratorCanvases() {
  const { data } = await requestJson<{ canvases?: CanvasDefinition[] }>(
    "/api/curator/canvases",
    { cache: "no-store" },
    "The canvas gallery could not load.",
  );
  if (!Array.isArray(data?.canvases)) {
    throw new Error("The canvas gallery returned incomplete data.");
  }
  return data.canvases;
}

export async function updateCuratorCanvas(canvas: CanvasDefinition) {
  const { data } = await requestJson<{ canvas?: CanvasDefinition }>(
    `/api/curator/canvases/${encodeURIComponent(canvas.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(canvas),
    },
    "The canvas could not be saved.",
  );
  if (!data?.canvas) {
    throw new Error("The curator returned an incomplete canvas update.");
  }
  return data.canvas;
}
