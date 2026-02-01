# In-Game UI Layout (Single Screen)

This document defines the authoritative, implementation-ready layout for the multiplayer in-game screen. The wireframe in `docs/wireframe_screenshot.png` only indicates relative placement and grouping. This spec replaces it with precise layout, behavior, and styling guidance while honoring the canonical game concepts and server authority rules.

## Goals

- Single-screen layout, desktop-first, no page reloads.
- Clear separation between shared space (authoritative game state) and player space (viewer studio).
- Simple, uncluttered gallery aesthetic with strong readability.
- All interactions funnel through the action bar; no hidden state changes.
- No UI element implies client authority over rules.

## Layout Overview (Top to Bottom)

The screen is split into three vertical bands. Percentages are approximate and should be treated as relative constraints that can flex with viewport height.

1) Shared Space (top 35-45% height)
2) Action Bar (center divider, 5-10% height)
3) Player Studio (bottom 45-50% height)

The overall layout uses a 12-column grid with 4-5% horizontal gutters. Shared space and player studio share the same left alignment to keep visual rhythm.

## Shared Space (Top Band)

This region is visible to all players and reflects authoritative game state.

### Canvas Market + Canvas Draw Deck

- Placement: left and center of the shared space.
- Layout: two adjacent blocks, market on the left, draw deck on the right.
- Canvas market shows the full set of available canvases in a horizontal row with slight overlap, like a tidy gallery line.
- Draw deck appears as a single stacked card block. It is visually distinct from the market but aligned to the same baseline.
- Each market canvas displays its purchase cost near the lower-right of the card face (subtle text, not a badge).
- No additional borders, frames, or padding are added to canvas cards. The card image is the visual container.
- Hover behavior: each canvas reveals a compact, inline text overlay adjacent to the cursor (or directly below the card) that repeats the points, food, and paint rewards. This text is purely informational and must not imply selection or rule changes.

### Upper-Right Status Cluster

The upper-right corner is reserved for phase and turn status. It is a shared UI element and must never overlap the shared canvas area.

1) Phase Indicator (dominant anchor)
- Large SVG icon representing morning, afternoon, or evening.
- Optional short label below or beside the icon (1-2 words).
- Must be instantly legible at a glance and visually dominant within the cluster.

2) Player Order Tracker (compact strip)
- A single-line or tight stacked strip directly adjacent to the phase icon.
- Format: "Player Name [score] [nutrition]" repeated per player.
- Active player is highlighted with a strong outline and a numbered index.
- The viewing player is also marked distinctly (subtle underline or dot).
- Nutrition is shown as a tiny horizontal gauge to the right of each player name.
- For 26 players: collapse to a scrollable strip with snap points, or a compact stack that shows 8-10 names and a "+N" overflow indicator. The active player and viewer must always remain visible.

## Paint Market (Shared, Below Canvases)

- Placement: directly below the canvas market region, spanning most of the width.
- Layout: a horizontal rail with slots in consistent color order:
  red, orange, yellow, green, blue, purple, black, wild.
- Each color slot includes a subtle label or icon so color ordering remains readable without color alone.
- Each slot visually represents the current number of cubes in play (count badge or subtle number label) without cluttering the rail.
- Market cubes should feel available to all; do not tie them to any player highlight.
- The paint market sits between shared canvas area and the action bar, acting as the last shared resource before player actions.

## Action Bar (Center Divider)

This is the primary interaction entry point and a strong visual divider.

- Placement: full-width horizontal bar separating shared space from player studio.
- Actions: Paint, Work, Buy, Pass, Sell, Free.
- Free actions (trade, reset canvas market) are nested under a "Free" action button with a dropdown.
- Sell is only enabled during the night phase and prompts selection of a completed canvas.

Button States
- Disabled: low-contrast label, no hover, tooltip indicates why.
- Enabled: clear call-to-action, hover glow or underline.
- Active selection: persistent highlight with a small "active" marker.
- Pending choice: action button shows a subtle progress ring until the user finishes the required selection.

The action bar must never obscure the canvas market or the player studio content. It should feel like the control surface for the current turn.

## Player Studio (Bottom Band)

This region is personalized to the viewing player but still reflects multiplayer state where relevant (turn ownership, locks).

### Player Canvases (Carousel)

- Placement: upper portion of the player studio.
- Layout: horizontal carousel with left/right navigation arrows and snap-to-card motion.
- The active canvas is centered and slightly larger than neighbors.
- Each canvas card shows:
  - the canvas image
  - the paint cube sockets (empty spaces)
  - any painted spaces (filled)
- Avoid overlays or heavy metadata on the canvas face. Use only minimal, unobtrusive indicators.

Interaction
- Selecting a canvas focuses it in the center position.
- Navigation arrows appear on hover or when the carousel is not at the ends.
- Active canvas is indicated by a thin outline glow or a small marker below the card.

### Player Paint Inventory (Bottom Tray)

- Placement: a full-width horizontal tray at the bottom of the player studio.
- Cubes arranged in the same fixed color order as the paint market.
- Slight randomized rotation (within 2-4 degrees) for tactile feel, but keep alignment clean.

Interaction
- Drag and drop or click-to-use, but the UI must prevent illegal moves.
- Illegal placements visibly reject (shake or red outline) and revert to the tray.
- The client never decides legality; it only reflects server acceptance or rejection.

## Multiplayer and State Cues

- Active player: clear outline or halo around their name in the player order tracker.
- Viewing player: subtle distinct marker (dot or underline).
- Waiting state: small badge or muted label, no modal or blocking overlay.
- Locked actions: show lock icon on the action button with a tooltip explaining the phase restriction.

## Animation and Feedback

- Market updates: cubes shift smoothly to new positions with easing.
- Cube movement: short lift-and-drop animation for paint actions.
- Canvas purchase: selected canvas slides down into the player studio with a brief fade.
- Score and nutrition changes: small numeric tick animations, no large popups.

## Accessibility and Clarity

- Color ordering must be understandable without color alone. Use labels or small icons.
- Hover text for canvas rewards must be keyboard accessible via focus.
- Scale down behavior: truncate player names, compress nutrition bars, reduce carousel card size, and increase snap points to avoid overlap.

## Styling and Theming

Use CSS variables for all color, typography, spacing, and motion tokens. The UI must support multiple themes without markup changes.

Required variable groups (not exhaustive)
- Color: background, surface, text, muted text, accent, focus, outline, disabled, error, success.
- Canvas and cube: canvas surface, cube highlight, cube shadow, cube outline.
- Typography: primary font, accent font, sizes, line heights.
- Spacing: base unit, card gaps, rail padding, action bar height.
- Motion: fast, normal, slow durations; easing curve.

Aesthetic Direction
- Modern art gallery feel: clean surfaces, subtle shadows, and generous negative space.
- No heavy borders or frames around canvas images.
- High contrast cube colors against neutral surfaces.
- Motion is subtle and purposeful, not decorative.

## Shared vs Player Space Summary

- Shared space: canvas market, canvas draw deck, paint market, phase icon, player order tracker.
- Player space: canvas carousel, paint inventory, player-specific selection highlights.
- Action bar: shared control surface, but only the active player can execute actions.

## Implementation Notes

- All layout sizes should scale proportionally with viewport height and width using percentages and CSS clamp where needed.
- No client-side randomization for game outcomes or market content.
- All state displayed is derived from the server-authoritative game state.
