import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  host: string;
  user: string;
  port: number;
  password: string;
  database: string;
}

export interface AppConfig {
  port: number;
  database: DatabaseConfig;
}

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

  return {
    port,
    database: {
      host: process.env.DB_HOST!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
      port: Number(process.env.DB_PORT!),
      database: process.env.DB_NAME!
    }
  };
};
