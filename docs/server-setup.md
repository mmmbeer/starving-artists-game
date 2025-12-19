# Server setup for Starving Artists real-time services

This guide walks through the pieces you need to wire the single-page app on `www.starvingartistsgame.com` to the websocket-powered lobby and game streams, all from an Apache/cPanel shared host.

## 1. Goals
1. Keep the game client on `https://www.starvingartistsgame.com`.
2. Route `/lobby` and `/realtime/*` (lobby + game sockets) to the Node backend on port `4000` while preserving TLS+`Upgrade`.
3. Provide an on-site health endpoint + diagnostic script so you can quickly tell whether the websockets are reachable.

## 2. Prerequisites
- Node backend built by running `npm --workspace server run build` (or `npm run server:dev` during development). The server listens on `0.0.0.0:4000` by default via `server/.env`.
- Apache on cPanel with `mod_proxy`, `mod_proxy_http`, and `mod_proxy_wstunnel` enabled. If those modules are missing, ask your host or enable them under **WHM > Software > EasyApache**.
- Certificates already terminating at the Apache layer (`www.starvingartistsgame.com` is served over HTTPS).
- The backend must remain authoritative; do **not** mirror game state in the client.

## 3. Node backend deployment reminders
1. Install dependencies from the monorepo root: `npm install`.
2. Build the server: `npm --workspace server run build`.
3. Start the service (either via `npm --workspace server run start`, `npm --workspace server run dev`, or your process manager) so it listens on port `4000`.
4. Confirm you can reach `http://127.0.0.1:4000/health` on the host (this is the existing health check).
5. The new `/realtime/health` endpoint reports websocket stats for lobby and game servers and can be fetched from the browser once proxying is configured.

## 4. Apache / cPanel configuration for `/realtime`

### 4.1. Preferred method: Apache VirtualHost include
1. In WHM/cPanel’s **Apache Configuration > Include Editor**, paste the following inside the VirtualHost for `www.starvingartistsgame.com` (or drop it via `/etc/apache2/conf.d/includes/pre_virtualhost_global.conf` if the UI is unavailable).
2. Add this chunk so the `/lobby` HTTP routes and `/realtime` websocket routes forward to the Node API on port `4000`:
   ```apache
   ProxyPreserveHost On
   ProxyPass "/lobby"  "http://127.0.0.1:4000/lobby"  retry=0
   ProxyPassReverse "/lobby"  "http://127.0.0.1:4000/lobby"

   ProxyPass "/realtime/lobby"  "ws://127.0.0.1:4000/realtime/lobby"  retry=0
   ProxyPassReverse "/realtime/lobby"  "ws://127.0.0.1:4000/realtime/lobby"

   ProxyPass "/realtime/game"  "ws://127.0.0.1:4000/realtime/game"  retry=0
   ProxyPassReverse "/realtime/game"  "ws://127.0.0.1:4000/realtime/game"
   ```
3. Only proxy the websocket paths explicitly; a wildcard `ProxyPass /realtime http://...` would downgrade the upgrade handshake and break `wss://` traffic.
4. Reload Apache from WHM’s **Restart Services > HTTP Server (Apache)** or via SSH (`apachectl graceful`).
5. Confirm `apachectl -M | grep proxy` lists `proxy_module`, `proxy_http_module`, and `proxy_wstunnel_module`.

## 5. Alternative: dedicated `realtime.starvingartistsgame.com` subdomain
1. In cPanel > Domains > Subdomains, create `realtime.starvingartistsgame.com` pointing at the same document root (or a minimal folder if you only plan to reverse proxy).
2. Configure DNS (cPanel > Zone Editor) so `realtime` is a CNAME for the same host as `www`, or an A record pointing to your IP.
3. In the Apache VirtualHost that serves the subdomain, proxy every request/upgrade to port `4000`:
   ```apache
   ProxyPreserveHost On
   ProxyPass "/"  "http://127.0.0.1:4000/"
   ProxyPassReverse "/"  "http://127.0.0.1:4000/"

   RewriteEngine On
   RewriteCond %{HTTP:Upgrade} =websocket [NC]
   RewriteRule ^(.*)$ ws://127.0.0.1:4000/$1 [P,L]
   RewriteCond %{HTTP:Upgrade} !=websocket [NC]
   RewriteRule ^(.*)$ http://127.0.0.1:4000/$1 [P,L]
   ```
