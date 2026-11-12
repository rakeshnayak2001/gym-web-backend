import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTargets } from '../src/lib/nutrition.js';
import { dayRange } from '../src/lib/http.js';

process.env.JWT_SECRET ??= 'test-secret';
const { createApp } = await import('../src/app.js');

test('macro targets add up to the calorie target', () => {
  const t = calculateTargets({
    weight: 80, height: 180, age: 30, gender: 'male',
    activityLevel: 'moderately active', dietType: 'non-vegetarian', fitnessGoals: ['muscle gain'],
  });
  const kcal = t.dailyProteinNeeds * 4 + t.dailyCarbsNeeds * 4 + t.dailyFatsNeeds * 9;
  assert.ok(Math.abs(kcal - t.dailyCalorieNeeds) < 15, `${kcal} vs ${t.dailyCalorieNeeds}`);
  assert.equal(t.dailyProteinNeeds, 176);
});

test('toGyms normalizes, sanitizes links, dedupes and sorts by distance', async () => {
  const { toGyms } = await import('../src/routes/gyms.js');
  const gyms = toGyms(
    [
      { type: 'way', id: 2, center: { lat: 51.52, lon: -0.12 }, tags: { name: 'Far Gym', website: 'javascript:alert(1)' } },
      { type: 'node', id: 1, lat: 51.508, lon: -0.128, tags: { name: 'Near Gym', website: 'https://near.example', opening_hours: '24/7' } },
      { type: 'node', id: 3, lat: 51.508, lon: -0.128, tags: { name: 'near gym' } },
      { type: 'node', id: 4, tags: { name: 'No coords' } },
    ],
    51.5072,
    -0.1276,
  );
  assert.deepEqual(gyms.map((g) => g.name), ['Near Gym', 'Far Gym']);
  assert.equal(gyms[0].website, 'https://near.example');
  assert.equal(gyms[1].website, null);
  assert.ok(gyms[0].distanceKm < gyms[1].distanceKm);
});

test('dayRange spans exactly one UTC day', () => {
  const { start, end } = dayRange('2026-03-01');
  assert.equal(start.toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(end - start, 86_400_000);
  assert.throws(() => dayRange('nope'));
});

test('HTTP: health, auth guard and validation', async (t) => {
  const server = createApp().listen(0);
  t.after(() => server.close());
  const base = `http://localhost:${server.address().port}`;

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);

  const guarded = await fetch(`${base}/api/programs`);
  assert.equal(guarded.status, 401);

  const bad = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'A', email: 'x', password: '1' }),
  });
  assert.equal(bad.status, 400);
  const body = await bad.json();
  assert.ok(body.errors.name && body.errors.email && body.errors.password);

  const missing = await fetch(`${base}/nope`);
  assert.equal(missing.status, 404);
});
