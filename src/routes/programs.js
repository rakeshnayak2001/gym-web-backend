import { Router } from 'express';
import { z } from 'zod';
import { Program } from '../models/Program.js';
import { HttpError, parse } from '../lib/http.js';

const router = Router();

const exercise = z.object({
  id: z.string().max(60),
  name: z.string().max(120),
  muscle: z.string().max(60),
  gif_url: z.string().max(500).default(''),
  description1: z.string().max(600).default(''),
  description2: z.string().max(600).default(''),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.number().int().min(1).max(100).optional(),
});

const programSchema = z.object({
  name: z.string().trim().min(3, 'Give your program a name (3+ characters)').max(60),
  description: z.string().trim().max(240).optional(),
  days: z
    .array(z.object({ name: z.string().trim().min(1).max(40), exercises: z.array(exercise).max(30) }))
    .min(1, 'Add at least one day')
    .max(7),
});

const own = (req) => ({ _id: req.params.id, userId: req.user.userId });

router.get('/', async (req, res) => {
  res.json(await Program.find({ userId: req.user.userId }).sort({ updatedAt: -1 }));
});

router.post('/', async (req, res) => {
  const data = parse(programSchema, req.body);
  res.status(201).json(await Program.create({ ...data, userId: req.user.userId }));
});

router.get('/:id', async (req, res) => {
  const plan = await Program.findOne(own(req));
  if (!plan) throw new HttpError(404, 'Program not found');
  res.json(plan);
});

router.put('/:id', async (req, res) => {
  const data = parse(programSchema, req.body);
  const plan = await Program.findOneAndUpdate(own(req), data, { new: true, runValidators: true });
  if (!plan) throw new HttpError(404, 'Program not found');
  res.json(plan);
});

router.delete('/:id', async (req, res) => {
  const plan = await Program.findOneAndDelete(own(req));
  if (!plan) throw new HttpError(404, 'Program not found');
  res.status(204).end();
});

export default router;
