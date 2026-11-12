import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { HttpError, parse } from '../lib/http.js';
import { calculateTargets } from '../lib/nutrition.js';

const router = Router();

const metricsSchema = z.object({
  weight: z.number().min(25).max(350).optional(),
  height: z.number().min(100).max(250).optional(),
  age: z.number().int().min(13).max(100).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  activityLevel: z
    .enum(['sedentary', 'lightly active', 'moderately active', 'very active', 'extremely active'])
    .optional(),
  dietType: z.enum(['vegetarian', 'non-vegetarian', 'vegan']).optional(),
  fitnessGoals: z
    .array(z.enum(['weight loss', 'weight maintenance', 'muscle gain', 'endurance', 'mobility']))
    .max(5)
    .optional(),
});

router.get('/', async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) throw new HttpError(404, 'Account not found');
  res.json({ user: user.toPublic() });
});

router.put('/', async (req, res) => {
  const data = parse(metricsSchema, req.body);
  const user = await User.findById(req.user.userId);
  if (!user) throw new HttpError(404, 'Account not found');
  Object.assign(user, data);
  if (user.weight && user.height && user.age) Object.assign(user, calculateTargets(user));
  await user.save();
  res.json({ user: user.toPublic() });
});

export default router;
