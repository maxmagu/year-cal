import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config({ path: resolve(__dirname, '../.env') });

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  appleId: requireEnv('APPLE_ID'),
  appPassword: requireEnv('APP_SPECIFIC_PASSWORD'),
  caldavUrl: 'https://caldav.icloud.com',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