4. Alternatively, if you cannot edit the VirtualHost directly, drop a `.htaccess` in the subdomain’s document root with the same rewrite rules to conditionally proxy websocket upgrade headers.
5. Update the client to keep HTTP traffic on `www` but point websockets at `wss://realtime.starvingartistsgame.com` by configuring `VITE_REALTIME_URL` (see the new `.env.example`).

## 6. Health + diagnostics
1. The server now exposes `/realtime/health` (in addition to the main health endpoint). Hitting `https://www.starvingartistsgame.com/realtime/health` returns:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-12-18T19:00:00.000Z",
     "lobby": { "activeGames": 2, "activeConnections": 5, "lastBroadcastAt": "2025-12-18T18:59:50.000Z" },
     "game": { "activeGames": 1, "activeConnections": 4, "lastBroadcastAt": "2025-12-18T18:59:51.000Z" }
   }
   ```
   Use this from the browser’s console or any HTTP monitor to confirm the backend is reachable **after** the proxy is configured.
2. If the response hangs or you see `504`, Apache is not forwarding the request or the backend is down.

## 7. Diagnostic script
We added `docs/scripts/realtime-health-check.js` to walk through both websocket paths and report whether the `101 Switching Protocols` events happen.

### Usage
1. Ensure dependencies installed: from the repo root run `npm install`.
2. Run the script with either `--key=value` or `--key value` syntax:
   ```sh
   node docs/scripts/realtime-health-check.js --host www.starvingartistsgame.com --gameId game-1 --playerId player-1
   ```
   Pass `--protocol wss` to force TLS (default is `wss` already) and `--timeout` to override the linger.
3. Output will look like:
   ```
   [lobby] connecting to wss://www.../realtime/lobby?gameId=game-1&playerId=player-1
   [lobby] open (server sent 101 Switching Protocols)
   [game] open (server sent 101 Switching Protocols)
   ```
4. If either connection fails, the script prints the handshake error and exits with a non-zero code. That tells you whether Apache is permitting `Upgrade` + `Connection`.

### Additional testing
- Use `wscat` (or `npx wscat -c wss://www.starvingartistsgame.com/realtime/lobby?gameId=game-1&playerId=player-1`) to manually confirm the lobby socket opens. You should see `LOBBY_STATE` JSON immediately.
- Open Chrome DevTools > Network > WS and filter for `/realtime/lobby`. A `101` entry proves the proxy succeeded.
- Tail `/var/log/apache2/error_log` for proxy errors such as “(111) Connection refused” or “(400) Bad Request: Invalid WebSocket handshake”.

## 8. Recap
- The Apache proxy snippet ensures `wss://www.../realtime/...` gets forwarded to Node’s `/realtime` WebSocket servers with upgrades preserved.
- The `/realtime/health` endpoint + diagnostic script give you quick confirmation from the browser and from the shell.
- For a subdomain, proxy the entire subdomain and point the client’s websocket builder at `realtime.starvingartistsgame.com`.

Follow these steps to keep the shared host setup deterministic: every websocket handshake goes through Apache, every state change is served by the backend, and the health tooling makes it clear whether the webs servers are live before the client tries any actions.

## 9. Client environment overrides
1. Create a `client/.env` (or use `client/.env.example`) to override host destinations in development or production. The repository now ships the example:
   ```
   VITE_SITE_ORIGIN=https://www.starvingartistsgame.com
   VITE_REALTIME_URL=wss://realtime.starvingartistsgame.com
   ```
2. `VITE_SITE_ORIGIN` prefixes every `/lobby` HTTP request, so builds that run on other domains (e.g., a staging site) can still reach `www`’s lobby APIs.
3. `VITE_REALTIME_URL` provides the websocket base that `client/src/state/lobbyState.ts` uses when constructing `/realtime/lobby` and `/realtime/game` sockets. Pointing it at `wss://realtime.starvingartistsgame.com` keeps websockets on the dedicated subdomain regardless of where the SPA is served.
4. When you update the `.env`, rebuild the client (`npm --workspace client run build`) so the new variables are embedded in the compiled bundle.
