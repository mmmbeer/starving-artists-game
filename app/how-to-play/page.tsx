import type { Metadata } from "next";
import Link from "next/link";
import { EditorialFooter, EditorialHeader } from "../components/ArtHistoryShell";

export const metadata: Metadata = {
  title: "How to Play Starving Artists Online",
  description:
    "Learn how to play Starving Artists online. Buy canvases, paint with colored cubes, trade once each day, sell finished art and keep your artist fed.",
  alternates: { canonical: "/how-to-play" },
  openGraph: {
    title: "How to Play Starving Artists Online",
    description: "A clear, quick guide to every phase and action in the game.",
    url: "/how-to-play",
    type: "article",
  },
};

const steps = [
  { number: "01", title: "Open a studio", text: "Create a game, share the six-character code and seat up to four artists. Everyone starts with paint, five nutrition and zero fame." },
  { number: "02", title: "Take two actions", text: "Each day has Morning and Afternoon. In turn order, buy a canvas, paint up to four cubes or pass in each phase." },
  { number: "03", title: "Trade once", text: "Make one market trade at any time during Morning or Afternoon. Trading is free. It never uses your action for that phase." },
  { number: "04", title: "Sell finished art", text: "After both action phases, declare any completed canvases for sale. Sold paintings earn fame, food and first choice of market paint." },
  { number: "05", title: "Stay fed", text: "At the start of a new day, every artist loses one nutrition. If an artist reaches zero, the final day begins." },
];

export default function HowToPlayPage() {
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to play Starving Artists online",
    description: "A quick guide to playing the online strategy board game Starving Artists.",
    totalTime: "PT5M",
    step: steps.map((step) => ({
      "@type": "HowToStep",
      name: step.title,
      text: step.text,
      url: `https://www.starvingartistsgame.com/how-to-play#step-${step.number}`,
    })),
  };
  return (
    <main className="editorial-page rules-guide-page">
      <EditorialHeader />
      <section className="rules-guide-hero">
        <p className="editorial-eyebrow">The five-minute guide</p>
        <h1>Paint famous art. Sell it. Try not to starve.</h1>
        <p>
          Starving Artists is a strategy game for one to four players. Every
          turn asks the same useful question: is this paint worth more on a
          canvas, in the market or saved for later?
        </p>
        <div>
          <Link href="/">Start a game</Link>
          <Link href="/art-history">Meet the paintings</Link>
        </div>
      </section>

      <section className="rules-guide-steps" aria-label="How to play">
        {steps.map((step) => (
          <article id={`step-${step.number}`} key={step.number}>
            <span>{step.number}</span>
            <div><h2>{step.title}</h2><p>{step.text}</p></div>
          </article>
        ))}
      </section>

      <section className="rules-reference-grid">
        <article>
          <small>Buy a canvas</small>
          <h2>Pay for position.</h2>
          <p>The three market slots cost one, two or three paint cubes. A purchased canvas moves to your studio. Refill the empty market slot from the deck.</p>
        </article>
        <article>
          <small>Paint</small>
          <h2>Place up to four cubes.</h2>
          <p>Match cube colors to open paint spaces across one or more canvases. A clear wild cube can fill any color, but each canvas can hold only one wild.</p>
        </article>
        <article>
          <small>Trade</small>
          <h2>One free trade each day.</h2>
          <p>Trade two cubes for one, five for two or nine for three. Take paint from the shared market and return your offered cubes. Your Morning or Afternoon action remains available.</p>
        </article>
        <article>
          <small>Sell</small>
          <h2>Turn art into survival.</h2>
          <p>Completed canvases can be sold after Afternoon. Rewards resolve together. Fame moves you toward victory. Food restores nutrition. Paint value helps decide collection order.</p>
        </article>
      </section>

      <section className="winning-guide">
        <div><p className="editorial-eyebrow">Ending the game</p><h2>Fame wins. Hunger sets the clock.</h2></div>
        <p>
          A final day begins when an artist starves or a player reaches the
          fame or sold-canvas target for the group size. Finish that day.
          Highest fame wins. Ties go to most canvases sold, then nutrition.
        </p>
      </section>
      <EditorialFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
    </main>
  );
}
