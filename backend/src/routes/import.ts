import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { extractEvents } from '../caldav/extractEvents';
import { config } from '../config';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export const importRouter = Router();

importRouter.get('/api/import', (_req, res) => {
  res.json({ configured: Boolean(config.anthropicKey) });
});

importRouter.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    const year = parseInt(req.body.year as string, 10) || new Date().getFullYear();
    const text = req.body.text as string | undefined;
    const file = req.file;

    if (!file && !text?.trim()) {
      res.status(400).json({ error: 'Provide a file or text' });
      return;
    }

    const events = await extractEvents({
      fileBuffer: file?.buffer,
      mimeType: file?.mimetype,
      text: text?.trim(),
      year,
    });

    res.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Import error:', message);
    res.status(500).json({ error: message });
  }
});

// Multer errors (e.g. LIMIT_FILE_SIZE) are passed via next(err), not thrown,
// so they must be caught by a 4-argument error-handling middleware.
// _next must be declared even though unused — Express uses function.length === 4
// to identify error middleware. Removing it silently breaks error routing.
importRouter.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large (max 10 MB)' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
