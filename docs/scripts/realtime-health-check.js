#!/usr/bin/env node

const WebSocket = require('ws');

const parseArgs = () => {
  const args = { host: 'www.starvingartistsgame.com', protocol: 'wss', timeout: 5000, gameId: 'game-1', playerId: 'player-1' };
  const tokens = process.argv.slice(2);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const hasEquals = token.includes('=');
    let key;
    let value;

    if (hasEquals) {
      const [rawKey, rawValue] = token.slice(2).split('=');
      key = rawKey.trim();
      value = rawValue === undefined ? 'true' : rawValue.trim();
    } else {
      key = token.slice(2).trim();
      const nextToken = tokens[index + 1];
      if (nextToken && !nextToken.startsWith('--')) {
        value = nextToken.trim();
        index += 1;
      } else {
        value = 'true';
      }
    }

    if (!key) {
      continue;
    }
    if (key === 'timeout') {
      args.timeout = Number(value) || args.timeout;
      continue;
    }
    args[key] = value;
  }
  return args;
};

const buildUrl = ({ protocol, host, path, gameId, playerId }) => {
  const separator = path.includes('?') ? '&' : '?';
  return `${protocol}://${host}${path}${separator}gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}`;
};

const runCheck = async () => {
  const settings = parseArgs();
  const tests = [
    { label: 'lobby', path: '/realtime/lobby' },
    { label: 'game', path: '/realtime/game' }
  ];

  for (const test of tests) {
    const url = buildUrl({ ...settings, path: test.path });
    const scope = `[${test.label}]`;
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(url, {
        handshakeTimeout: settings.timeout
      });

      const cleanup = () => {
        socket.removeAllListeners();
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };

      const onError = (error) => {
        cleanup();
        console.error(`${scope} failed to connect:`, error.message || error);
        reject(error);
      };

      socket.once('open', () => {
        console.log(`${scope} open (server sent 101 Switching Protocols)`);
        cleanup();
        resolve();
      });

      socket.once('error', onError);
      socket.once('close', (code, reason) => {
        if (code === 1006) {
          // 1006 means the socket closed abnormally without open, so ensure error if not resolved yet.
          const err = new Error('Connection closed abnormally before open');
          onError(err);
        }
      });
    });
  }
};

runCheck().catch(() => {
  process.exitCode = 1;
});
