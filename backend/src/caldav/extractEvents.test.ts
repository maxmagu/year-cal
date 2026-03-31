import { describe, it, expect } from 'vitest';
import { parseEvents } from './extractEvents';

describe('parseEvents', () => {
  it('parses a plain JSON array', () => {
    const raw = JSON.stringify([
      { summary: 'Meeting', startDate: '2026-04-01', endDate: '2026-04-01', allDay: true },
    ]);
    const result = parseEvents(raw);
    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe('Meeting');
  });

  it('strips ```json ... ``` markdown fences', () => {
    const raw = '```json\n[{"summary":"Dinner","startDate":"2026-04-03","endDate":"2026-04-03","allDay":true}]\n```';
    const result = parseEvents(raw);
    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe('Dinner');
  });

  it('strips plain ``` ... ``` fences', () => {
    const raw = '```\n[{"summary":"Trip","startDate":"2026-05-01","endDate":"2026-05-05","allDay":true}]\n```';
    expect(parseEvents(raw)).toHaveLength(1);
  });

  it('returns [] for an empty array', () => {
    expect(parseEvents('[]')).toEqual([]);
  });

  it('returns [] when the response is not an array', () => {
    expect(parseEvents('{"summary":"oops"}')).toEqual([]);
  });

  it('returns [] on invalid JSON', () => {
    expect(parseEvents('not json at all')).toEqual([]);
  });
});
