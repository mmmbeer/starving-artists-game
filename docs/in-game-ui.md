## Starving Artists in-game UI design document (desktop-first, responsive)

This document defines a full-screen, section-scrolling layout that supports the core loop: buy canvases from a 3-slot market, manage studio canvases, drag/drop paint cubes to paint, and resolve night selling with paint-market collection order.

---

## 1) Design goals and UX principles

**Primary goals**

* Keep “what phase is it + whose turn + what can I do” always visible.
* Make  **Canvas Market** ,  **Paint Market** ,  **My Studio (canvases)** , and **My Paint** usable without page scrolling.
* Support fast, tactile play:  **drag paint cubes → drop onto canvas squares** .
* Provide “peek” visibility into other players without leaving the main screen.

**Screen behavior**

* The app is **full-screen** with **internal scroll regions** (market list, studio carousel/strip, logs), not a single long page.
* Desktop is the “complete cockpit.” Mobile collapses into stacked panels with a persistent bottom action tray.

---

## 2) Information architecture

### Always-visible HUD (top bar)

A thin, sticky header that never scrolls away.

**Left: Day + Phase**

* “Day X” and a large phase chip:  **Morning / Afternoon / Night (Selling)** .
* Phase progression indicator (three dots or segmented pill) with the current phase highlighted.

**Center: Turn ownership**

* “It’s **[PlayerName]’s** turn” with a clear highlight ring that matches their player color.
* Optional turn timer indicator (if enabled).

**Right: You (quick stats)**

* Points (stars), Completed canvases count, Nutrition (1–5) as a compact meter.
* If nutrition will drop at next day start, show a small warning icon (hover explains: “Nutrition decreases by 1 at day start”).

---

## 3) Main layout (desktop)

A 3-column grid with a fixed-height canvas area, plus a bottom “action dock.”

### Column A (left): Shared Markets (scroll within column)

**A1. Canvas Market (top card, fixed height)**

* Shows **3 full canvas cards** face-up in a vertical stack or horizontal row (depending on width).
* Each slot shows:
  * **Full card art** (the actual canvas card view, not text reconstruction).
  * Slot cost badge: **1 / 2 / 3 cubes** by position.
  * A “Buy” affordance that is enabled only when:
    * It’s your turn (in action phases), and
    * You have at least X cubes available to pay (any colors; payment is cubes into Paint Market).
* On purchase:
  * Animate paid cubes flowing from your paint tray into the Paint Market.
  * Market shifts left and refills slot 3 (visible slide animation).

**A2. Paint Market (below Canvas Market)**

* A compact “bin” showing **counts by color** (8 colors including wild).
* Two representations at once:
  1. A small grid of cube icons (for tactile feel),
  2. A color legend row with numeric counts (for clarity).
* During trading/selling, this panel becomes interactive:
  * Trading: highlights cubes eligible to take, shows exchange rate options (2→1, 5→2, 9→3).
  * Selling collection: shows remaining cubes and an “order ribbon” indicating who is collecting now and how many per collection action (4/2/1).

**A3. Activity / Rules log (optional, collapsible)**

* A small scrolling feed: “Player bought…”, “Player painted…”, “Night sale started…”
* Collapsed by default on smaller screens.

---

### Column B (center): My Studio (primary workspace)

This is the “table” where you paint.

**B1. Studio header row**

* “My Studio” label + counters:
  * Completed (ready to sell) count
  * In-progress count
* A subtle nutrition track and score mini-display can duplicate the top bar here for glanceability.

**B2. Studio canvas strip (scroll within)**

* Desktop default: a **horizontal carousel/filmstrip** of full canvas cards you own.
* Each card has:
  * The full art card with its required squares visible.
  * Drop-sensitive squares already implemented by you (use them directly).
  * A small status tag in the corner:
    * “In progress”
    * “Complete (unsold)”
    * “Sold” (only if you keep sold history visible)
* Selecting a card brings it into a larger “focus view” (below or as an overlay) so placing cubes is easy.

**B3. Focus canvas area (optional but strongly recommended)**

* When a canvas is selected, show it **larger** in a central focus panel.
* The filmstrip remains visible, but the focus panel is the primary drop target.
* Benefits: drag distance is shorter, and squares are easier to hit.

**Painting interaction**

* Drag cubes from your paint tray (bottom dock) and drop onto squares.
* On hover over a square, show:
  * Required color or diamond flexibility hint.
* Enforce “one wild per canvas” with immediate feedback (wild cube ghosted if already used).
* Allow “paint up to 4 cubes” action limit per Paint action:
  * UI shows a small “Placed 0/4” counter that increments as you drop.

---

### Column C (right): Players + Peek

**C1. Player stack (always visible, no scroll until overflow)**
Each player is a compact card with:

