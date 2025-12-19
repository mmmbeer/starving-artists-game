#!/usr/bin/env node

const WebSocket = require('ws');

const parseArgs = () => {
  const args = { host: 'www.starvingartistsgame.com', protocol: 'wss', timeout: 5000, gameId: 'game-1', playerId: 'player-1' };
  process.argv.slice(2).forEach((arg) => {
    if (!arg.startsWith('--')) {
      return;
    }
    const [rawKey, rawValue] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = rawValue === undefined ? 'true' : rawValue.trim();
    if (!key) {
      return;
    }
    if (key === 'timeout') {
      args.timeout = Number(value) || args.timeout;
      return;
    }
    args[key] = value;
  });
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
