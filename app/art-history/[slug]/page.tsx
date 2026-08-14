import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EditorialFooter,
  EditorialHeader,
  InGameArtCrop,
} from "../../components/ArtHistoryShell";
import RemoteImage from "../../components/RemoteImage";
import {
  ART_HISTORY,
  getArtHistoryEntry,
} from "../../lib/art-history-data";
import { CANVASES } from "../../lib/canvas-data";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ART_HISTORY.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getArtHistoryEntry(slug);
  if (!entry) return {};
  return {
    title: `${entry.title} by ${entry.artist}: History and Details`,
    description: entry.summary,
    alternates: { canonical: `/art-history/${entry.slug}` },
    openGraph: {
      title: `${entry.title} by ${entry.artist}`,
      description: entry.summary,
      url: `/art-history/${entry.slug}`,
      type: "article",
      images: [{ url: entry.publicImage, alt: entry.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${entry.title} by ${entry.artist}`,
      description: entry.summary,
      images: [entry.publicImage],
    },
  };
}

export default async function ArtHistoryDetail({ params }: PageProps) {
  const { slug } = await params;
  const entry = getArtHistoryEntry(slug);
  if (!entry) notFound();
  const canvas = CANVASES.find(({ id }) => id === entry.canvasId);
  if (!canvas) notFound();

  const currentIndex = ART_HISTORY.findIndex((item) => item.slug === entry.slug);
  const related = [1, 5, 11]
    .map((offset) => ART_HISTORY[(currentIndex + offset) % ART_HISTORY.length])
    .filter(Boolean);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${entry.title} by ${entry.artist}`,
    description: entry.summary,
    mainEntityOfPage: `https://www.starvingartistsgame.com/art-history/${entry.slug}`,
    image: entry.publicImage,
    author: { "@type": "Organization", name: "Starving Artists" },
    publisher: {
      "@type": "Organization",
      name: "Starving Artists",
      url: "https://www.starvingartistsgame.com",
    },
    about: {
      "@type": "VisualArtwork",
      name: entry.title,
      creator: { "@type": "Person", name: entry.artist },
      artform: "Painting",
      dateCreated: entry.year,
      image: entry.publicImage,
    },
    citation: entry.sources.map((source) => source.href),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.starvingartistsgame.com" },
      { "@type": "ListItem", position: 2, name: "Art history", item: "https://www.starvingartistsgame.com/art-history" },
      { "@type": "ListItem", position: 3, name: entry.title, item: `https://www.starvingartistsgame.com/art-history/${entry.slug}` },
    ],
  };

  return (
    <main className="editorial-page art-detail-page">
      <EditorialHeader />
      <nav className="editorial-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span>/</span>
        <Link href="/art-history">Art history</Link><span>/</span>
        <span aria-current="page">{entry.title}</span>
      </nav>

      <article>
        <header className="art-detail-hero">
          <div className="art-detail-title">
            <p className="editorial-eyebrow">{entry.movement} · {entry.year}</p>
            <h1>{entry.title}</h1>
            <p className="art-detail-byline">by {entry.artist}</p>
            <p className="art-detail-summary">{entry.summary}</p>
            <dl>
              <div><dt>Made</dt><dd>{entry.year}</dd></div>
              <div><dt>Style</dt><dd>{entry.movement}</dd></div>
              <div><dt>Collection</dt><dd>{entry.collection}</dd></div>
            </dl>
          </div>
          <figure className="public-art-figure">
            <RemoteImage
              src={entry.publicImage}
              alt={`${entry.title} by ${entry.artist}`}
              fallbackSrc={canvas.image}
              fallbackText="Game card shown while the public image is unavailable"
            />
            <figcaption>
              Public-domain reproduction. <a href={entry.publicImageSource} rel="noreferrer" target="_blank">View image source</a>
            </figcaption>
          </figure>
        </header>

        <section className="game-vs-gallery" aria-labelledby="game-version-heading">
          <div>
            <p className="editorial-eyebrow">From museum to game table</p>
            <h2 id="game-version-heading">The in-game crop</h2>
            <p>
              The card adds paint spaces, rewards and a frame. This crop shows
              the artwork area used during play, without the card rails.
            </p>
          </div>
          <figure className={canvas.aspectRatio > 1 ? "landscape" : "portrait"}>
            <InGameArtCrop canvas={canvas} className="art-detail-game-crop" />
            <figcaption>{canvas.title} in Starving Artists</figcaption>
          </figure>
        </section>

        <div className="art-story-layout">
          <section className="art-story-copy" aria-labelledby="story-heading">
            <p className="editorial-eyebrow">The short history</p>
            <h2 id="story-heading">What happened here?</h2>
            {entry.history.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
          <aside className="artist-panel">
            <a href={entry.artistImageSource} rel="noreferrer" target="_blank">
              <RemoteImage
                src={entry.artistImage}
                alt={entry.artistImageAlt}
                fallbackText={entry.artist}
                loading="lazy"
              />
            </a>
            <div>
              <small>The artist</small>
              <strong>{entry.artist}</strong>
              <span>{entry.artistYears}</span>
              <a href={entry.artistImageSource} rel="noreferrer" target="_blank">Portrait source</a>
            </div>
          </aside>
        </div>

        <section className="look-closer" aria-labelledby="look-heading">
          <p className="editorial-eyebrow">Look closer</p>
          <h2 id="look-heading">Three details worth finding</h2>
          <ol>
            {entry.lookFor.map((detail, index) => (
              <li key={detail}><span>{index + 1}</span><strong>{detail}</strong></li>
            ))}
          </ol>
        </section>

        <section className="art-sources" aria-labelledby="sources-heading">
          <div>
            <p className="editorial-eyebrow">Sources</p>
            <h2 id="sources-heading">Read further</h2>
            <p>Museum records come first. Wikipedia and Wikimedia Commons provide useful public background and image records.</p>
          </div>
          <ul>
            {entry.sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} rel="noreferrer" target="_blank">{source.label}<span>↗</span></a>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <section className="related-art" aria-labelledby="related-heading">
        <p className="editorial-eyebrow">Keep looking</p>
        <h2 id="related-heading">More art from the game</h2>
        <div>
          {related.map((item) => (
            <Link href={`/art-history/${item.slug}`} key={item.slug}>
              <small>{item.artist}</small>
              <strong>{item.title}</strong>
              <span>{item.year} →</span>
            </Link>
          ))}
        </div>
      </section>
      <EditorialFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </main>
  );
}
