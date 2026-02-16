```md
# Starving Artists UI CSS Theme Standard
Vibrant, modern art gallery feel: strong lines, thin borders, confident color blocks, subtle paper/paint texture, crisp typography.

This document defines:
- A theme-ready CSS token system (light/dark + accent variants)
- Shared components (buttons, cards, chips, tabs, modals)
- Page shells for: Landing, Lobby, In-Game UI
- Texture + linework patterns that stay performant

---

## 0) Naming + layering conventions

### Class prefixes
- `sa-` = app-wide components
- `pg-landing`, `pg-lobby`, `pg-game` = page shells
- `is-*` = state (e.g., `is-active`, `is-disabled`, `is-warning`)
- `data-theme="light|dark"` and optional `data-accent="cobalt|mango|magenta|mint"`

### Z-index ladder
- `--z-base: 0`
- `--z-sticky: 10` (headers, docks)
- `--z-popover: 50`
- `--z-modal: 100`
- `--z-toast: 200`

---

## 1) Theme tokens (CSS custom properties)

### 1.1 Core tokens
Put these in `:root` and override via `[data-theme]` / `[data-accent]`.

```css
:root {
  /* Typography */
  --font-sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  --font-display: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

  /* Sizing */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;

  --line-1: 1px;
  --line-2: 2px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;

  /* Motion */
  --ease-out: cubic-bezier(.2, .8, .2, 1);
  --ease-in: cubic-bezier(.4, 0, 1, 1);
  --dur-1: 120ms;
  --dur-2: 180ms;
  --dur-3: 260ms;

  /* Shadows (subtle, gallery-like) */
  --shadow-1: 0 1px 0 rgba(0,0,0,.08), 0 10px 28px rgba(0,0,0,.12);
  --shadow-2: 0 1px 0 rgba(0,0,0,.10), 0 16px 44px rgba(0,0,0,.16);

  /* Surface + ink */
  --bg: #f7f3ee;
  --bg-elev: rgba(255,255,255,.62);
  --panel: rgba(255,255,255,.74);

  --ink: #141414;
  --ink-2: rgba(20,20,20,.72);
  --ink-3: rgba(20,20,20,.52);

  /* Lines + dividers */
  --line: rgba(20,20,20,.20);
  --line-strong: rgba(20,20,20,.40);

  /* Accents (set by data-accent) */
  --accent: #2d6cdf;        /* default cobalt */
  --accent-2: #1f4fb0;
  --accent-ink: #0b1830;
  --accent-soft: rgba(45,108,223,.14);

  /* Status colors */
  --good: #2aa36b;
  --warn: #e0a21b;
  --bad: #e04444;
  --info: #2d6cdf;

  /* Texture + noise */
  --noise-opacity: .06;
  --paper-opacity: .30;

  /* Focus ring */
  --focus: 0 0 0 3px rgba(45,108,223,.24);

  /* Layout */
  --maxw: 1180px;
  --dock-h: 92px;
  --topbar-h: 56px;

  /* Z */
  --z-base: 0;
  --z-sticky: 10;
  --z-popover: 50;
  --z-modal: 100;
  --z-toast: 200;
}
```

### 1.2 Dark theme overrides

```css
[data-theme="dark"] {
  --bg: #0f1115;
  --bg-elev: rgba(22,24,30,.62);
  --panel: rgba(22,24,30,.80);

  --ink: #f4f6fb;
  --ink-2: rgba(244,246,251,.72);
  --ink-3: rgba(244,246,251,.52);

  --line: rgba(244,246,251,.14);
  --line-strong: rgba(244,246,251,.28);

  --shadow-1: 0 1px 0 rgba(0,0,0,.22), 0 12px 36px rgba(0,0,0,.38);
  --shadow-2: 0 1px 0 rgba(0,0,0,.26), 0 18px 58px rgba(0,0,0,.46);

  --focus: 0 0 0 3px rgba(45,108,223,.34);
}
```

### 1.3 Accent variants

```css
[data-accent="cobalt"]  { --accent:#2d6cdf; --accent-2:#1f4fb0; --accent-soft:rgba(45,108,223,.14); --accent-ink:#0b1830; }
[data-accent="mango"]   { --accent:#ff8a1f; --accent-2:#d66b10; --accent-soft:rgba(255,138,31,.16); --accent-ink:#2b1505; }
[data-accent="magenta"] { --accent:#d93cff; --accent-2:#a72ad0; --accent-soft:rgba(217,60,255,.14); --accent-ink:#240529; }
[data-accent="mint"]    { --accent:#16c79a; --accent-2:#0da77f; --accent-soft:rgba(22,199,154,.16); --accent-ink:#04261f; }
```

---

## 2) Base styling and “gallery” texture

### 2.1 App background with paper + faint noise

Keep it subtle and stable (no heavy animations).

```css
.sa-app {
  min-height: 100vh;
  color: var(--ink);
  background: var(--bg);
  font-family: var(--font-sans);
  letter-spacing: .01em;
}

.sa-app::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-base);
  opacity: var(--paper-opacity);
  background:
    radial-gradient(1200px 700px at 15% 10%, rgba(255,255,255,.55), transparent 60%),
    radial-gradient(900px 600px at 85% 15%, rgba(255,255,255,.35), transparent 58%),
    radial-gradient(900px 900px at 60% 90%, rgba(0,0,0,.10), transparent 55%);
  mix-blend-mode: overlay;
}

.sa-app::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-base);
  opacity: var(--noise-opacity);
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
  background-size: 160px 160px;
  mix-blend-mode: multiply;
}
```

### 2.2 Strong lines, thin borders, crisp corners

```css
.sa-panel {
  background: var(--panel);
  border: var(--line-1) solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-1);
  backdrop-filter: blur(10px);
}

