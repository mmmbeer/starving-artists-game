import type { Metadata } from "next";
import Link from "next/link";
import {
  EditorialFooter,
  EditorialHeader,
  InGameArtCrop,
} from "../components/ArtHistoryShell";
import { ART_HISTORY } from "../lib/art-history-data";
import { CANVASES } from "../lib/canvas-data";

export const metadata: Metadata = {
  title: "Famous Paintings in Starving Artists",
  description:
    "Meet 24 famous paintings used in Starving Artists. See each game-card crop beside the public-domain artwork and read its history.",
  alternates: { canonical: "/art-history" },
  openGraph: {
    title: "Famous Paintings in Starving Artists",
    description:
      "A light, sourced guide to the paintings and artists behind the game.",
    url: "/art-history",
    type: "website",
  },
};

export default function ArtHistoryIndex() {
  const canvasById = new Map(CANVASES.map((canvas) => [canvas.id, canvas]));
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Famous Paintings in Starving Artists",
    description:
      "Art history guides to public-domain paintings featured in the online board game Starving Artists.",
    url: "https://www.starvingartistsgame.com/art-history",
    hasPart: ART_HISTORY.map((entry) => ({
      "@type": "Article",
      headline: `${entry.title} by ${entry.artist}`,
      url: `https://www.starvingartistsgame.com/art-history/${entry.slug}`,
    })),
  };

  return (
    <main className="editorial-page art-index-page">
      <EditorialHeader />
      <section className="art-index-hero">
        <div>
          <p className="editorial-eyebrow">The gallery behind the game</p>
          <h1>Famous art, one canvas at a time.</h1>
          <p>
            Starving Artists turns paintings into playable canvases. Here are
            24 of the best-known works in the deck, shown beside their original
            public-domain art.
          </p>
        </div>
        <div className="art-index-stats" aria-label="Collection details">
          <span><b>{ART_HISTORY.length}</b> works</span>
          <span><b>500+</b> years</span>
          <span><b>1</b> very hungry game</span>
        </div>
      </section>

      <section className="art-history-grid" aria-label="Art history guides">
        {ART_HISTORY.map((entry, index) => {
          const canvas = canvasById.get(entry.canvasId);
          if (!canvas) return null;
          return (
            <Link
              className={`art-history-card art-history-card-${(index % 4) + 1}`}
              href={`/art-history/${entry.slug}`}
              key={entry.slug}
            >
              <InGameArtCrop canvas={canvas} />
              <span className="art-history-card-copy">
                <small>{entry.movement}</small>
                <strong>{entry.title}</strong>
                <span>{entry.artist} · {entry.year}</span>
                <em>Read the story →</em>
              </span>
            </Link>
          );
        })}
      </section>

      <section className="editorial-callout">
        <div>
          <p className="editorial-eyebrow">Put the art to work</p>
          <h2>Build a studio. Finish a masterpiece.</h2>
        </div>
        <Link href="/">Start a game</Link>
      </section>
      <EditorialFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
    </main>
  );
}
