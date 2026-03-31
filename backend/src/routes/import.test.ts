import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { buildServer } from '../server';

vi.mock('../caldav/extractEvents', () => ({
  extractEvents: vi.fn(),
}));

// Import after mock is set up
import { extractEvents } from '../caldav/extractEvents';
const mockExtractEvents = vi.mocked(extractEvents);

const app = buildServer();

describe('POST /api/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when neither file nor text is provided', async () => {
    const res = await request(app)
      .post('/api/import')
      .field('year', '2026');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/provide a file or text/i);
  });

  it('returns extracted events when text is provided', async () => {
    const events = [
      { summary: 'Team offsite', startDate: '2026-03-14', endDate: '2026-03-16', allDay: true },
    ];
    mockExtractEvents.mockResolvedValueOnce(events);

    const res = await request(app)
      .post('/api/import')
      .field('text', 'Team offsite March 14-16')
      .field('year', '2026');

    expect(res.status).toBe(200);
    expect(res.body.events).toEqual(events);
    expect(mockExtractEvents).toHaveBeenCalledWith({
      fileBuffer: undefined,
      mimeType: undefined,
      text: 'Team offsite March 14-16',
      year: 2026,
    });
  });

  it('defaults year to current year when omitted', async () => {
    mockExtractEvents.mockResolvedValueOnce([]);

    await request(app)
      .post('/api/import')
      .field('text', 'some text');

    expect(mockExtractEvents).toHaveBeenCalledWith(
      expect.objectContaining({ year: new Date().getFullYear() })
    );
  });

  it('returns 500 when extraction throws', async () => {
    mockExtractEvents.mockRejectedValueOnce(new Error('Anthropic error'));

    const res = await request(app)
      .post('/api/import')
      .field('text', 'some text')
      .field('year', '2026');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Extraction failed');
  });

  it('calls extractEvents with fileBuffer and mimeType when a file is uploaded', async () => {
    mockExtractEvents.mockResolvedValueOnce([]);
    const fileContent = Buffer.from('fake pdf content');

    const res = await request(app)
      .post('/api/import')
      .attach('file', fileContent, { filename: 'invite.pdf', contentType: 'application/pdf' })
      .field('year', '2026');

    expect(res.status).toBe(200);
    expect(mockExtractEvents).toHaveBeenCalledWith({
      fileBuffer: fileContent,
      mimeType: 'application/pdf',
      text: undefined,
      year: 2026,
    });
  });

  it('returns 413 when uploaded file exceeds size limit', async () => {
    // Create a buffer just over 10 MB
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1);

    const res = await request(app)
      .post('/api/import')
      .attach('file', oversized, { filename: 'huge.pdf', contentType: 'application/pdf' })
      .field('year', '2026');

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/file too large/i);
  });
});