.sa-panel--hard {
  background: linear-gradient(180deg, rgba(255,255,255,.88), rgba(255,255,255,.62));
  border: var(--line-1) solid var(--line-strong);
}

[data-theme="dark"] .sa-panel--hard {
  background: linear-gradient(180deg, rgba(22,24,30,.92), rgba(22,24,30,.72));
}
```

---

## 3) Shared components (theme-ready building blocks)

### 3.1 Buttons

```css
.sa-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: var(--line-1) solid var(--line-strong);
  background: rgba(255,255,255,.66);
  color: var(--ink);
  cursor: pointer;
  transition: transform var(--dur-1) var(--ease-out), background var(--dur-2) var(--ease-out);
}

.sa-btn:hover { transform: translateY(-1px); }
.sa-btn:active { transform: translateY(0); }

.sa-btn:focus-visible { outline: none; box-shadow: var(--focus); }

.sa-btn--primary {
  background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(0,0,0,.08)), var(--accent);
  border-color: color-mix(in srgb, var(--accent), black 18%);
  color: #fff;
}

.sa-btn--ghost {
  background: transparent;
  border-color: var(--line);
}

.sa-btn.is-disabled,
.sa-btn:disabled {
  opacity: .45;
  cursor: not-allowed;
  transform: none;
}
```

### 3.2 Chips / badges

```css
.sa-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: var(--line-1) solid var(--line);
  background: rgba(255,255,255,.55);
  color: var(--ink-2);
}

.sa-chip--accent {
  border-color: color-mix(in srgb, var(--accent), white 40%);
  background: var(--accent-soft);
  color: var(--accent-ink);
}
```

### 3.3 Cards (Canvas cards, player cards)

```css
.sa-card {
  border-radius: var(--radius-md);
  border: var(--line-1) solid var(--line-strong);
  background: rgba(255,255,255,.70);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}

.sa-card__header {
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--line-1) solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sa-card__body {
  padding: var(--space-4);
}

.sa-card.is-active {
  border-color: color-mix(in srgb, var(--accent), black 10%);
  box-shadow: var(--shadow-2);
}
```

### 3.4 Modal + popover

```css
.sa-modalBackdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0,0,0,.45);
  display: grid;
  place-items: center;
}

.sa-modal {
  width: min(940px, calc(100vw - 32px));
  max-height: min(86vh, 860px);
  overflow: auto;
  border-radius: var(--radius-lg);
  border: var(--line-1) solid var(--line-strong);
  background: var(--panel);
  box-shadow: var(--shadow-2);
}

.sa-popover {
  position: absolute;
  z-index: var(--z-popover);
  border-radius: var(--radius-md);
  border: var(--line-1) solid var(--line-strong);
  background: var(--panel);
  box-shadow: var(--shadow-2);
}
```

### 3.5 “Gallery line” separators and corner marks

```css
.sa-rule {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--line-strong), transparent);
}

