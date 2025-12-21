import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  host: string;
  user: string;
  port: number;
  password: string;
  database: string;
}

export interface RealtimeConfig {
  enableWebSocket: boolean;
  enableSocketIo: boolean;
  socketIoPath: string;
}

export interface AppConfig {
  port: number;
  database: DatabaseConfig;
  realtime: RealtimeConfig;
}

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback;
  }
  const normalized = value.toLowerCase();
  return normalized !== 'false' && normalized !== '0';
};

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PORT', 'DB_PASSWORD', 'DB_NAME'];

for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const getConfig = (): AppConfig => {
  const port = Number(process.env.PORT ?? 4000);
  if (Number.isNaN(port)) {
    throw new Error('PORT must be a valid number');
  }

  const realtime: RealtimeConfig = {
    enableWebSocket: parseBoolean(process.env.REALTIME_WSS_ENABLED, true),
    enableSocketIo: parseBoolean(process.env.REALTIME_SOCKET_IO_ENABLED, true),
    socketIoPath: process.env.REALTIME_SOCKET_IO_PATH ?? '/realtime/socket.io'
  };

  return {
    port,
    database: {
      host: process.env.DB_HOST!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
      port: Number(process.env.DB_PORT!),
      database: process.env.DB_NAME!
    },
    realtime
  };
};
