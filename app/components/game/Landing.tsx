"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  CanvasDefinition,
  GameEnvelope,
  PlayerAvatar,
  PlayerAvatarColor,
} from "../../lib/types";
import {
  defaultPlayerAvatar,
  randomPlayerName,
  randomStudioName,
} from "../../lib/player-identities";
import CookieAcknowledgement from "../CookieAcknowledgement";
import LegalLinks from "../LegalLinks";
import {
  type RecentGame,
} from "./config";
import {
  AvatarPicker,
  RandomizedTextField,
} from "./cube-ui";
import { GameHelpControls } from "./game-controls";
import { MuseumWall } from "./MuseumWall";
import { PlayerIcon } from "./player-ui";

export function Landing({
  tutorialCanvases,
  gameCode,
  knownGame,
  recentGames,
  busy,
  error,
  onCreate,
  onJoin,
  onFind,
}: {
  tutorialCanvases: CanvasDefinition[];
  gameCode: string;
  knownGame: GameEnvelope | null;
  recentGames: RecentGame[];
  busy: boolean;
  error: string;
  onCreate: (
    hostName: string,
    gameName: string,
    avatar: PlayerAvatar,
  ) => void;
  onJoin: (displayName: string, avatar: PlayerAvatar) => void;
  onFind: (code: string) => void;
}) {
  const [hostName, setHostName] = useState("");
  const [gameName, setGameName] = useState("Saturday Studio");
  const [joinName, setJoinName] = useState("");
  const [code, setCode] = useState(gameCode);
  const [hostAvatar, setHostAvatar] = useState<PlayerAvatar>(
    defaultPlayerAvatar(),
  );
  const usedAvatarColors = useMemo(
    () =>
      (knownGame?.game.players ?? [])
        .map((player) => player.avatar?.color)
        .filter((color): color is PlayerAvatarColor => Boolean(color)),
    [knownGame],
  );
  const existingNames = useMemo(
    () => (knownGame?.game.players ?? []).map((player) => player.displayName),
    [knownGame],
  );
  const [joinAvatar, setJoinAvatar] = useState<PlayerAvatar>(
    defaultPlayerAvatar(),
  );
  const effectiveJoinAvatar = usedAvatarColors.includes(joinAvatar.color)
    ? defaultPlayerAvatar(usedAvatarColors)
    : joinAvatar;

  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link className="brand" href="/" aria-label="Starving Artists home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Starving Artists</strong>
          </span>
        </Link>
        <div className="landing-nav-actions">
          <Link href="/art-history">Meet the art</Link>
          <Link href="/how-to-play">How to play</Link>
          <GameHelpControls compact canvases={tutorialCanvases} />
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <h1>Paint. Sell. Survive.</h1>
          <p className="hero-seo-lede">
            A free online strategy game for one to four players. Collect paint,
            finish famous canvases and sell enough art to keep your studio fed.
          </p>

          {recentGames.length > 0 && (
            <section className="recent-games" aria-label="Your active games">
              <div className="recent-games-heading">
                <strong>Your games</strong>
                <span>{recentGames.length}</span>
              </div>
              <div className="recent-game-rail">
                {recentGames.map((recent) => (
                  <Link
                    className="recent-game-link"
                    href={`/game/${recent.code}`}
                    key={recent.code}
                  >
                    <PlayerIcon
                      name={recent.player.displayName}
                      avatar={recent.player.avatar}
                      className="compact"
                    />
                    <span>
                      <strong>{recent.name}</strong>
                      <small>
                        {recent.status === "LOBBY"
                          ? "Lobby"
                          : `Day ${recent.day}`}{" "}
                        · {recent.player.displayName}
                      </small>
                    </span>
                    <b>→</b>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="entry-card">
            {knownGame ? (
              <>
                <div className="entry-heading">
                  <span className="status-dot live" />
                  <div>
                    <p>Join studio</p>
                    <h2>{knownGame.game.name}</h2>
                  </div>
                  <span className="join-code">{knownGame.game.code}</span>
                </div>
                <div className="lobby-preview">
                  {knownGame.game.players.map((player) => (
                    <span key={player.id}>
                      <PlayerIcon
                        name={player.displayName}
                        avatar={player.avatar}
                        className="compact"
                      />
                      {player.displayName}
                    </span>
                  ))}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    onJoin(joinName, effectiveJoinAvatar);
                  }}
                >
                  <RandomizedTextField
                    id="join-artist-name"
                    label="Your artist name"
                    value={joinName}
                    onChange={setJoinName}
                    onRandomize={() =>
                      setJoinName(randomPlayerName(existingNames))
                    }
                    placeholder="Georgia"
                    maxLength={32}
                  />
                  <AvatarPicker
                    selected={effectiveJoinAvatar}
                    usedColors={usedAvatarColors}
                    onChange={setJoinAvatar}
                  />
                  <button className="primary-button" disabled={busy}>
                    {busy ? "Joining…" : "Enter the studio"}
                  </button>
                </form>
              </>
            ) : (
              <div className="entry-tabs">
                <details open>
                  <summary>Create a game</summary>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      onCreate(hostName, gameName, hostAvatar);
                    }}
                  >
                    <div className="form-grid">
                      <RandomizedTextField
                        id="host-artist-name"
                        label="Your artist name"
                        value={hostName}
                        onChange={setHostName}
                        onRandomize={() =>
                          setHostName(randomPlayerName())
                        }
                        placeholder="Vincent"
                        maxLength={32}
                      />
                      <RandomizedTextField
                        id="studio-name"
                        label="Studio name"
                        value={gameName}
                        onChange={setGameName}
                        onRandomize={() =>
                          setGameName(randomStudioName())
                        }
                        maxLength={48}
                      />
                    </div>
                    <AvatarPicker
                      selected={hostAvatar}
                      onChange={setHostAvatar}
                    />
                    <button className="primary-button" disabled={busy}>
                      {busy ? "Opening…" : "Open a new studio"}
                    </button>
                  </form>
                </details>
                <details>
                  <summary>Join with a code</summary>
                  <form
                    className="join-code-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onFind(code);
                    }}
                  >
                    <label>
                      Six-character game code
                      <input
                        className="code-input"
                        value={code}
                        onChange={(event) =>
                          setCode(event.target.value.toUpperCase())
                        }
                        placeholder="MUSE24"
                        maxLength={6}
                        required
                      />
                    </label>
                    <button className="secondary-button" disabled={busy}>
                      Find game
                    </button>
                  </form>
                </details>
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
          </div>
        </div>

        <div className="hero-gallery">
          <MuseumWall />
        </div>
      </section>
      <footer className="landing-legal-footer">
        <LegalLinks />
      </footer>
      <CookieAcknowledgement />
    </main>
  );
}

