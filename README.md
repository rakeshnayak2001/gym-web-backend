# Kinetiq — API

Express 5 + MongoDB API for Kinetiq: accounts, programs, nutrition logs, AI coaching (Gemini) and a gym finder (OpenStreetMap).

## Run locally

```bash
cp .env.example .env    # fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev             # watches files, http://localhost:8000
npm run dev:memory      # no database needed — throwaway in-memory MongoDB
npm test
```

## Endpoints

| Method | Path | Auth | |
| --- | --- | --- | --- |
| GET | `/health` | – | status + DB state |
| POST | `/api/auth/register` · `/api/auth/login` | – | returns `{ token, user }` |
| GET | `/api/auth/me` | ✓ | current user |
| PATCH | `/api/auth/account` | ✓ | name, email, password |
| GET / PUT | `/api/profile` | ✓ | body metrics → calorie & macro targets |
| CRUD | `/api/programs[/:id]` | ✓ | training programs |
| GET / POST | `/api/nutrition/logs` | ✓ | `?from=YYYY-MM-DD&to=YYYY-MM-DD` · log a meal |
| DELETE | `/api/nutrition/logs/:logId/meals/:mealId` | ✓ | remove a meal |
| POST | `/api/ai/coach` | ✓ | streaming chat (text/plain), optional image |
| POST | `/api/ai/meal-plan` | ✓ | streaming markdown meal plan |
| POST | `/api/ai/food-scan` | ✓ | structured macros from a photo |
| GET | `/api/gyms/nearby?lat&lng&radius` | ✓ | gyms from OpenStreetMap |

Existing collections (`accounts`, `workoutplans`, `foodlogs`) are unchanged, so old data keeps working. Old bcrypt hashes verify with bcryptjs.

## Deploy (Vercel)

`api/index.js` is the serverless entry and `vercel.json` routes everything to it. Set `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `GEMINI_API_KEY` and `NODE_ENV=production`.