.sa-corners {
  position: relative;
}
.sa-corners::before,
.sa-corners::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(var(--ink), var(--ink)) left top / 10px 1px no-repeat,
    linear-gradient(var(--ink), var(--ink)) left top / 1px 10px no-repeat,
    linear-gradient(var(--ink), var(--ink)) right top / 10px 1px no-repeat,
    linear-gradient(var(--ink), var(--ink)) right top / 1px 10px no-repeat,
    linear-gradient(var(--ink), var(--ink)) left bottom / 10px 1px no-repeat,
    linear-gradient(var(--ink), var(--ink)) left bottom / 1px 10px no-repeat,
    linear-gradient(var(--ink), var(--ink)) right bottom / 10px 1px no-repeat,
    linear-gradient(var(--ink), var(--ink)) right bottom / 1px 10px no-repeat;
  opacity: .15;
}
```

---

## 4) Layout primitives (full-screen, internal scroll)

### 4.1 App shell

```css
.sa-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: var(--topbar-h) 1fr var(--dock-h);
}

.sa-topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 0 var(--space-5);
  border-bottom: var(--line-1) solid var(--line);
  background: color-mix(in srgb, var(--panel), transparent 10%);
  backdrop-filter: blur(10px);
}

.sa-main {
  min-height: 0; /* critical for internal scroll regions */
  overflow: hidden;
}

.sa-dock {
  position: sticky;
  bottom: 0;
  z-index: var(--z-sticky);
  border-top: var(--line-1) solid var(--line);
  background: color-mix(in srgb, var(--panel), transparent 10%);
  backdrop-filter: blur(10px);
}
```

### 4.2 Internal scroll container

```css
.sa-scroll {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
```

---

## 5) Landing page (pg-landing)

### 5.1 Layout intent

A clean “gallery poster wall”:

* Left: big title, tagline, CTA
* Right: artwork collage (canvas card previews)
* Bottom: feature strip + how-to-play quick steps

### 5.2 Structure

```html
<body class="sa-app" data-theme="light" data-accent="cobalt">
  <div class="pg-landing">
    <header class="pg-landing__top sa-topbar">
      <div class="pg-landing__brand">Starving Artists</div>
      <nav class="pg-landing__nav">
        <button class="sa-btn sa-btn--ghost">Rules</button>
        <button class="sa-btn sa-btn--ghost">About</button>
        <button class="sa-btn sa-btn--primary">Play</button>
      </nav>
    </header>

    <main class="pg-landing__hero">
      <section class="pg-landing__copy sa-corners">
        <h1 class="pg-landing__title">Paint fast. Sell smarter.</h1>
        <p class="pg-landing__sub">A vibrant art-market game of timing, trade, and survival.</p>
        <div class="pg-landing__cta">
          <button class="sa-btn sa-btn--primary">Start Game</button>
          <button class="sa-btn">Join Lobby</button>
        </div>
      </section>

      <section class="pg-landing__art sa-panel">
        <!-- card collage / motion -->
      </section>
    </main>

    <section class="pg-landing__features sa-panel sa-scroll">
      <!-- icons + 3-5 bullets -->
    </section>
  </div>
</body>
```

### 5.3 CSS skeleton

```css
.pg-landing {
  min-height: 100vh;
  display: grid;
  grid-template-rows: var(--topbar-h) 1fr auto;
}

.pg-landing__hero {
  display: grid;
  grid-template-columns: 1.1fr .9fr;
  gap: var(--space-7);
  padding: var(--space-7);
  max-width: var(--maxw);
  margin: 0 auto;
  align-items: center;
}

.pg-landing__copy {
  padding: var(--space-6);
  border: var(--line-1) solid var(--line);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--panel), transparent 10%);
  box-shadow: var(--shadow-1);
}

.pg-landing__title {
  font-family: var(--font-display);
  font-size: clamp(34px, 4vw, 54px);
  line-height: 1.05;
  margin: 0 0 var(--space-3);
}

.pg-landing__sub {
  color: var(--ink-2);
  font-size: 16px;
  margin: 0 0 var(--space-5);
}

.pg-landing__features {
  max-width: var(--maxw);
  margin: 0 auto var(--space-7);
  padding: var(--space-5);
}

