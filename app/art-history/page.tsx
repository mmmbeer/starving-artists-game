import type { Metadata } from "next";
import Link from "next/link";
import {
  EditorialFooter,
  EditorialHeader,
  InGameArtCrop,
} from "../components/ArtHistoryShell";
import { ART_HISTORY } from "../lib/art-history-data";
import { CANVASES } from "../lib/canvas-data";
import type { CanvasDefinition } from "../lib/types";

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

type GalleryItem = {
  entry: (typeof ART_HISTORY)[number];
  canvas: CanvasDefinition;
};

function ArtHistoryCard({
  item,
  className = "",
}: {
  item: GalleryItem;
  className?: string;
}) {
  const { entry, canvas } = item;
  return (
    <Link
      className={`art-history-card ${className}`}
      href={`/art-history/${entry.slug}`}
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
}

export default function ArtHistoryIndex() {
  const canvasById = new Map(CANVASES.map((canvas) => [canvas.id, canvas]));
  const galleryItems = ART_HISTORY.flatMap((entry) => {
    const canvas = canvasById.get(entry.canvasId);
    return canvas ? [{ entry, canvas }] : [];
  });
  const landscapes = galleryItems.filter(({ canvas }) => canvas.aspectRatio > 1);
  const portraits = galleryItems.filter(({ canvas }) => canvas.aspectRatio <= 1);
  const clusterCount = Math.min(Math.floor(landscapes.length / 2), portraits.length);
  const clusters = Array.from({ length: clusterCount }, (_, index) => ({
    landscapes: landscapes.slice(index * 2, index * 2 + 2),
    portrait: portraits[index],
  }));
  const remainingLandscapes = landscapes.slice(clusterCount * 2);
  const remainingPortraits = portraits.slice(clusterCount);
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

      <section className="art-history-grid" id="art-guides" aria-label="Art history guides">
        {clusters.map((cluster, index) => (
          <div
            className={`art-history-cluster ${index % 2 ? "portrait-left" : "portrait-right"}`}
            key={cluster.portrait.entry.slug}
          >
            <div className="art-history-landscape-stack">
              {cluster.landscapes.map((item) => (
                <ArtHistoryCard item={item} key={item.entry.slug} />
              ))}
            </div>
            <ArtHistoryCard item={cluster.portrait} className="art-history-portrait-card" />
          </div>
        ))}

        {remainingPortraits.length > 0 && (
          <div className="art-history-portrait-salon">
            {remainingPortraits.map((item) => (
              <ArtHistoryCard item={item} key={item.entry.slug} />
            ))}
          </div>
        )}

        {remainingLandscapes.map((item) => (
          <ArtHistoryCard
            item={item}
            className="art-history-final-landscape"
            key={item.entry.slug}
          />
        ))}
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
