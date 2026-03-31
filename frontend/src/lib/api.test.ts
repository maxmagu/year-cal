import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

describe('api.importFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends FormData with text and year, returns extracted events', async () => {
    const events = [
      { summary: 'Team dinner', startDate: '2026-04-03', endDate: '2026-04-03', allDay: true },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ events }), { status: 200 })
    );

    const result = await api.importFile(null, 'Team dinner April 3', 2026);

    expect(result).toEqual(events);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/import');
    expect(init?.method).toBe('POST');
    const body = init?.body as FormData;
    expect(body.get('text')).toBe('Team dinner April 3');
    expect(body.get('year')).toBe('2026');
  });

  it('sends file in FormData when file is provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ events: [] }), { status: 200 })
    );
    const file = new File(['%PDF content'], 'invite.pdf', { type: 'application/pdf' });

    await api.importFile(file, '', 2026);

    const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    expect(body.get('file')).toBe(file);
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Extraction failed', { status: 500 })
    );

    await expect(api.importFile(null, 'some text', 2026)).rejects.toThrow('HTTP 500');
  });

  it('does not append empty text to FormData', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ events: [] }), { status: 200 })
    );
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });

    await api.importFile(file, '   ', 2026);

    const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    expect(body.get('text')).toBeNull();
  });
});
