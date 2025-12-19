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

### 4.1. Preferred method: Apache VirtualHost snippet
1. In WHM/cPanel’s **Apache Configuration > Include Editor**, add the following inside the specific VirtualHost for `www.starvingartistsgame.com`. If WHM lacks the UI, upload the snippet to `/etc/apache2/conf.d/includes/pre_virtualhost_global.conf` or similar according to your host’s instructions.
2. Insert these directives inside the VirtualHost block that serves `www.starvingartistsgame.com`:
   ```apache
   ProxyPreserveHost On
   ProxyPass "/lobby"  "http://127.0.0.1:4000/lobby"  retry=0
   ProxyPassReverse "/lobby"  "http://127.0.0.1:4000/lobby"

   ProxyPass "/realtime/lobby"  "ws://127.0.0.1:4000/realtime/lobby"  retry=0
   ProxyPassReverse "/realtime/lobby"  "ws://127.0.0.1:4000/realtime/lobby"

   ProxyPass "/realtime/game"  "ws://127.0.0.1:4000/realtime/game"  retry=0
   ProxyPassReverse "/realtime/game"  "ws://127.0.0.1:4000/realtime/game"
   ```
3. Ensure a `ProxyPass` is only used for websocket paths; do **not** open a wildcard `ProxyPass /realtime http://...` because Apache will attempt HTTP/1.1 for all of them and break the `Upgrade`.
4. The `mod_proxy_wstunnel` module automatically handles the `Upgrade` and `Connection` headers. If you must do it in `.htaccess` (rare on shared hosts), the snippet would look like:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTP:Upgrade} =websocket [NC]
   RewriteRule ^realtime/(.*)$ ws://127.0.0.1:4000/realtime/$1 [P,L]
   RewriteCond %{HTTP:Upgrade} !=websocket [NC]
   RewriteRule ^realtime/(.*)$ http://127.0.0.1:4000/realtime/$1 [P,L]
   ```
   That still needs `mod_proxy`/`mod_proxy_wstunnel` enabled, and `.htaccess` proxying can be disabled by hosts, so prefer the include snippet.
5. Reload Apache from WHM’s **Restart Services > HTTP Server (Apache)** or via SSH (`apachectl graceful`).
6. Verify `apachectl -M | grep proxy` shows `proxy_module`, `proxy_http_module`, and `proxy_wstunnel_module`.

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
   ```
4. On the client side you must now point websocket connections to `wss://realtime.starvingartistsgame.com/realtime/...`. Update `client/src/state/lobbyState.ts` to build URLs using a configurable host (e.g., via `import.meta.env.VITE_REALTIME_HOST` or a runtime variable) so the page keeps using `www` for HTTP but `realtime.` for websockets.

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
