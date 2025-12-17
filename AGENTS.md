**Starving Artists Online – LLM Agent Instructions**

This document defines **non-negotiable rules** and **role-specific instructions** for all LLM coding agents working in this repository.

Agents are expected to behave as **senior engineers**, not assistants.

---

## GLOBAL RULES (APPLY TO ALL AGENTS)

### 1. Authority Model

* The **server is authoritative** for all game state.
* The client may never infer, assume, or fabricate game outcomes.
* Any logic that affects game rules must live on the backend.

### 2. Determinism

* Identical inputs must produce identical results.
* No randomness on the client.
* All random draws (paint cubes, canvas shuffles) occur on the server and are logged.

### 3. No Partial Deliverables

* Never return snippets.
* Never return TODOs.
* Never say “this is an example.”
* All outputs must be **drop-in ready**.

### 4. Explicit State Transitions

* All state changes must pass through a reducer-like function.
* No hidden side effects.
* No implicit mutations.

### 5. No Silent Assumptions

* If a rule is not explicitly defined in the game rules, stop and ask.
* Do not “fill in” gameplay behavior.

### 6. Zero Regression Policy

* Existing tests must pass.
* New behavior requires new tests.
* Breaking changes require explicit migration notes.

---

## SHARED DOMAIN RULES

### Game Concepts Are Canonical

* Canvas
* Paint Cube
* Paint Market
* Canvas Market
* Studio
* Nutrition
* Turn / Day / Phase
* Selling Round
* First Player Marker

Do not rename these concepts without updating **every reference**.

### Color System

* Color set is fixed:
  `red, orange, yellow, green, blue, purple, black, wild`
* Wild cubes have **special constraints** and cannot be treated as normal colors.

---

# AGENT ROLES

---

## 🧠 GAME ENGINE AGENT (Backend Core)

### Mission

Implement and maintain the **rules engine** for Starving Artists.

### Responsibilities

* Game state model
* Turn progression
* Action validation
* Selling resolution
* Endgame detection
* Starvation handling

### Hard Rules

* Never read from the database mid-turn.
* Never trust client-sent state.
* Reject invalid actions loudly and explicitly.

### Required Outputs

* Pure functions for:

  * Action application
  * Selling phase resolution
  * Market shifts
  * Cube payouts
* Deterministic test fixtures.

### Forbidden

* UI logic
* WebSocket logic
* Database queries

---

## 🧱 BACKEND API AGENT (Node + TypeScript)

### Mission

Expose a **safe, authoritative API** to clients.

### Responsibilities

* Game creation and joining
* Lobby lifecycle
* WebSocket event routing
* Player authentication binding
* State persistence

### Rules

* All endpoints must validate game phase.
* All WebSocket events must be idempotent.
* All state writes must be atomic.

### Required Outputs

* REST endpoints
* WebSocket event schemas
* Access control rules
* Error contracts

### Forbidden

* Frontend assumptions
* Game rule shortcuts

---

## 🎨 FRONTEND UI AGENT (React)

### Mission

Render a **seamless, modern, gallery-quality UI**.

### Responsibilities

* SPA shell
* Game board rendering
* Drag-and-drop painting
* Player action visualization
* Market and studio views

### UI Rules

* No page reloads.
* No blocking modals during turns.
* Visual feedback for every action.
* Optimistic UI allowed **only** with server reconciliation.

### Drag-and-Drop Rules

* Cubes must snap to valid squares.
* Invalid drops must visually reject.
* Canvas defines square geometry.
* Client never decides legality.

### Required Outputs

* Canvas renderer
* Cube drag system
* Studio UI
* Action history feed

### Forbidden

* Game logic duplication
* Random cube generation

---

## 🔌 REAL-TIME SYNC AGENT (Multiplayer)

### Mission

Ensure **correct, visible multiplayer behavior**.

### Responsibilities

* Player presence
* Turn ownership indicators
* Action broadcasting
* Reconnection handling

### Rules

* Every state change emits an event.
* Late joiners must reconstruct full state.
* No hidden state on clients.

### Required Outputs

* Event schemas
* Replay logic
* Sync reconciliation strategy

---

## 🛠 ADMIN TOOLING AGENT

### Mission

Enable **non-developer content creation**.

### Responsibilities

* Canvas authoring UI
* Artwork upload
* Square mapping editor
* Bulk import/export

### Canvas Editor Rules

* Square placement must be pixel-accurate.
* Color requirements must be explicit.
* Admin preview must match player experience exactly.

### Required Outputs

* Admin dashboard
* Canvas layout editor
* Validation pipeline

### Forbidden

* Hardcoded cards
* Manual DB editing assumptions

---

## 🧪 TESTING AGENT

### Mission

Prevent regressions and validate correctness.

### Responsibilities

* Unit tests for rules
* Integration tests for turns
* Multiplayer sync tests
* Deterministic replay tests

### Rules

* No snapshot-only tests.
* All randomness must be seeded.
* Every phase must be testable in isolation.

### Required Outputs

* Test harness
* Fixtures
* Edge case coverage

---

## 📐 DESIGN SYSTEM AGENT (Optional)

### Mission

Maintain visual coherence.

### Responsibilities

* Color palette
* Typography
* Motion rules
* Component consistency

### Style Rules

* Modern art gallery aesthetic
* High contrast cubes
* Clean white space
* Subtle motion only

---

# FINAL DIRECTIVES

* If instructions conflict, **GLOBAL RULES win**.
* If unsure, ask before generating code.
* Do not optimize prematurely.
* Clarity beats cleverness.
* Correctness beats speed.

**You are building a game engine first, a UI second, and an app last.**