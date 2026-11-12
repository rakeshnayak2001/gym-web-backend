import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { HttpError, parse } from '../lib/http.js';

const router = Router();
const ROUNDS = 12;

const email = z.email('Enter a valid email').max(120).transform((v) => v.toLowerCase().trim());
const password = z.string().min(8, 'Use at least 8 characters').max(128);
const name = z.string().trim().min(2, 'Name is too short').max(60);

router.post('/register', async (req, res) => {
  const data = parse(z.object({ name, email, password }), req.body);
  if (await User.exists({ email: data.email })) throw new HttpError(409, 'That email is already registered');
  const user = await User.create({ ...data, password: await bcrypt.hash(data.password, ROUNDS) });
  res.status(201).json({ token: signToken(user), user: user.toPublic() });
});

router.post('/login', async (req, res) => {
  const data = parse(z.object({ email, password: z.string().min(1).max(128) }), req.body);
  const user = await User.findOne({ email: data.email }).select('+password');
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  if (!user || !(await bcrypt.compare(data.password, user.password))) {
    throw new HttpError(401, 'Email or password is incorrect');
  }
  res.json({ token: signToken(user), user: user.toPublic() });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  res.json({ user: user.toPublic() });
});

const accountSchema = z
  .object({
    name: name.optional(),
    email: email.optional(),
    currentPassword: z.string().max(128).optional(),
    newPassword: password.optional(),
  })
  .refine((d) => !d.newPassword || d.currentPassword, {
    message: 'Current password is required',
    path: ['currentPassword'],
  });

router.patch('/account', requireAuth, async (req, res) => {
  const data = parse(accountSchema, req.body);
  const user = await User.findById(req.user.userId).select('+password');
  if (!user) throw new HttpError(404, 'Account not found');

  if (data.newPassword) {
    const ok = await bcrypt.compare(data.currentPassword, user.password);
    if (!ok) throw new HttpError(401, 'Current password is incorrect');
    user.password = await bcrypt.hash(data.newPassword, ROUNDS);
  }
  if (data.email && data.email !== user.email) {
    const taken = await User.exists({ email: data.email, _id: { $ne: user._id } });
    if (taken) throw new HttpError(409, 'That email is already registered');
    user.email = data.email;
  }
  if (data.name) user.name = data.name;
  await user.save();
  res.json({ token: signToken(user), user: user.toPublic() });
});

export default router;
