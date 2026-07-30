import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

async function loadEngine() {
  const result = await build({
    entryPoints: ["app/lib/engine.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
  });
  const source = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const engine = await loadEngine();
const at = "2026-07-23T12:00:00.000Z";

function lobby() {
  const state = engine.createLobbyState({
    id: "game-1",
    code: "PAINT1",
    name: "Test Studio",
    hostPlayerId: "host",
    hostName: "Host",
    seed: 4242,
    at,
  });
  return engine.joinLobby(state, "guest", "Guest", at);
}

test("game setup is deterministic and initializes every shared market", () => {
  const first = engine.reduceGame(lobby(), "host", { type: "START_GAME" }, at);
  const second = engine.reduceGame(lobby(), "host", { type: "START_GAME" }, at);

  assert.deepEqual(first.canvasMarket, second.canvasMarket);
  assert.deepEqual(first.paintMarket, second.paintMarket);
  assert.deepEqual(
    first.players.map((player) => player.studioCubes),
    second.players.map((player) => player.studioCubes),
  );
  assert.equal(first.canvasMarket.length, 3);
  assert.equal(first.paintMarket.length, 4);
  assert.ok(first.players.every((player) => player.studioCubes.length === 6));
});

test("the server reducer rejects out-of-turn actions and advances valid work", () => {
  const state = engine.reduceGame(lobby(), "host", { type: "START_GAME" }, at);
  const currentId = state.turnOrder[state.currentTurnIndex];
  const waitingId = state.turnOrder.find((playerId) => playerId !== currentId);

  assert.throws(
    () => engine.reduceGame(state, waitingId, { type: "WORK" }, at),
    (error) => error.code === "NOT_YOUR_TURN",
  );

  const before = state.players.find((player) => player.id === currentId);
  const next = engine.reduceGame(state, currentId, { type: "WORK" }, at);
  const after = next.players.find((player) => player.id === currentId);
  assert.equal(after.studioCubes.length, before.studioCubes.length + 3);
  assert.notEqual(
    next.turnOrder[next.currentTurnIndex],
    currentId,
    "work should pass the action to the next artist",
  );
});

test("each day advances through morning, afternoon, and evening actions", () => {
  let state = engine.reduceGame(lobby(), "host", { type: "START_GAME" }, at);
  const playerCount = state.turnOrder.length;

  assert.equal(state.phase, "MORNING");
  for (let index = 0; index < playerCount; index += 1) {
    const playerId = state.turnOrder[state.currentTurnIndex];
    state = engine.reduceGame(state, playerId, { type: "PASS" }, at);
  }

  assert.equal(state.phase, "AFTERNOON");
  assert.equal(state.currentTurnIndex, 0);
  for (let index = 0; index < playerCount; index += 1) {
    const playerId = state.turnOrder[state.currentTurnIndex];
    state = engine.reduceGame(state, playerId, { type: "PASS" }, at);
  }

  assert.equal(state.phase, "SELLING");
  assert.equal(state.selling.stage, "DECLARATIONS");
  assert.equal(state.currentTurnIndex, 0);

  const paintBeforeNewDay = state.paintMarket.length;
  while (state.phase === "SELLING") {
    const playerId = state.turnOrder[state.currentTurnIndex];
    state = engine.reduceGame(
      state,
      playerId,
      { type: "DECLARE_SALES", canvasInstanceIds: [] },
      at,
    );
  }

  assert.equal(state.day, 2);
  assert.equal(state.phase, "MORNING");
  assert.equal(state.paintMarket.length, paintBeforeNewDay + 4);
  assert.ok(state.players.every((player) => player.nutrition === 4));
});

test("a canvas purchase uses its slot cost and refills the market", () => {
  const state = engine.reduceGame(lobby(), "host", { type: "START_GAME" }, at);
  const playerId = state.turnOrder[state.currentTurnIndex];
  const player = state.players.find((entry) => entry.id === playerId);
  const purchasedDefinition = state.canvasMarket[1];
  const paymentCubeIds = player.studioCubes.slice(0, 2).map((cube) => cube.id);

  const next = engine.reduceGame(
    state,
    playerId,
    { type: "BUY_CANVAS", slotIndex: 1, paymentCubeIds },
    at,
  );
  const buyer = next.players.find((entry) => entry.id === playerId);
  assert.equal(buyer.canvases[0].definitionId, purchasedDefinition);
  assert.equal(buyer.studioCubes.length, 4);
  assert.equal(next.canvasMarket.length, 3);
  assert.equal(next.paintMarket.length, 6);
});

test("one paint action can place cubes across multiple studio canvases", () => {
  const state = engine.reduceGame(lobby(), "host", { type: "START_GAME" }, at);
  const playerId = state.turnOrder[state.currentTurnIndex];
  const player = state.players.find((entry) => entry.id === playerId);
  const [firstDefinitionId, secondDefinitionId] = state.canvasMarket;

  player.canvases = [
    {
      instanceId: "canvas-a",
      definitionId: firstDefinitionId,
      placedCubes: {},
    },
    {
      instanceId: "canvas-b",
      definitionId: secondDefinitionId,
      placedCubes: {},
    },
  ];
  const definitions = engine.canvasesForState(state);
  const firstSquare = definitions[firstDefinitionId].squares[0];
  const secondSquare = definitions[secondDefinitionId].squares[0];
  player.studioCubes = [
    { id: "cube-a", color: firstSquare.allowedColors[0] },
    { id: "cube-b", color: secondSquare.allowedColors[0] },
  ];

  const next = engine.reduceGame(
    state,
    playerId,
    {
      type: "PAINT",
      placements: [
        {
          canvasInstanceId: "canvas-a",
          squareId: firstSquare.id,
          cubeId: "cube-a",
        },
        {
          canvasInstanceId: "canvas-b",
          squareId: secondSquare.id,
          cubeId: "cube-b",
        },
      ],
    },
    at,
  );
  const painter = next.players.find((entry) => entry.id === playerId);

  assert.equal(
    painter.canvases[0].placedCubes[firstSquare.id].id,
    "cube-a",
  );
  assert.equal(
    painter.canvases[1].placedCubes[secondSquare.id].id,
    "cube-b",
  );
  assert.equal(painter.studioCubes.length, 0);
});

test("player food colors are unique within a lobby", () => {
  const state = engine.createLobbyState({
    id: "game-icons",
    code: "ICON01",
    name: "Icon Studio",
    hostPlayerId: "host",
    hostName: "Host",
    hostAvatar: { color: "red", icon: "apple" },
    seed: 12,
    at,
  });
  const joined = engine.joinLobby(
    state,
    "guest",
    "Guest",
    at,
    { color: "blue", icon: "popsicle" },
  );

  assert.deepEqual(joined.players[0].avatar, {
    color: "red",
    icon: "apple",
  });
  assert.deepEqual(joined.players[1].avatar, {
    color: "blue",
    icon: "popsicle",
  });
  assert.throws(
    () =>
      engine.joinLobby(
        joined,
        "guest-2",
        "Guest Two",
        at,
        { color: "red", icon: "tomato" },
      ),
    (error) => error.code === "AVATAR_COLOR_TAKEN",
  );
});

test("only the host can abandon a lobby or active game", () => {
  const openLobby = lobby();

  assert.throws(
    () =>
      engine.reduceGame(
        openLobby,
        "guest",
        { type: "ABANDON_GAME" },
        at,
      ),
    (error) => error.code === "HOST_ONLY",
  );

  const abandonedLobby = engine.reduceGame(
    openLobby,
    "host",
    { type: "ABANDON_GAME" },
    at,
  );
  assert.equal(abandonedLobby.status, "ABANDONED");
  assert.equal(abandonedLobby.phase, "ENDED");

  const active = engine.reduceGame(
    lobby(),
    "host",
    { type: "START_GAME" },
    at,
  );
  const abandonedGame = engine.reduceGame(
    active,
    "host",
    { type: "ABANDON_GAME" },
    at,
  );
  assert.equal(abandonedGame.status, "ABANDONED");
  assert.deepEqual(abandonedGame.turnOrder, []);
});

test("only the host can kick another player from the lobby", () => {
  const openLobby = lobby();

  assert.throws(
    () =>
      engine.reduceGame(
        openLobby,
        "guest",
        { type: "KICK_PLAYER", playerId: "host" },
        at,
      ),
    (error) => error.code === "HOST_ONLY",
  );
  assert.throws(
    () =>
      engine.reduceGame(
        openLobby,
        "host",
        { type: "KICK_PLAYER", playerId: "host" },
        at,
      ),
    (error) => error.code === "CANNOT_KICK_HOST",
  );

  const kicked = engine.reduceGame(
    openLobby,
    "host",
    { type: "KICK_PLAYER", playerId: "guest" },
    at,
  );
  assert.equal(kicked.status, "LOBBY");
  assert.deepEqual(
    kicked.players.map((player) => player.id),
    ["host"],
  );
  assert.match(kicked.log.at(-1).text, /Guest was removed by the host/);
});

test("kicking an active player preserves or advances the current turn", () => {
  const threePlayerLobby = engine.joinLobby(
    lobby(),
    "guest-2",
    "Guest Two",
    at,
  );
  let active = engine.reduceGame(
    threePlayerLobby,
    "host",
    { type: "START_GAME" },
    at,
  );
  const currentId = active.turnOrder[active.currentTurnIndex];
  const waitingGuestId = active.turnOrder.find(
    (playerId) => playerId !== "host" && playerId !== currentId,
  );

  const withoutWaitingGuest = engine.reduceGame(
    active,
    "host",
    { type: "KICK_PLAYER", playerId: waitingGuestId },
    at,
  );
  assert.equal(
    withoutWaitingGuest.turnOrder[withoutWaitingGuest.currentTurnIndex],
    currentId,
  );
  assert.equal(
    withoutWaitingGuest.players.some(
      (player) => player.id === waitingGuestId,
    ),
    false,
  );

  active = engine.reduceGame(
    threePlayerLobby,
    "host",
    { type: "START_GAME" },
    at,
  );
  if (active.turnOrder[active.currentTurnIndex] === "host") {
    active = engine.reduceGame(active, "host", { type: "PASS" }, at);
  }
  const disconnectedId = active.turnOrder[active.currentTurnIndex];
  const advanced = engine.reduceGame(
    active,
    "host",
    { type: "KICK_PLAYER", playerId: disconnectedId },
    at,
  );
  assert.equal(
    advanced.players.some((player) => player.id === disconnectedId),
    false,
  );
  assert.notEqual(
    advanced.turnOrder[advanced.currentTurnIndex],
    disconnectedId,
  );
});