* Name + avatar/color
* Points, completed count, nutrition meter (same three stats you track for yourself).
* Turn indicator: a bright border when it’s their turn.
* Phase readiness indicators (small icons): “Has complete canvas to sell” etc.

**C2. “Peek studio” drawer**

* Clicking a player opens a side drawer (or popover) that shows:
  * Their studio summary: number of canvases, completed unsold, paint cube count (total only, not necessarily per-color if you want to keep some uncertainty).
  * Thumbnail strip of their canvases (art visible, but  **no drag/drop** ).
* This drawer should never navigate away; it’s a transient inspection layer.

---

### Bottom: Action Dock (sticky)

A fixed dock that contains everything you need to act on your turn.

**D1. Primary actions**
Large buttons that are phase-aware:

* Morning/Afternoon: buttons for available actions such as Work (draw 3 cubes), Paint (place up to 4), Buy Canvas, Trade.
* Night: “Start Selling” / “Choose Canvases to Sell” appears when appropriate.
* Buttons are enabled/disabled based on:
  * Is it your turn?
  * Is the action legal right now?
  * Do you have required resources?

**D2. My Paint Tray (drag source)**

* A row of paint cubes you currently hold, grouped by color with counts.
* Interaction patterns:
  * Click a color stack to “fan out” individual cubes for dragging if you want that feel.
  * Or drag from the stack and decrement count (simpler).
* Include a compact “Bag draw” animation when Work action resolves.

**D3. Quick pay selector**
Buying from the Canvas Market requires paying cubes equal to slot cost.
Provide a fast mechanism:

* Click “Buy” on a market canvas → a tiny “pay strip” pops from the dock:
  * Auto-selects any cubes (since color doesn’t matter for payment).
  * Lets the user adjust if they care.
  * Confirm → cubes animate into Paint Market.

---

## 4) Night phase (Selling) UI

Night is different enough that the UI should “re-skin” the center panel while keeping the same layout.

### Selling flow modal (guided, but not disruptive)

Triggered by the Night phase action.

**Step 1: Choose completed canvases to sell**

* Modal shows your completed canvases (full cards).
* Select one or more.
* Confirm.

**Step 2: Resolve sales (system-driven, clearly shown)**
For each sold canvas:

* Show rewards summary:
  * Food value adds nutrition (overflow converts to cubes, if you implement that conversion).
  * Star value adds points.
  * Paint value sets collection priority.
* Animate cubes returning from canvas back to the bag.

**Step 3: Paint Market collection order**
This is the tricky part; make it obvious:

* Right column player cards re-order visually by **Paint Value** rank for this sale.
* The Paint Market panel displays:
  * “Collecting now: Player A (4 cubes)” then Player B (2) then others (1).
* Collection interaction:
  * If you want agency: each player picks cubes up to their limit when it’s their collection turn.
  * Or fully automated “best for you” is risky. Better: prompt the active collector with a quick picker overlay.

---

## 5) Trading UI (popover modal)

Trading can be invoked as an action (and optional player-to-player trade once per day if you include that rule).

**Market trade popover**

* Left: your cubes (select to give)
* Right: paint market cubes (select to take)
* Top shows rate tabs: 2→1, 5→2, 9→3.
* Bottom confirm button with clear summary: “Give 5, Take 2.”

**Optional player trade**

* A broadcast offer modal:
  * Offer: choose cubes you give / want
  * Others see accept/decline in their peek panel
  * First accept resolves.

---

## 6) Scrolling and sizing rules

**No whole-page scrolling on desktop**

* Header and bottom dock are fixed.
* Columns A/B/C have their own scroll:
  * Markets column scrolls if needed.
  * Studio strip scrolls horizontally.
  * Player list scrolls only if 4 players + expanded peek content.

**Minimum viable sizes**

* Canvas cards remain readable by:
  * Using a “gallery frame” style with zoom-on-hover (desktop).
  * A dedicated focus panel for the selected canvas.

---

## 7) Responsive behavior (desktop-first)

### Tablet / small laptop

* Keep 3 columns but reduce C column width.
* Player peek becomes an overlay drawer instead of inline.

### Mobile (portrait)

Switch to a **three-panel stack** with a persistent bottom dock:

1. **Studio** (default tab)
2. **Markets**
3. **Players**

* Tabs are near the top (below HUD) or in the bottom dock.
* Drag/drop remains in Studio view; markets and players are quick switches, not separate pages.

### Mobile (landscape)

* Two-column: Studio + Markets
* Players accessible via a slide-in drawer.

---

## 8) States and visual emphasis

**Active turn**

* Entire UI subtly dims except:
  * Active player card (right column)
  * Enabled actions (bottom dock)

**Phase shift**

* At phase change, show a brief banner: “Afternoon Action Phase” with a soft transition.

**Errors and constraints**

* Illegal drops snap back with a short shake and a tooltip (“Needs Blue” / “Wild already used on this canvas” / “Paint action limit reached”).
