import type {
  GameAction,
  GameEnvelope,
  PlayerAvatar,
  PlayerCredential,
} from "./types";
import { HttpError, requestJson } from "./http-client";

type GameSessionResponse = {
  envelope?: GameEnvelope;
  credential?: PlayerCredential;
};

function requireSession(
  body: GameSessionResponse | null,
  fallback: string,
): { envelope: GameEnvelope; credential: PlayerCredential } {
  if (!body?.envelope || !body.credential) {
    throw new Error(fallback);
  }
  return { envelope: body.envelope, credential: body.credential };
}

export async function fetchGame(
  code: string,
  version?: number,
): Promise<GameEnvelope | "unchanged"> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new HttpError("Enter a game code.", 400);
  const query = version === undefined ? "" : `?version=${version}`;
  const { data, status } = await requestJson<GameEnvelope>(
    `/api/games/${normalized}${query}`,
    { cache: "no-store" },
    "Game not found.",
  );
  if (status === 204) return "unchanged";
  if (!data?.game || !data.canvases || !data.serverTime) {
    throw new Error("The studio returned an incomplete game update.");
  }
  return data;
}

export async function createGameSession(input: {
  hostName: string;
  gameName: string;
  avatar: PlayerAvatar;
}) {
  const { data } = await requestJson<GameSessionResponse>(
    "/api/games",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Unable to create the game.",
  );
  return requireSession(data, "The studio returned an incomplete game.");
}

export async function joinGameSession(
  gameCode: string,
  displayName: string,
  avatar: PlayerAvatar,
) {
  const { data } = await requestJson<GameSessionResponse>(
    `/api/games/${gameCode}/join`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, avatar }),
    },
    "Unable to join the game.",
  );
  return requireSession(data, "The studio returned an incomplete game.");
}

export async function submitGameAction(input: {
  gameCode: string;
  credential: PlayerCredential;
  actionId: string;
  expectedVersion: number;
  action: GameAction;
}): Promise<GameEnvelope> {
  const { data } = await requestJson<GameEnvelope>(
    `/api/games/${input.gameCode}/action`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: input.credential.playerId,
        token: input.credential.token,
        actionId: input.actionId,
        expectedVersion: input.expectedVersion,
        action: input.action,
      }),
    },
    "That action could not be completed.",
  );
  if (!data?.game || !data.canvases || !data.serverTime) {
    throw new Error("The studio returned an incomplete action update.");
  }
  return data;
}
