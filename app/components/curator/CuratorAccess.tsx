import Link from "next/link";
import type { FormEventHandler } from "react";
import type { LoadState } from "./curator-utils";

export function CuratorAccess({
  loadState,
  password,
  message,
  onPasswordChange,
  onSignIn,
}: {
  loadState: LoadState;
  password: string;
  message: string;
  onPasswordChange: (value: string) => void;
  onSignIn: FormEventHandler;
}) {
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

  return (
    <main className="curator-login">
      <form className="curator-login-card" onSubmit={onSignIn}>
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
            onChange={(event) => onPasswordChange(event.target.value)}
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
