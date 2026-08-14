import Link from "next/link";
import type { CanvasDefinition } from "../lib/types";
import CookieAcknowledgement from "./CookieAcknowledgement";
import LegalLinks from "./LegalLinks";

export function EditorialHeader() {
  return (
    <header className="editorial-header">
      <Link className="brand brand-small" href="/" aria-label="Starving Artists home">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          <strong>Starving Artists</strong>
          <small>Paint. Sell. Survive.</small>
        </span>
      </Link>
      <nav aria-label="Site navigation">
        <Link href="/art-history">Art history</Link>
        <Link href="/how-to-play">How to play</Link>
        <Link className="editorial-play-link" href="/">Play now</Link>
      </nav>
    </header>
  );
}

export function EditorialFooter() {
  return (
    <>
      <footer className="editorial-footer">
        <div>
          <strong>Starving Artists</strong>
          <span>An online strategy game about art, paint and staying fed.</span>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/">Play</Link>
          <Link href="/how-to-play">Rules</Link>
          <Link href="/art-history">The art</Link>
        </nav>
        <LegalLinks />
      </footer>
      <CookieAcknowledgement />
    </>
  );
}

export function InGameArtCrop({
  canvas,
  className = "",
}: {
  canvas: CanvasDefinition;
  className?: string;
}) {
  const landscape = canvas.aspectRatio > 1;
  const crop = landscape
    ? { left: 0.043, top: 0.066, width: 0.913, height: 0.689 }
    : { left: 0.066, top: 0.044, width: 0.87, height: 0.777 };

  return (
    <span
      className={`in-game-art-crop ${landscape ? "landscape" : "portrait"} ${className}`}
      style={
        {
          "--art-ratio": canvas.aspectRatio * (crop.width / crop.height),
          "--art-image-width": `${100 / crop.width}%`,
          "--art-image-height": `${100 / crop.height}%`,
          "--art-image-left": `${(-crop.left / crop.width) * 100}%`,
          "--art-image-top": `${(-crop.top / crop.height) * 100}%`,
        } as React.CSSProperties
      }
    >
      <img src={canvas.image} alt={`${canvas.title} as it appears in Starving Artists`} />
    </span>
  );
}
