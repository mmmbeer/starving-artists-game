# Starving Artists – Online Multiplayer Rules and Features

## Overview

Starving Artists is a **time and resource management game** for 1–4 players. Players compete to complete famous works of art by acquiring and applying paint cubes to canvases. Finished paintings are sold for points, food, and additional paint cubes. The winner is the artist who survives the longest and achieves the required fame through completed canvases or points.

The **online version** requires implementation of:

* Digital card management (Canvas and Studio cards).
* Paint cube resource tracking.
* Nutrition and scoring systems.
* Turn-based, multiplayer interaction.
* Real-time Canvas Market and Paint Market management.

---

## 1. Components

For the online version, all physical components must be represented digitally:

* **92 Canvas Cards**
  Each card includes:

  * Artwork info (title, painter, year).
  * **Squares** showing paint cube requirements (color-coded).
  * **Star Value** (points awarded when sold).
  * **Paint Value** (maximum cubes collected when sold).
  * **Food Value** (nutrition gained when sold).

* **4 Studio Cards (one per player)**
  Each digital studio includes:

  * Nutrition Track (1–5).
  * Action Track (Morning, Day, Night).
  * Turn reference.
  * Paint palette storage for cubes.

* **Paint Cubes**
  150 cubes total across eight colors (red, orange, yellow, green, blue, purple, black, wild).

* **Paint Bag (digital randomizer)**
  Used to draw paint cubes.

* **Paint Market**
  Shared pool where cubes are stored, traded, and collected after sales.

* **Player Tokens (digital markers)**
  One for the scoring track and one for the nutrition track per player.

* **Scoring Track**
  Displays fame/points progression.

* **First Player Marker**
  Passed clockwise each day.

---

## 2. Initial Game Setup

1. **Determine First Player**: The system randomly assigns the first player (or allows selection).
2. **Nutrition Setup**: Each player starts with nutrition level 5.
3. **Scoring Setup**: Each player starts at 0 points.
4. **Paint Distribution**: Each player draws 6 random paint cubes from the Paint Bag into their studio.
5. **Canvas Market Setup**: Shuffle Canvas deck. Reveal 3 canvases face-up, forming the Market. Position costs:

   * Slot 1: 1 cube
   * Slot 2: 2 cubes
   * Slot 3: 3 cubes
6. **Paint Market Setup**: First player draws 4 random cubes from the bag into the Paint Market.

---

## 3. Painting and Card Features

* **Canvas Cards**: Display required cubes as squares. Diamonds represent flexible color choices.
* **Cube Placement**: Players must match cube colors exactly. Wild cubes (clear) may be used once per canvas.
* **Completion**: A canvas is complete when all squares are filled.

Rewards when sold:

* **Star Value** → points.
* **Paint Value** → determines turn order and maximum cubes collected in the selling phase.
* **Food Value** → nutrition replenishment.

---

## 4. Turn Order and Rounds

The game is played in **days**, each with three phases:

1. **Morning Action Phase**

   * First player places the marker on "Morning."
   * Players, in clockwise order, take one action.

2. **Afternoon Action Phase**

   * Same order as morning, players take a second action.

3. **Night (Selling Phase)**

   * Players may sell completed canvases.

At the start of each new day:

* Lower each player’s nutrition by 1.
* If a player’s nutrition drops below 1, they are eliminated. Remaining players have one final day.

---

## 5. Buying and Selling Canvases

### Buying

* A canvas may be purchased from the Canvas Market by paying cubes equal to its slot cost.
* Paid cubes are placed into the Paint Market.
* Market shifts left after a purchase and a new card is revealed into slot 3.

### Selling

* At night, players announce which completed canvases they will sell.
* Selling is resolved in **Paint Value order**:

  * Highest: 4 cubes per collection action.
  * Second highest: 2 cubes per action.
  * Others: 1 cube per action.
* Round-robin continues until cubes are taken or Paint Market empties.
* Selling steps:

  1. Gain Food Value → increase nutrition (excess converts to cubes).
  2. Return paint cubes from the canvas to the Paint Bag.
  3. Advance score by Star Value.
  4. Collect cubes from Paint Market.

---

## 6. Acquiring and Using Paint Cubes

### Acquiring Paint

* **Work Action**: Draw 3 random cubes into your studio.
* **Trading**: Exchange studio cubes for Paint Market cubes at set rates:

  * 2 → 1
  * 5 → 2
  * 9 → 3

### Using Paint

* **Paint Action**: Place up to 4 cubes from your studio onto one or more canvases.
* Matching required colors.
* Wild cube rules: one per canvas max.

---

## 7. Trading Rules

* **Market Trade**: Exchange cubes via Paint Market (rates above).
* **Player Trade (optional rule)**:

  * Once per day, a player may offer a trade to all others.
  * First to accept resolves the trade.

---

## 8. Canvas and Rewards Explanation

* **Canvas Slots**: Each canvas displays required colors in grid-like squares.
* **Cube Placement**:

  * Cubes are placed directly onto these squares.
  * Flexible diamonds allow choice of the indicated colors.
  * A painting may remain partially complete until future turns.
  
* **Rewards**: Upon selling, canvases provide:
  * Nutrition (Food Value).
  * Fame points (Star Value).
  * Cube income (Paint Value, resolved in collection actions).

---

## 9. Game End Conditions

* Based on player count:

  * 2 players → 7 completed paintings or 16 points.
  * 3 players → 6 paintings or 14 points.
  * 4 players → 5 paintings or 12 points.
* Alternatively, the game ends one day after any player starves.
* Tiebreakers: Most points → most completed canvases → most food → most cubes.

---

## 10. Online Design Aesthetic

The online version should capture the **modern art gallery aesthetic**:

* **Color Palette**: Clean whites, muted grays, pops of vibrant color matching paint cubes.
* **Canvas Display**: Digital reproductions of real art pieces framed as if in a gallery.
* **Studio Layout**: Minimalist artist workbench theme with paint palette UI.
* **Paint Cubes**: Represented as small, glossy 3D cubes with subtle lighting.
* **Nutrition Track**: Styled like a gallery café menu or life meter.
* **Scoring Track**: Curved gallery wall display with spotlights on player tokens.
* **Animations**: Smooth transitions when cubes are drawn, placed, or sold.
* **Atmosphere**: Light instrumental background music, with optional gallery ambience.

---

## 11. Multiplayer Features

* Lobby system with up to 4 players.
* Real-time updates to Canvas Market, Paint Market, and scoring.
* Turn timers (optional) to keep play moving.
* Visual indication of active player and current phase.
* Round-robin automated handling for cube collection during sales.

---

## 12. Single Player Variant

* Same as standard but with **reduced canvas deck (35 cards)**.
* At end of each day, the slot 1 canvas is discarded.
* Game ends when the player starves or canvases run out.
* Final scoring benchmarks determine performance.