@media (max-width: 980px) {
  .pg-landing__hero { grid-template-columns: 1fr; }
}
```

---

## 6) Game lobby page (pg-lobby)

### 6.1 Layout intent

A “gallery check-in desk”:

* Left column: Room info, settings, invite link
* Center: Player list (cards)
* Right: Chat / activity
* Bottom: Start controls

### 6.2 Structure

```html
<div class="pg-lobby sa-shell">
  <header class="sa-topbar">
    <div class="pg-lobby__title">
      <span class="sa-chip sa-chip--accent">Lobby</span>
      <strong>Room: FRESH-PAINT</strong>
    </div>
    <div class="pg-lobby__meta">
      <span class="sa-chip">2–4 players</span>
      <button class="sa-btn sa-btn--ghost">Copy Invite</button>
    </div>
  </header>

  <main class="sa-main">
    <div class="pg-lobby__grid">
      <aside class="pg-lobby__left sa-panel sa-scroll">Settings</aside>
      <section class="pg-lobby__center sa-panel sa-scroll">Players</section>
      <aside class="pg-lobby__right sa-panel sa-scroll">Chat</aside>
    </div>
  </main>

  <footer class="sa-dock pg-lobby__dock">
    <div class="pg-lobby__dockLeft">Status / warnings</div>
    <div class="pg-lobby__dockRight">
      <button class="sa-btn">Leave</button>
      <button class="sa-btn sa-btn--primary">Start Game</button>
    </div>
  </footer>
</div>
```

### 6.3 CSS skeleton

```css
.pg-lobby__grid {
  height: 100%;
  display: grid;
  grid-template-columns: 320px 1fr 360px;
  gap: var(--space-4);
  padding: var(--space-4);
  max-width: var(--maxw);
  margin: 0 auto;
}

