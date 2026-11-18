# Deploying StagePass on Render (free)

StagePass ships as a single Docker image: the React frontend is built and served by the
FastAPI backend, so one Render **Web Service** runs the whole app. Data lives in MongoDB.

## 1. Create a free MongoDB (MongoDB Atlas M0)
1. Sign up at https://www.mongodb.com/cloud/atlas (free, no card for M0).
2. Create an **M0** cluster, add a database user, and under **Network Access** allow
   `0.0.0.0/0` (so Render can reach it).
3. Copy the **connection string** (`mongodb+srv://USER:PASS@cluster.../?retryWrites=true...`).
   This is your `MONGO_URL`.

## 2. Deploy on Render
1. Sign in at https://render.com with GitHub (free, no card).
2. **New → Web Service** → connect the `deosgracius/StagePass` repo → branch `main`.
   Render auto-detects the `Dockerfile` (Runtime: Docker). Instance type: **Free**.
   *(Or use **New → Blueprint** — Render reads `render.yaml` and pre-fills everything.)*
3. Set environment variables:

| Variable | Required | Value |
|---|---|---|
| `MONGO_URL` | ✅ | your Atlas connection string |
| `DB_NAME` | ✅ | `stagepass` |
| `JWT_SECRET` | ✅ | any long random string (the Blueprint auto-generates this) |
| `STRIPE_API_KEY` | ✅ (to boot) | a Stripe **test** key `sk_test_...` — never a live key |
| `REACT_APP_BACKEND_URL` | optional | your Render URL, e.g. `https://stagepass.onrender.com` (used for Stripe redirects) |
| `RESEND_API_KEY`, `SENDER_EMAIL` | optional | enable email notifications |
| `CORS_ORIGINS` | optional | `*` (default) |

4. **Create Web Service.** First build takes a few minutes (Docker build + MongoDB seed).

## Notes
- The app **will not start** without `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, and `STRIPE_API_KEY`
  — they are read at startup in `server.py`.
- Use **Stripe test keys only**. A test key lets the whole app run; checkout uses Stripe's
  test mode (no real charges).
- Render's free tier sleeps after ~15 min idle (~30–60 s cold start) and has **no persistent
  disk**, so uploaded images (`backend/uploads`) are ephemeral. For durable uploads, wire the
  S3 (boto3) path or a Render disk later.
- Local dev is unchanged: run the backend with `uvicorn server:app --reload` and the frontend
  with `yarn start`; the frontend proxies `/api` to the backend.
