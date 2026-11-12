import { Router } from 'express';
import { z } from 'zod';
import { FoodLog } from '../models/FoodLog.js';
import { HttpError, dayRange, parse, todayIso } from '../lib/http.js';

const router = Router();
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const macro = z.number().min(0).max(10000);

const mealSchema = z.object({
  date: isoDay.optional(),
  meal: z.object({
    name: z.string().trim().max(80).optional(),
    foodName: z.string().trim().min(1).max(120),
    calories: macro,
    protein: macro,
    carbs: macro,
    fats: macro,
    mealTime: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
  }),
});

// GET /api/nutrition/logs?from=YYYY-MM-DD&to=YYYY-MM-DD  (defaults to today, range is inclusive)
router.get('/logs', async (req, res) => {
  const q = parse(z.object({ from: isoDay.optional(), to: isoDay.optional() }), req.query);
  const from = q.from ?? q.to ?? todayIso();
  const to = q.to ?? from;
  const { start } = dayRange(from);
  const { end } = dayRange(to);
  if (end <= start) throw new HttpError(400, 'The end date must not be before the start date');
  const logs = await FoodLog.find({ userId: req.user.userId, date: { $gte: start, $lt: end } }).sort({ date: 1 });
  res.json({ logs });
});

router.post('/logs', async (req, res) => {
  const { date, meal } = parse(mealSchema, req.body);
  const { start, end } = dayRange(date ?? todayIso());
  let log = await FoodLog.findOne({ userId: req.user.userId, date: { $gte: start, $lt: end } });
  log ??= new FoodLog({ userId: req.user.userId, date: start, meals: [] });
  log.meals.push({ ...meal, name: meal.name || meal.foodName });
  log.recalculate();
  await log.save();
  res.status(201).json({ log });
});

router.delete('/logs/:logId/meals/:mealId', async (req, res) => {
  const log = await FoodLog.findOne({ _id: req.params.logId, userId: req.user.userId });
  if (!log) throw new HttpError(404, 'Log not found');
  const meal = log.meals.id(req.params.mealId);
  if (!meal) throw new HttpError(404, 'Meal not found');
  meal.deleteOne();
  log.recalculate();
  await log.save();
  res.json({ log });
});

export default router;