.pg-lobby__dock {
  height: var(--dock-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
}

@media (max-width: 1100px) {
  .pg-lobby__grid { grid-template-columns: 1fr; }
  .pg-lobby__right { order: 3; }
}
```

---

## 7) In-game UI (pg-game)

### 7.1 Layout intent

Full-screen “play table”:

* Sticky topbar: day/phase, turn, your stats
* Main grid: Markets | Studio | Players
* Sticky bottom dock: actions + your paint tray
* Internal scroll only for markets and player list

### 7.2 Structure

```html
<div class="pg-game sa-shell">
  <header class="sa-topbar pg-game__topbar">
    <div class="pg-game__phase">
      <span class="sa-chip sa-chip--accent">Day 2</span>
      <span class="sa-chip">Afternoon</span>
    </div>

    <div class="pg-game__turn sa-chip">Turn: <strong>Alex</strong></div>

    <div class="pg-game__you">
      <span class="sa-chip">★ 12</span>
      <span class="sa-chip">Canvas 1</span>
      <span class="sa-chip">Food 3/5</span>
    </div>
  </header>

  <main class="sa-main">
    <div class="pg-game__grid">
      <aside class="pg-game__markets sa-panel">
        <div class="pg-game__marketsInner sa-scroll">
          <section class="pg-game__canvasMarket">
            <!-- 3 full canvas cards -->
          </section>
          <div class="sa-rule"></div>
          <section class="pg-game__paintMarket">
            <!-- cube counts + legend -->
          </section>
        </div>
      </aside>

      <section class="pg-game__studio sa-panel">
        <div class="pg-game__studioHeader sa-card__header">
          <strong>My Studio</strong>
          <span class="sa-chip">Placed 0/4</span>
        </div>

        <div class="pg-game__studioBody sa-scroll">
          <!-- filmstrip + focus canvas -->
        </div>
      </section>

      <aside class="pg-game__players sa-panel sa-scroll">
        <!-- player cards + peek drawer triggers -->
      </aside>
    </div>
  </main>

  <footer class="sa-dock pg-game__dock">
    <div class="pg-game__actions">
      <button class="sa-btn sa-btn--primary">Paint</button>
      <button class="sa-btn">Work</button>
      <button class="sa-btn">Trade</button>
      <button class="sa-btn">Buy Canvas</button>
    </div>

    <div class="pg-game__paintTray sa-panel--hard">
      <!-- cube stacks as drag sources -->
    </div>
  </footer>
</div>
```

### 7.3 CSS skeleton

```css
.pg-game__grid {
  height: 100%;
  display: grid;
  grid-template-columns: 360px 1fr 320px;
  gap: var(--space-4);
  padding: var(--space-4);
}

.pg-game__marketsInner { padding: var(--space-4); }
.pg-game__studio { display: grid; grid-template-rows: auto 1fr; min-height: 0; }
.pg-game__studioBody { padding: var(--space-4); }

.pg-game__dock {
  height: var(--dock-h);
  display: grid;
  grid-template-columns: 1fr 520px;
  gap: var(--space-4);
  align-items: center;
  padding: 0 var(--space-4);
}

.pg-game__paintTray {
  height: calc(var(--dock-h) - 22px);
  border-radius: var(--radius-md);
  border: var(--line-1) solid var(--line-strong);
  padding: var(--space-3);
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

/* Responsive: collapse to 2 columns then stacked */
@media (max-width: 1100px) {
  .pg-game__grid { grid-template-columns: 360px 1fr; }
  .pg-game__players { display: none; }
  .pg-game__dock { grid-template-columns: 1fr 420px; }
}

@media (max-width: 860px) {
  .pg-game__grid { grid-template-columns: 1fr; }
  .pg-game__dock { grid-template-columns: 1fr; height: auto; padding: var(--space-3); }
}
```

---

## 8) Paint cubes + paint squares (production rules)

### 8.1 Cube visuals use sprite assets

Production game pages should use a sprite image (`/assets/cubes.png`) for cube rendering instead of flat CSS color blocks.

```css
.paint-cube {
  width: var(--cube-size);
  height: var(--cube-size);
  border-radius: var(--radius-sm);
  background-image: url("/assets/cubes.png");
  background-size: calc(1024px * var(--cube-sprite-scale)) calc(1024px * var(--cube-sprite-scale));
  background-repeat: no-repeat;
}
```

### 8.2 Canonical color mapping (8-color system)

The color system is fixed and must stay consistent across UI + rules:
`red, orange, yellow, green, blue, purple, black, wild`

```css
.paint-cube[data-color="red"]    { /* sprite red frame */ }
.paint-cube[data-color="orange"] { /* sprite orange frame */ }
.paint-cube[data-color="yellow"] { /* sprite yellow frame */ }
.paint-cube[data-color="green"]  { /* sprite green frame */ }
.paint-cube[data-color="blue"]   { /* sprite blue frame */ }
.paint-cube[data-color="purple"] { /* sprite purple frame */ }
.paint-cube[data-color="black"]  { /* sprite black frame */ }
.paint-cube[data-color="wild"]   { /* sprite wild frame */ }
```

### 8.3 On-canvas paint square overlays

Canvas art remains the base image; paintable spaces are overlaid with absolute-positioned square/drop zones from `layout_json`.

```css
.canvas-painting-frame { position: relative; }

.canvas-paint-overlay,
.canvas-squares-overlay {
  position: absolute;
  inset: 0;
}

.paint-drop-zone {
  position: absolute;
  width: calc(80px * var(--overlay-scale, 1));
  height: calc(80px * var(--overlay-scale, 1));
}
```

Rules for paint squares:
- `data-allowed-colors` drives legality hints only; server validates final action legality.
- Multi-color spaces use a split/gradient border treatment.
- Painted spaces render with a cube visual (`.paint-cube.in-canvas`) and no drag source behavior.

---

## 9) Accessibility + interaction defaults

### 9.1 Focus and hover

```css
.sa-focusRing:focus-visible { outline: none; box-shadow: var(--focus); }

.sa-hoverLift {
  transition: transform var(--dur-2) var(--ease-out), box-shadow var(--dur-2) var(--ease-out);
}
.sa-hoverLift:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); }
```

### 9.2 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 1ms !important; animation-duration: 1ms !important; }
}
```

---

## 10) Implementation checklist

* [ ] Apply `sa-app` on `<body>` and set `data-theme` + `data-accent` on the root element.
* [ ] Use `sa-shell` for Lobby and Game to enforce full-screen + sticky bars.
* [ ] Ensure all scroll regions use `min-height:0` on parent grids and `sa-scroll` on the scrolling child.
* [ ] Use `sa-panel` and `sa-card` consistently for the gallery look.
* [ ] Keep borders thin (`--line-1`) and let color come from accent chips, cube colors, and art.
