"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CanvasDefinition,
  GameAction,
  GameEnvelope,
  PlayerAvatar,
  PlayerCredential,
} from "../lib/types";
import { predictGameAction } from "../lib/optimistic-game";
import {
  createGameSession,
  fetchGame,
  joinGameSession,
  submitGameAction,
} from "../lib/game-api";
import {
  errorMessage,
  HttpError,
  isRetryableHttpError,
} from "../lib/http-client";
import {
  credentials,
  randomId,
  type RecentGame,
  removeCredential,
  resolveTutorialCanvases,
  saveCredential,
  TUTORIAL_CANVASES_FALLBACK,
} from "./game/config";
import { GameBoard } from "./game/GameBoard";
import { Landing } from "./game/Landing";
import { Lobby } from "./game/Lobby";

export default function GameApp({
  initialGameCode = "",
  initialTutorialCanvases = TUTORIAL_CANVASES_FALLBACK,
}: {
  initialGameCode?: string;
  initialTutorialCanvases?: CanvasDefinition[];
}) {
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");
  const [envelope, setEnvelope] = useState<GameEnvelope | null>(null);
  const [credential, setCredential] = useState<PlayerCredential | null>(null);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(true);
  const pollInFlight = useRef(false);
  const envelopeRef = useRef<GameEnvelope | null>(null);
  const pendingActionRef = useRef<string | null>(null);
  const tutorialCanvases = useMemo(
    () =>
      resolveTutorialCanvases(
        envelope
          ? Object.values(envelope.canvases)
          : initialTutorialCanvases,
      ),
    [envelope, initialTutorialCanvases],
  );

  const loadGame = fetchGame;

  const loadRecentGames = useCallback(async () => {
    const stored = Object.values(credentials());
    const games = await Promise.all(
      stored.map(async (saved): Promise<RecentGame | null> => {
        try {
          const result = await fetchGame(saved.gameCode);
          if (result === "unchanged") return null;
          const player = result.game.players.find(
            (entry) => entry.id === saved.playerId,
          );
          if (
            !player ||
            (result.game.status !== "LOBBY" &&
              result.game.status !== "ACTIVE")
          ) {
            removeCredential(saved.gameCode);
            return null;
          }
          return {
            code: result.game.code,
            name: result.game.name,
            status: result.game.status,
            day: result.game.day,
            updatedAt: result.game.updatedAt,
            player,
            isHost: result.game.hostPlayerId === saved.playerId,
          };
        } catch (reason) {
          if (reason instanceof HttpError && reason.status === 404) {
            removeCredential(saved.gameCode);
          }
          return null;
        }
      }),
    );
    setRecentGames(
      games
        .filter((game): game is RecentGame => Boolean(game))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    );
  }, []);

  useEffect(() => {
    envelopeRef.current = envelope;
  }, [envelope]);

  useEffect(() => {
    const legacyCode =
      new URLSearchParams(window.location.search).get("game")?.toUpperCase() ??
      "";
    const code = (initialGameCode || legacyCode).trim().toUpperCase();
    if (!code) {
      Promise.resolve().then(() => {
        setGameCode("");
        setEnvelope(null);
        setCredential(null);
        setError("");
      });
      void Promise.resolve().then(loadRecentGames);
      return;
    }
    if (!initialGameCode && legacyCode) {
      router.replace(`/game/${legacyCode}`);
    }
    const stored = credentials()[code] ?? null;
    Promise.resolve().then(() => {
      setGameCode(code);
      setCredential(stored);
    });
    loadGame(code)
      .then((result) => {
        if (!result || result === "unchanged") return;
        if (result.game.status === "ABANDONED") {
          removeCredential(code);
          router.replace("/");
          return;
        }
        setEnvelope(result);
      })
      .catch((reason) => setError(errorMessage(reason, "Game not found.")));
  }, [initialGameCode, loadGame, loadRecentGames, router]);

  useEffect(() => {
    if (envelope?.game.status !== "ABANDONED") return;
    removeCredential(envelope.game.code);
    Promise.resolve().then(() => {
      setGameCode("");
      setEnvelope(null);
      setCredential(null);
    });
    router.replace("/");
    void Promise.resolve().then(loadRecentGames);
  }, [envelope, loadRecentGames, router]);

  useEffect(() => {
    if (!envelopeRef.current || !gameCode || pendingActionId) return;
    let stopped = false;
    let timer: number | null = null;
    let delay = 3_500;

    const schedule = (nextDelay: number) => {
      if (stopped) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(poll, nextDelay);
    };

    const poll = async () => {
      if (stopped || pollInFlight.current || pendingActionRef.current) return;
      if (document.hidden || navigator.onLine === false) {
        schedule(30_000);
        return;
      }
      pollInFlight.current = true;
      try {
        const version = envelopeRef.current?.game.version;
        const result = await loadGame(gameCode, version);
        if (result !== "unchanged" && result) setEnvelope(result);
        delay = 3_500;
        setConnected(true);
      } catch {
        delay = Math.min(30_000, Math.max(7_000, delay * 2));
        setConnected(false);
      } finally {
        pollInFlight.current = false;
        schedule(delay);
      }
    };

    const pollNow = () => {
      if (!document.hidden && navigator.onLine !== false) schedule(0);
    };
    document.addEventListener("visibilitychange", pollNow);
    window.addEventListener("online", pollNow);
    schedule(3_500);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", pollNow);
      window.removeEventListener("online", pollNow);
    };
  }, [gameCode, loadGame, pendingActionId]);

  const setGameUrl = (code: string) => {
    setGameCode(code);
    router.push(`/game/${code}`);
  };

  const create = async (
    hostName: string,
    gameName: string,
    avatar: PlayerAvatar,
  ) => {
    setBusy(true);
    setError("");
    try {
      const session = await createGameSession({ hostName, gameName, avatar });
      saveCredential(session.credential);
      setCredential(session.credential);
      setEnvelope(session.envelope);
      setGameUrl(session.credential.gameCode);
    } catch (reason) {
      setError(errorMessage(reason, "Unable to create game."));
    } finally {
      setBusy(false);
    }
  };

  const find = async (code: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await loadGame(code);
      if (!result || result === "unchanged") return;
      const normalized = code.toUpperCase();
      setEnvelope(result);
      setGameUrl(normalized);
      const stored = credentials()[normalized] ?? null;
      setCredential(stored);
    } catch (reason) {
      setError(errorMessage(reason, "Game not found."));
    } finally {
      setBusy(false);
    }
  };

  const join = async (displayName: string, avatar: PlayerAvatar) => {
    setBusy(true);
    setError("");
    try {
      const session = await joinGameSession(gameCode, displayName, avatar);
      saveCredential(session.credential);
      setCredential(session.credential);
      setEnvelope(session.envelope);
    } catch (reason) {
      setError(errorMessage(reason, "Unable to join game."));
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: GameAction) => {
    if (
      !credential ||
      !envelope ||
      pendingActionRef.current
    ) {
      return false;
    }
    const authoritativeEnvelope = envelope;
    const actionId = randomId();
    pendingActionRef.current = actionId;
    setPendingActionId(actionId);
    setError("");
    const optimisticEnvelope = predictGameAction(
      authoritativeEnvelope,
      credential.playerId,
      action,
    );
    if (optimisticEnvelope !== authoritativeEnvelope) {
      setEnvelope(optimisticEnvelope);
    }

    let retryDelay = 1_500;
    while (pendingActionRef.current === actionId) {
      try {
        const result = await submitGameAction({
          gameCode,
          credential,
          actionId,
          expectedVersion: authoritativeEnvelope.game.version,
          action,
        });
        setEnvelope(result);
        setConnected(true);
        pendingActionRef.current = null;
        setPendingActionId(null);
        return true;
      } catch (reason) {
        if (reason instanceof HttpError && reason.status === 409) {
          const fresh = await loadGame(gameCode).catch(() => null);
          if (fresh && fresh !== "unchanged") setEnvelope(fresh);
        } else {
          setEnvelope(authoritativeEnvelope);
        }
        if (
          reason instanceof HttpError &&
          (reason.status === 401 || reason.status === 403)
        ) {
          removeCredential(gameCode);
          setCredential(null);
        }
        if (!isRetryableHttpError(reason)) {
          setError(errorMessage(reason, "That action could not be completed."));
          pendingActionRef.current = null;
          setPendingActionId(null);
          return false;
        }
        setConnected(false);
        setError("Connection interrupted. Retrying this action…");
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, retryDelay);
        });
        retryDelay = Math.min(30_000, retryDelay * 2);
      }
    }
    return false;
  };

  const abandon = async () => {
    const code = gameCode;
    if (!(await act({ type: "ABANDON_GAME" }))) return;
    removeCredential(code);
    setGameCode("");
    setEnvelope(null);
    setCredential(null);
    router.replace("/");
    void loadRecentGames();
  };

  const currentCredential = useMemo(() => {
    if (!gameCode) return null;
    return credential ?? credentials()[gameCode] ?? null;
  }, [credential, gameCode]);
  const actionBusy = busy || pendingActionId !== null;

  if (!envelope || !currentCredential) {
    return (
      <Landing
        tutorialCanvases={tutorialCanvases}
        gameCode={gameCode}
        knownGame={envelope}
        recentGames={recentGames}
        busy={actionBusy}
        error={error}
        onCreate={create}
        onJoin={join}
        onFind={find}
      />
    );
  }
  if (
    !envelope.game.players.some(
      (player) => player.id === currentCredential.playerId,
    )
  ) {
    return (
      <main className="fatal-state">
        <h1>You were removed from this game.</h1>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            removeCredential(envelope.game.code);
            setGameCode("");
            setEnvelope(null);
            setCredential(null);
            router.replace("/");
            void loadRecentGames();
          }}
        >
          Return home
        </button>
      </main>
    );
  }
  if (envelope.game.status === "LOBBY") {
    return (
      <Lobby
        tutorialCanvases={tutorialCanvases}
        envelope={envelope}
        credential={currentCredential}
        busy={actionBusy}
        error={error}
        onAction={act}
        onAbandon={abandon}
      />
    );
  }
  return (
    <GameBoard
      tutorialCanvases={tutorialCanvases}
      envelope={envelope}
      credential={currentCredential}
      busy={actionBusy}
      error={error}
      connected={connected}
      onAction={act}
      onAbandon={abandon}
    />
  );
}
