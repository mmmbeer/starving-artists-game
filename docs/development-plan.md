# Starving Artists – Online Multiplayer Development Plan

## Project Goals

Build a **multiplayer, browser-based implementation** of *Starving Artists* with:

* Seamless, modern UI (minimal page transitions).
* Real-time multiplayer gameplay.
* Drag-and-drop painting mechanics.
* Robust admin tooling for canvas creation and import.
* Clear phase boundaries with testable milestones.

**Target Stack**

* Backend: Node.js + TypeScript
* Frontend: React + TypeScript
* Database: MySQL
* Transport: WebSockets (or equivalent real-time layer)
* Architecture: Session-based multiplayer with authoritative server

---

## Core Architectural Principles

* **Authoritative server**: All game state validation occurs server-side.
* **Single-page experience**: Lobby → game → results without full reloads.
* **Event-driven UI**: All player actions broadcast as events.
* **Deterministic game engine**: Same inputs always yield same outcomes.
* **Admin-first content pipeline**: Cards are data, not hardcoded.

---

## Phase 0 — Foundations & Project Setup

**Objective**: Establish a stable technical base and shared mental model.

### Deliverables

* Repository structure (frontend, backend, shared types).
* TypeScript config shared between client and server.
* Base MySQL schema (users, games, players).
* CI setup with linting and type checks.
* Minimal SPA shell with routing disabled (single view).

### Testing

* Build verification tests.
* Database connection tests.
* Type consistency checks across client/server.

---

## Phase 1 — Core Game Data Model

**Objective**: Define all canonical game entities and rules in code.

### Entities

* Game
* Player
* Studio
* Canvas
* PaintCube
* PaintMarket
* CanvasMarket
* Turn / Day / Phase

### Rules Engine

* Nutrition logic.
* Action limits per day.
* Paint cube constraints.
* Canvas completion validation.
* Selling order resolution.

### Deliverables

* Shared TypeScript domain models.
* Server-side game state reducer.
* Immutable state transitions.
* Serialized game snapshots.

### Testing

* Unit tests for all rules.
* Golden tests for selling resolution.
* Starvation and end-game edge cases.

---

## Phase 2 — Multiplayer Game Lifecycle

**Objective**: Enable creation, joining, and persistence of multiplayer games.

### Features

* Game creation endpoint.
* Shareable join link.
* Lobby with player list.
* Host-controlled game start.
* Rejoin support (refresh safe).

### Deliverables

* Game session manager.
* Player slot assignment.
* WebSocket room binding.
* Lobby UI with live updates.

### Testing

* Multiple concurrent games.
* Join/leave/reconnect scenarios.
* Host disconnect recovery.

---

## Phase 3 — Turn System & Real-Time Sync

**Objective**: Implement authoritative turn flow with visible player actions.

### Turn Flow

* Morning action.
* Afternoon action.
* Night selling phase.
* Automatic phase advancement.

### UI Requirements

* Active player highlight.
* Phase indicator.
* Action availability gating.
* Live action feed (“Player X painted 3 cubes”).

### Deliverables

* Turn controller on server.
* Event broadcasting layer.
* Client state reconciliation.

### Testing

* Turn order enforcement.
* Race condition prevention.
* Out-of-turn action rejection.

---

## Phase 4 — Paint Cubes & Drag-and-Drop System

**Objective**: Implement tactile, visual painting mechanics.

### Features

* Drag cubes from studio to canvas.
* Drop validation by color.
* Diamond squares accept multiple colors.
* One wild cube per canvas enforcement.
* Partial completion allowed.

### Canvas Mapping

Each canvas defines:

* Square positions (relative coordinates).
* Allowed colors per square.
* Visual feedback for valid drops.

### Deliverables

* Drag-and-drop engine.
* Canvas layout renderer.
* Drop validation rules.
* Optimistic UI with rollback on rejection.

### Testing

* Invalid drop prevention.
* Multi-canvas painting.
* Wild cube limits.
* Mobile / touch interactions.

---

## Phase 5 — Markets (Canvas & Paint)

**Objective**: Implement shared, competitive resource systems.

### Canvas Market

* Three slots with dynamic costs.
* Shift logic on purchase.
* Reset action support.

### Paint Market

* Cube pool visualization.
* Trade ratios.
* Selling payout rounds.
* Round-robin collection logic.

### Deliverables

* Market state managers.
* Market UI components.
* Selling phase resolver.

### Testing

* Simultaneous selling.
* Tie handling.
* Empty market behavior.

---

## Phase 6 — Selling Phase & Scoring

**Objective**: Fully implement night phase and victory conditions.

### Selling Logic

* Declaration phase (locked choices).
* Nutrition gain and overflow handling.
* Cube return to bag.
* Paint cube payout sequencing.

### Endgame

* Point thresholds by player count.
* Starvation triggers.
* Tie-breaker resolution.

### Deliverables

* Selling UI flow.
* End-game screen.
* Winner resolution logic.

### Testing

* Multi-sale scenarios.
* Exact cube depletion cases.
* Starvation edge cases.

---

## Phase 7 — Admin Interface (Canvas Authoring)

**Objective**: Provide a professional tool for managing game content.

### Admin Features

* Create/edit canvas cards.
* Upload artwork.
* Define square layout visually.
* Assign color rules per square.
* Set star, paint, food values.
* Bulk import via CSV/JSON.

### UX

* Grid overlay editor.
* Drag squares onto artwork.
* Live preview of drag-and-drop behavior.

### Deliverables

* Admin dashboard.
* Canvas editor tool.
* Import/export pipelines.
* Validation rules.

### Testing

* Invalid card rejection.
* Layout precision tests.
* Import rollback on failure.

---

## Phase 8 — UI Polish & Seamless Experience

**Objective**: Achieve a modern, gallery-quality interface.

### Design Principles

* Minimalist layout.
* Subtle motion and transitions.
* No hard page navigations.
* Visual hierarchy focused on canvases.

### Features

* Floating panels (studio, markets).
* Action history timeline.
* Smooth animations for cubes and cards.
* Dark/light gallery themes.

### Deliverables

* Final UI skin.
* Motion system.
* Accessibility pass.

### Testing

* Performance profiling.
* Mobile responsiveness.
* Accessibility checks.

---

## Phase 9 — Observability, Moderation & Stability

**Objective**: Ensure long-term operability.

### Features

* Admin game viewer.
* Force end / kick player.
* Error logging and replay.
* State snapshot exports.

### Deliverables

* Admin moderation tools.
* Server metrics.
* Error dashboards.

### Testing

* Fault injection.
* Long-running games.
* High latency simulation.

---

## Phase 10 — Final Validation & Release

**Objective**: Confirm production readiness.

### Deliverables

* Load testing.
* Security review.
* Deployment scripts.
* Documentation for future contributors.

### Exit Criteria

* All phases covered by tests.
* No client-side authority leaks.
* Deterministic replays succeed.
* Admin tools usable without developer intervention.
