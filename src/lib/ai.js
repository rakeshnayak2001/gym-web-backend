import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';
import { HttpError } from './http.js';

let client = null;
function ai() {
  if (!config.geminiKey) throw new HttpError(503, 'AI features are not configured on the server (GEMINI_API_KEY missing).');
  client ??= new GoogleGenAI({ apiKey: config.geminiKey });
  return client;
}

export const COACH_SYSTEM = `You are Kinetiq Coach, an expert strength & conditioning coach and sports nutritionist.
Scope: training, exercise technique, gym equipment, programming, recovery, sleep, nutrition and general wellbeing.
If a request is outside that scope, briefly say you can only help with training, nutrition and recovery.
If the user shares a photo of gym equipment, identify it, explain setup and execution step by step, list the muscles it targets and common mistakes.
Never diagnose medical conditions; recommend a professional for pain, injury or medical questions.
Style: concise, warm, practical. Use short markdown sections, bullet lists and **bold** key cues. No filler.`;

/** Stream text chunks to an Express response as plain text. */
export async function streamText(res, { contents, systemInstruction, temperature = 0.7 }) {
  const stream = await ai().models.generateContentStream({
    model: config.geminiModel,
    contents,
    config: { systemInstruction, temperature },
  });
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  try {
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) res.write(text);
    }
  } catch (err) {
    // Headers are already sent, so we can't switch to a JSON error — tell the reader inline.
    console.error('[ai stream]', err?.message);
    res.write('\n\n_The response was interrupted. Please try again._');
  }
  res.end();
}

export async function generateJson({ contents, schema, systemInstruction }) {
  const response = await ai().models.generateContent({
    model: config.geminiModel,
    contents,
    config: {
      systemInstruction,
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
    },
  });
  try {
    return JSON.parse(response.text ?? '');
  } catch {
    throw new HttpError(502, 'The AI returned an unexpected response. Please try again.');
  }
}
