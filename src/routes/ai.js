import { Router } from 'express';
import { z } from 'zod';
import { COACH_SYSTEM, generateJson, streamText } from '../lib/ai.js';
import { parse } from '../lib/http.js';

const router = Router();

const image = z.object({
  data: z.string().min(16).max(8_000_000), // base64, no data: prefix
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
});

const imagePart = (img) => ({ inlineData: { data: img.data, mimeType: img.mimeType } });

// POST /api/ai/coach — streaming chat with optional photo on the last turn.
const coachSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'model']), content: z.string().max(6000) }))
    .min(1)
    .max(40),
  image: image.optional(),
});

router.post('/coach', async (req, res) => {
  const { messages, image: img } = parse(coachSchema, req.body);
  const contents = messages.map((m, i) => {
    const parts = [{ text: m.content || 'What is this and how do I use it?' }];
    if (img && i === messages.length - 1 && m.role === 'user') parts.unshift(imagePart(img));
    return { role: m.role, parts };
  });
  await streamText(res, { contents, systemInstruction: COACH_SYSTEM });
});

// POST /api/ai/meal-plan — streaming markdown meal plan for given targets.
const mealPlanSchema = z.object({
  calories: z.number().min(800).max(7000),
  protein: z.number().min(10).max(500),
  carbs: z.number().min(0).max(1200),
  fats: z.number().min(0).max(400),
  goal: z.enum(['lose', 'maintain', 'gain']),
  diet: z.enum(['vegetarian', 'non-vegetarian', 'vegan']),
  meals: z.number().int().min(2).max(6).default(4),
  cuisine: z.string().trim().max(40).optional(),
  avoid: z.string().trim().max(200).optional(),
});

router.post('/meal-plan', async (req, res) => {
  const p = parse(mealPlanSchema, req.body);
  const prompt = `Create a one-day ${p.diet} meal plan with ${p.meals} meals.
Targets: ${p.calories} kcal, ${p.protein} g protein, ${p.carbs} g carbs, ${p.fats} g fat. Goal: ${p.goal} weight.
${p.cuisine ? `Cuisine preference: ${p.cuisine}.` : ''}
${p.avoid ? `Avoid: ${p.avoid}.` : ''}

Format in markdown:
## Overview (one sentence on the strategy)
Then for each meal: "### <Meal name> · <time>" followed by a bullet list of foods with gram portions, and a final line "**≈ X kcal · P g / C g / F g**".
## Swaps (3 bullets of easy substitutions)
## Prep tips (3 bullets)
Keep totals within 5% of the targets. Be practical and use common grocery items.`;
  await streamText(res, { contents: prompt, systemInstruction: COACH_SYSTEM, temperature: 0.8 });
});

// POST /api/ai/food-scan — structured macro estimate from a meal photo.
const scanSchema = z.object({ image, note: z.string().max(200).optional() });

const scanJsonSchema = {
  type: 'object',
  properties: {
    isFood: { type: 'boolean' },
    foodName: { type: 'string', description: 'Short dish name' },
    portion: { type: 'string', description: 'Estimated portion, e.g. "1 bowl (~350 g)"' },
    calories: { type: 'number' },
    protein: { type: 'number' },
    carbs: { type: 'number' },
    fats: { type: 'number' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, calories: { type: 'number' } },
        required: ['name', 'calories'],
      },
    },
    tip: { type: 'string', description: 'One short, practical nutrition tip about this meal' },
  },
  required: ['isFood', 'foodName', 'calories', 'protein', 'carbs', 'fats', 'confidence', 'items'],
};

router.post('/food-scan', async (req, res) => {
  const { image: img, note } = parse(scanSchema, req.body);
  const result = await generateJson({
    schema: scanJsonSchema,
    systemInstruction:
      'You are a registered dietitian estimating nutrition from photos. Estimate realistic portion sizes. Macros in grams, energy in kcal, rounded to whole numbers. If the image is not food, set isFood=false and zeros.',
    contents: [
      {
        role: 'user',
        parts: [imagePart(img), { text: `Estimate the nutrition for this meal.${note ? ` Context from user: ${note}` : ''}` }],
      },
    ],
  });
  res.json(result);
});

export default router;
