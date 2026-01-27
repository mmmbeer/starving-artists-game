// Environment configuration
import dotenv from 'dotenv';

// Try to load .env from server directory first, then root
dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });

export interface AppConfig {
  port: number;
  nodeEnv: string;
  sessionSecret: string;
  database: {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '8001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'starving-artists-secret-key-change-in-production',
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'starving_artists',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  },
};
