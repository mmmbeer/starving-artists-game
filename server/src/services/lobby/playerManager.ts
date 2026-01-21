// Player connection management service
import * as playerDb from '../database/playerDb';
import { Player } from '../models/types';

interface PlayerConnection {
  playerId: string;
  socketId: string;
  gameId: string;
  lastPing: number;
}

const connections = new Map<string, PlayerConnection>();
const PING_INTERVAL = 30000; // 30 seconds
const DISCONNECT_TIMEOUT = 60000; // 60 seconds

export function registerPlayer(
  socketId: string,
  playerId: string,
  gameId: string
): void {
  connections.set(socketId, {
    playerId,
    socketId,
    gameId,
    lastPing: Date.now(),
  });
  
  playerDb.updatePlayerConnection(playerId, true).catch(console.error);
}

export function unregisterPlayer(socketId: string): PlayerConnection | null {
  const connection = connections.get(socketId);
  if (!connection) return null;
  
  connections.delete(socketId);
  
  playerDb.updatePlayerConnection(connection.playerId, false).catch(console.error);
  
  return connection;
}

export function getPlayerConnection(socketId: string): PlayerConnection | null {
  return connections.get(socketId) || null;
}

export function getPlayerBySocketId(socketId: string): string | null {
  const connection = connections.get(socketId);
  return connection?.playerId || null;
}

export function getSocketIdByPlayer(playerId: string): string | null {
  for (const [socketId, conn] of connections.entries()) {
    if (conn.playerId === playerId) {
      return socketId;
    }
  }
  return null;
}

export function getGameConnections(gameId: string): PlayerConnection[] {
  const gameConnections: PlayerConnection[] = [];
  for (const conn of connections.values()) {
    if (conn.gameId === gameId) {
      gameConnections.push(conn);
    }
  }
  return gameConnections;
}

export function updatePing(socketId: string): void {
  const connection = connections.get(socketId);
  if (connection) {
    connection.lastPing = Date.now();
  }
}

export function getConnectedPlayers(gameId: string): string[] {
  const gameConnections = getGameConnections(gameId);
  return gameConnections.map(conn => conn.playerId);
}

export function isPlayerConnected(playerId: string): boolean {
  for (const conn of connections.values()) {
    if (conn.playerId === playerId) {
      const timeSinceLastPing = Date.now() - conn.lastPing;
      return timeSinceLastPing < DISCONNECT_TIMEOUT;
    }
  }
  return false;
}

// Cleanup disconnected players
setInterval(() => {
  const now = Date.now();
  const toRemove: string[] = [];
  
  for (const [socketId, conn] of connections.entries()) {
    const timeSinceLastPing = now - conn.lastPing;
    if (timeSinceLastPing > DISCONNECT_TIMEOUT) {
      toRemove.push(socketId);
    }
  }
  
  for (const socketId of toRemove) {
    unregisterPlayer(socketId);
  }
}, PING_INTERVAL);
