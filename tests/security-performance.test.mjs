import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { build } from "esbuild";

async function loadRequestSecurity() {
  const result = await build({
    entryPoints: ["app/lib/request-security.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
  });
  const source = result.outputFiles[0].text;
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
}

const security = await loadRequestSecurity();

test("game codes accept legacy links and require stronger new-code shapes", () => {
  assert.equal(security.normalizeGameCode(" abcd23 "), "ABCD23");
  assert.equal(security.normalizeGameCode("ABCD2345"), "ABCD2345");
  assert.equal(security.normalizeGameCode("contains-o"), null);
  assert.equal(security.normalizeGameCode("SHORT"), null);
});

test("identifier arrays are bounded, unique, and made only of short strings", () => {
  assert.equal(security.boundedStringArray(["a", "b"], 2), true);
  assert.equal(security.boundedStringArray(["a", "a"], 2), false);
  assert.equal(security.boundedStringArray(["a", "b", "c"], 2), false);
  assert.equal(security.boundedStringArray(["x".repeat(81)], 2), false);
});

test("JSON parsing enforces content type and payload size", async () => {
  await assert.rejects(
    security.readJsonBody(
      new Request("https://example.test", {
        method: "POST",
        body: "{}",
        headers: { "Content-Type": "text/plain" },
      }),
    ),
    (error) => error.status === 415,
  );
  await assert.rejects(
    security.readJsonBody(
      new Request("https://example.test", {
        method: "POST",
        body: JSON.stringify({ value: "x".repeat(100) }),
        headers: { "Content-Type": "application/json" },
      }),
      32,
    ),
    (error) => error.status === 413,
  );
});

test("rate limiting returns a bounded retry response", async () => {
  security.resetRateLimitsForTests();
  const request = new Request("https://example.test/api/games", {
    headers: { "CF-Connecting-IP": "192.0.2.1" },
  });
  assert.equal(
    security.rateLimitResponse(
      request,
      "test",
      { limit: 2, windowMs: 10_000 },
      "",
      1_000,
    ),
    null,
  );
  assert.equal(
    security.rateLimitResponse(
      request,
      "test",
      { limit: 2, windowMs: 10_000 },
      "",
      1_001,
    ),
    null,
  );
  const response = security.rateLimitResponse(
    request,
    "test",
    { limit: 2, windowMs: 10_000 },
    "",
    1_002,
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "10");
});

test("normal worker responses carry browser defense headers", () => {
  const worker = readFileSync("worker/index.ts", "utf8");
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /frame-ancestors 'none'/);
  assert.match(worker, /X-Content-Type-Options/);
  assert.match(worker, /Permissions-Policy/);
  assert.match(worker, /secureResponse\(await handler\.fetch/);
});

test("game writes enforce expiry and group logical mutations", () => {
  const store = [
    readFileSync("app/lib/game-store.ts", "utf8"),
    readFileSync("app/lib/game-store-db.ts", "utf8"),
  ].join("\n");
  assert.match(store, /expires_at > \?/);
  assert.match(store, /cleanupExpiredGames/);
  assert.match(store, /games_delete_player_secrets/);
  assert.match(store, /authenticatedRowByCode/);
  assert.match(store, /await database\(\)\.batch\(\[/);
  assert.match(store, /INSERT OR IGNORE INTO processed_actions/);
});

test("the client predicts actions and pauses adaptive background work", () => {
  const component = readFileSync("app/components/GameApp.tsx", "utf8");
  const optimistic = readFileSync("app/lib/optimistic-game.ts", "utf8");
  assert.match(component, /predictGameAction\(/);
  assert.match(component, /pendingActionRef/);
  assert.match(component, /actionId,\s*expectedVersion:/s);
  assert.match(component, /document\.hidden/);
  assert.match(component, /navigator\.onLine/);
  assert.match(component, /Math\.min\(30_000/);
  assert.match(optimistic, /reduceGame\(/);
});
