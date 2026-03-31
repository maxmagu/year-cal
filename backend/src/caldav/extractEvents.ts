import Anthropic from '@anthropic-ai/sdk';
import { PDFParse } from 'pdf-parse';
import sharp from 'sharp';
import { config } from '../config';
import type { ExtractedEvent } from '../types/index';

const client = new Anthropic({ apiKey: config.anthropicKey });

const SYSTEM_PROMPT = `You are a calendar event extractor. Given a document or image, extract all calendar events.
Return ONLY a valid JSON array. No explanation, no markdown fences, no preamble.
Each object in the array must have:
  summary: string (event title, required)
  description: string | undefined (optional notes)
  location: string | undefined (optional venue/place)
  startDate: string (YYYY-MM-DD for all-day events, or full ISO 8601 datetime for timed events)
  endDate: string (same format as startDate; if only a start is given, use the same date)
  allDay: boolean (true if no specific time is given)
If no events are found, return [].`;

function buildUserPrompt(year: number): string {
  return `Extract all calendar events. If a date has no year, assume ${year}. Return only the JSON array.`;
}

export function parseEvents(raw: string): ExtractedEvent[] {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed as ExtractedEvent[];
  } catch {
    return [];
  }
}

async function extractFromText(text: string, year: number): Promise<ExtractedEvent[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${buildUserPrompt(year)}\n\nDocument:\n${text}`,
      },
    ],
  });
  const raw = response.content[0].type === 'text' ? response.content[0].text : '[]';
  return parseEvents(raw);
}

// Anthropic base64 limit is 5 MB. base64 is ~4/3x raw size, so cap raw at 3.5 MB.
const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;

async function compressImage(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: 'image/jpeg' }> {
  const compressed = await sharp(buffer)
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return { buffer: compressed, mimeType: 'image/jpeg' };
}

async function extractFromImage(
  buffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
  year: number
): Promise<ExtractedEvent[]> {
  let imageBuffer = buffer;
  let imageMimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = mimeType;

  if (buffer.length > MAX_IMAGE_BYTES) {
    const result = await compressImage(buffer);
    imageBuffer = result.buffer;
    imageMimeType = result.mimeType;
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageMimeType,
              data: imageBuffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: buildUserPrompt(year),
          },
        ],
      },
    ],
  });
  const raw = response.content[0].type === 'text' ? response.content[0].text : '[]';
  return parseEvents(raw);
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function extractEvents(params: {
  fileBuffer?: Buffer;
  mimeType?: string;
  text?: string;
  year: number;
}): Promise<ExtractedEvent[]> {
  if (!config.anthropicKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to backend/.env to use the import feature.');
  }
  const { fileBuffer, mimeType, text, year } = params;

  if (fileBuffer && mimeType) {
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: fileBuffer });
      const pdf = await parser.getText();
      return extractFromText(pdf.text, year);
    }
    if (IMAGE_TYPES.has(mimeType)) {
      return extractFromImage(
        fileBuffer,
        mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        year
      );
    }
    return extractFromText(fileBuffer.toString('utf-8'), year);
  }

  if (text) {
    return extractFromText(text, year);
  }

  return [];
}
