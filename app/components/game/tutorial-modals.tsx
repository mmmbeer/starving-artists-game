"use client";
import { useEffect, useState } from "react";
import type { CanvasDefinition, PaintColor } from "../../lib/types";
import { Modal } from "../ui/Modal";
import {
  TutorialCanvas,
  TutorialCube,
  TutorialScene,
} from "./tutorial-visual";
import { COLOR_LABELS, TUTORIAL_PAGES } from "./config";

export function TutorialModal({
  onClose,
  onOpenRules,
  canvases,
}: {
  onClose: () => void;
  onOpenRules: () => void;
  canvases: CanvasDefinition[];
}) {
  const [page, setPage] = useState(0);
  const content = TUTORIAL_PAGES[page];

  useEffect(() => {
    const changePage = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setPage((current) =>
          Math.min(TUTORIAL_PAGES.length - 1, current + 1),
        );
      }
      if (event.key === "ArrowLeft") {
        setPage((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener("keydown", changePage);
    return () => window.removeEventListener("keydown", changePage);
  }, []);

  return (
    <Modal
      title="How to Play"
      className="tutorial-modal"
      onClose={onClose}
      footerRail={
        <div className="tutorial-progress" aria-label="Tutorial progress">
          {TUTORIAL_PAGES.map((item, index) => (
            <button
              type="button"
              className={index === page ? "current" : ""}
              aria-label={`Go to ${item.title}`}
              aria-current={index === page ? "step" : undefined}
              onClick={() => setPage(index)}
              key={item.title}
            />
          ))}
        </div>
      }
      footer={
        <>
          <button
            type="button"
            className="rules-text-button"
            onClick={onOpenRules}
          >
            Read full rules
          </button>
          {page > 0 && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setPage((current) => current - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              if (page === TUTORIAL_PAGES.length - 1) onClose();
              else setPage((current) => current + 1);
            }}
          >
            {page === TUTORIAL_PAGES.length - 1 ? "Done" : "Next"}
          </button>
        </>
      }
    >
      <div className="tutorial-page" key={page}>
        <div className="tutorial-copy">
          <span>{content.eyebrow}</span>
          <h3>{content.title}</h3>
          <p>{content.summary}</p>
          <ul>
            {content.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
        <TutorialScene page={page} canvases={canvases} />
      </div>
    </Modal>
  );
}

export function RulesCanvasExample({
  canvases,
}: {
  canvases: CanvasDefinition[];
}) {
  const starryNight = canvases[2];

  return (
    <div className="rules-canvas-example">
      <TutorialCanvas definition={starryNight} painted={4} />
      <dl>
        <div>
          <dt>★ Fame</dt>
          <dd>{starryNight.starValue} points when sold</dd>
        </div>
        <div>
          <dt>● Food</dt>
          <dd>Restore {starryNight.foodValue} nutrition</dd>
        </div>
        <div>
          <dt>▰ Paint</dt>
          <dd>Claim up to {starryNight.paintValue} market cubes</dd>
        </div>
      </dl>
    </div>
  );
}

export function WrittenRulesModal({
  onClose,
  onOpenTutorial,
  canvases,
}: {
  onClose: () => void;
  onOpenTutorial: () => void;
  canvases: CanvasDefinition[];
}) {
  return (
    <Modal
      title="Complete Rules"
      className="rules-modal"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="secondary-button"
            onClick={onOpenTutorial}
          >
            View tutorial
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            Close rules
          </button>
        </>
      }
    >
      <div className="rules-layout">
        <nav className="rules-contents" aria-label="Rules contents">
          {[
            ["rules-goal", "Goal"],
            ["rules-setup", "Setup"],
            ["rules-day", "The day"],
            ["rules-actions", "Actions"],
            ["rules-paint", "Painting"],
            ["rules-evening", "Evening"],
            ["rules-end", "End game"],
          ].map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </nav>
        <article className="rules-document">
          <section id="rules-goal">
            <span className="rules-section-number">01</span>
            <h3>Goal of the game</h3>
            <p>
              You are an artist trying to complete and sell the strongest
              exhibition before hunger ends your career. Paint canvases, sell
              them for fame, and use their food rewards to maintain your
              nutrition.
            </p>
            <p>
              The player with the most fame at the end wins. Starving Artists
              supports one to four players.
            </p>
          </section>

          <section id="rules-setup">
            <span className="rules-section-number">02</span>
            <h3>Setup</h3>
            <ol>
              <li>Every artist begins with six random paint cubes.</li>
              <li>Every artist begins at five nutrition and zero fame.</li>
              <li>Three canvases are revealed in the Canvas Market.</li>
              <li>Four cubes are placed in the Paint Market.</li>
              <li>A random artist receives the first-player marker.</li>
            </ol>
            <div className="rules-cube-key">
              {(
                [
                  "red",
                  "orange",
                  "yellow",
                  "green",
                  "blue",
                  "purple",
                  "black",
                  "wild",
                ] as PaintColor[]
              ).map((color) => (
                <span key={color}>
                  <TutorialCube color={color} />
                  {COLOR_LABELS[color]}
                </span>
              ))}
            </div>
          </section>

          <section id="rules-day">
            <span className="rules-section-number">03</span>
            <h3>How a day works</h3>
            <div className="rules-phase-table">
              <div>
                <b>Morning</b>
                <span>Each artist takes one action in turn order.</span>
              </div>
              <div>
                <b>Afternoon</b>
                <span>Each artist takes a second action in the same order.</span>
              </div>
              <div>
                <b>Evening</b>
                <span>Complete canvases may be sold and paint is collected.</span>
              </div>
            </div>
            <h4>Starting a new day</h4>
            <p>
              Add four cubes from the bag to the Paint Market. Reduce every
              artist&apos;s nutrition by one. Pass the first-player marker to
              the next surviving artist, then begin Morning.
            </p>
          </section>

          <section id="rules-actions">
            <span className="rules-section-number">04</span>
            <h3>Actions</h3>
            <p>
              On your Morning and Afternoon turns, choose exactly one action.
              After it resolves, play passes to the next artist.
            </p>
            <div className="rules-action-list">
              <div>
                <b>Work</b>
                <p>Draw three random paint cubes from the bag.</p>
              </div>
              <div>
                <b>Buy a canvas</b>
                <p>
                  Buy the left, middle, or right Canvas Market card for one,
                  two, or three cubes respectively. Payment cubes move to the
                  Paint Market and the empty card slot is refilled.
                </p>
              </div>
              <div>
                <b>Paint</b>
                <p>
                  Place one to four cubes on open spaces across any number of
                  canvases in your studio.
                </p>
              </div>
              <div>
                <b>Trade</b>
                <p>
                  Once per day during Morning or Afternoon, give studio cubes
                  to the Paint Market and take market cubes at one of three
                  exact rates: 2→1, 5→2, or 9→3. This is a free action and may
                  be done at any time, even during another artist&apos;s turn.
                </p>
              </div>
              <div>
                <b>Pass</b>
                <p>Take no action and end your turn.</p>
              </div>
            </div>
            <div className="rules-market-example">
              {canvases.map((canvas, index) => (
                <TutorialCanvas
                  definition={canvas}
                  cost={index + 1}
                  key={canvas.id}
                />
              ))}
            </div>
          </section>

          <section id="rules-paint">
            <span className="rules-section-number">05</span>
            <h3>Reading and painting a canvas</h3>
            <p>
              Each paint space shows the cube it accepts. A solid square accepts
              one color. A split diamond accepts either of its two colors. A
              wild cube may fill any open space, but no canvas may contain more
              than one wild cube.
            </p>
            <p>
              Cubes stay on a canvas until it is sold. A canvas is complete only
              when every space is filled.
            </p>
            <RulesCanvasExample canvases={canvases} />
          </section>

          <section id="rules-evening">
            <span className="rules-section-number">06</span>
            <h3>Evening sales</h3>
            <p>
              In turn order, each artist declares any number of completed
              canvases for sale or declines to sell. After all declarations,
              every declared sale resolves.
            </p>
            <ul>
              <li>
                <strong>Fame:</strong> Add the card&apos;s star value to your
                score.
              </li>
              <li>
                <strong>Food:</strong> Restore nutrition up to the maximum of
                five. Each excess food draws one random cube from the bag.
              </li>
              <li>
                <strong>Paint:</strong> The card&apos;s paint value becomes
                your collection quota for the Paint Market.
              </li>
            </ul>
            <p>
              Cubes used on sold canvases return to the paint bag. Artists with
              a paint quota collect in descending order of total paint value
              sold that evening. The top seller may take up to four cubes per
              pick, the second seller up to two, and every other seller one.
              Collection continues until quotas are spent or the Paint Market
              is empty.
            </p>
          </section>

          <section id="rules-end">
            <span className="rules-section-number">07</span>
            <h3>Starvation and the end game</h3>
            <p>
              When an artist reaches zero nutrition at the start of a day, that
              artist starves and takes no more turns. That day becomes the final
              day for all remaining artists. If everyone starves, the game ends
              immediately.
            </p>
            <div className="rules-thresholds">
              <span>
                <b>2 players</b>
                <strong>16 fame or 7 canvases</strong>
              </span>
              <span>
                <b>3 players</b>
                <strong>14 fame or 6 canvases</strong>
              </span>
              <span>
                <b>4 players</b>
                <strong>12 fame or 5 canvases</strong>
              </span>
            </div>
            <p>
              In a multiplayer game, the exhibition ends after the evening in
              which any artist reaches either target. In a solo game, play
              continues until the 35-card canvas deck is exhausted or starvation
              ends the game.
            </p>
            <h4>Winner and ties</h4>
            <p>
              Highest fame wins. Ties are broken by most canvases sold, then
              nutrition, then paint cubes remaining in the studio. If all four
              values are equal, the players share the win.
            </p>
          </section>
        </article>
      </div>
    </Modal>
  );
}

