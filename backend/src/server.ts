import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config.js';
import { calendarsRouter } from './routes/calendars.js';
import { eventsRouter } from './routes/events.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function buildServer() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.use(calendarsRouter);
  app.use(eventsRouter);

  // In production, serve the built frontend from frontend/dist/.
  // In dev, Vite serves the frontend separately (no dist/ folder exists).
  const staticPath = join(__dirname, '../../frontend/dist');
  if (existsSync(staticPath)) {
    app.use(express.static(staticPath));
    // SPA fallback: return index.html for any non-API route.
    app.get('*', (_req, res) => {
      res.sendFile(join(staticPath, 'index.html'));
    });
  }

  return app;
}
