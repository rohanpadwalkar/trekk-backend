# Trekk Together — Backend

NestJS backend implementing `docs/10-backend-design.md`. MongoDB + Redis are external (you bring your own), object storage is S3-compatible (Supabase Storage by default, or Cloudflare R2 / self-hosted MinIO / real AWS S3 — same code, different env vars).

## Local development

Two ways to run it locally, depending on whether you want to use your real external Mongo/Redis/Supabase or a fully offline setup:

**Against your real external services** (recommended — this is what mirrors production):

```bash
# fill in the TODO values in .env with your real Mongo/Redis/Supabase credentials
docker compose up --build
```

**Fully offline** (local Mongo/Redis/MinIO containers, no external accounts needed):

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Either way, once it's up:

```bash
npm run seed   # optional — creates one demo vendor + one trek
curl http://localhost:3000/api/v1/health   # → { status: "ok" }
```

## Deploying: Vercel + MongoDB Atlas + Upstash Redis + Supabase Storage

Vercel deploys NestJS with **zero configuration**: it auto-detects `src/main.ts` as the entrypoint and runs the whole app as a single Vercel Function on [Fluid Compute](https://vercel.com/docs/fluid-compute) (the default runtime for new projects since April 2025) — a warm, long-lived process, not a fresh one-shot invocation per request. That matters for two things people usually assume don't work on "serverless":

- **WebSockets work.** Fluid Compute Functions natively support WebSocket connections, including Socket.IO. The chat gateway (`messaging/messaging.gateway.ts`) needs no changes. One connection pins to one Function instance for its lifetime; new connections aren't guaranteed to land on the same instance, which is exactly why `@socket.io/redis-adapter` is still wired up (see "Redis" below) — it's what makes a message sent from instance A reach a socket connected to instance B.
- **The Mongo connection is reused correctly without any special code.** Because the whole app is one warm process, not per-request cold starts, Nest's `MongooseModule` connection is already a singleton for the life of that process — the same effect people usually have to hand-roll as a "cache the connection on a global" pattern elsewhere.

Mobile client note for the socket connection: Socket.IO defaults to an HTTP long-polling handshake before upgrading, which doesn't work reliably across auto-scaled Function instances — the client must set `transports: ['websocket']` to skip straight to a WebSocket. The connection path stays the default (`/socket.io`); this backend isn't scoped under an `/api/*` sub-path, so no path override is needed.

### 1. Object storage: Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (free tier: 1GB storage, 50MB max file size — fine for trek/profile photos; note free projects **auto-pause after 7 days of inactivity**, which would break image loading until manually resumed — keep an eye on this once real users depend on it).
2. In the dashboard: **Storage → Settings → S3 Connection** — enable it, then generate an **access key ID + secret access key** (these are separate from your Supabase API keys).
3. Note your **project ref** (the subdomain in your project URL) and **project region** — both shown on the same settings page.
4. Create the 5 buckets this app needs, either in **Storage → New bucket** or via the S3 API once connected: `avatars`, `trek-images`, `post-images`, `chat-attachments`, `kyc-documents`.
5. Set the first 4 buckets **public**, and leave `kyc-documents` **private** — this matches the docker-compose MinIO setup's policy (KYC documents are only ever read via short-lived signed URLs, never a public link). Bucket visibility is a toggle when creating/editing each bucket in the dashboard.
6. Fill in `.env`:
   ```
   S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
   S3_REGION=<project-region>
   S3_ACCESS_KEY_ID=<the access key id from step 2>
   S3_SECRET_ACCESS_KEY=<the secret from step 2>
   S3_FORCE_PATH_STYLE=true
   S3_PUBLIC_URL=https://<project-ref>.supabase.co/storage/v1/object/public
   ```

The storage layer (`storage/storage.service.ts`) uses the AWS SDK v3 rather than a MinIO-specific client, specifically because Supabase's S3 endpoint has a path component that only a path-style-aware S3 client handles correctly — this also means the exact same code works unchanged against Cloudflare R2 or self-hosted MinIO later, just by changing these env vars.

### 2. MongoDB Atlas

Create a free **M0** cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas) (already a replica set — required, since this app uses multi-document transactions for atomic seat booking in `bookings/bookings.service.ts`, and Mongo only supports transactions on a replica set). Under **Network Access**, allow `0.0.0.0/0` (Vercel Functions don't have static outbound IPs on the free/Hobby tier, so you can't allowlist a specific range — see "Static IPs" in Vercel's docs if you need to tighten this later on a paid plan). Copy the connection string from **Connect → Drivers** into `MONGO_URI`.

### 3. Upstash Redis

Create a free database at [upstash.com](https://upstash.com) (choose the **Global** or a region close to your Vercel deployment region for lower latency). From its dashboard, grab **both** connection strings — the REST API details (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) and the standard TLS/TCP one (`REDIS_URL`, `rediss://...`) — see `.env.example` for why this app needs both.

### 4. Deploy to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. [vercel.com/new](https://vercel.com/new) → import your repo.
3. Since this backend lives in a `backend/` subdirectory of a larger repo, set **Root Directory** to `backend` in the project's Build & Deployment settings (same idea as Render's Root Directory).
4. Leave **Framework Preset** on its auto-detected value (NestJS) — don't add a `vercel.json` that sets `"framework": null`, which disables that auto-detection.
5. Add every variable from `.env` under **Settings → Environment Variables** (`MONGO_URI`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, the `S3_*` ones, etc.). Set `CORS_ORIGIN` to your actual app origin(s).
6. **Deploy**. Future pushes to your connected branch auto-deploy; every PR gets its own preview deployment against the same external services (point Preview and Production at separate Atlas/Upstash/Supabase projects if you want isolated data — optional, not required to ship).

**`vercel.json` and `api/index.ts` ARE required** — an earlier version of this doc claimed Vercel's zero-config NestJS detection picks up `src/main.ts` directly. That doesn't hold up in practice: `src/main.ts` calls `app.listen()`, which starts a real TCP server — not the shape of function Vercel's Node runtime invokes per-request — and with no `vercel.json` rewrite, Vercel only routes exact `/api/*` file matches, not sub-paths, so nested requests like `/api/docs/swagger-ui.css` 404 (as `application/json`, Vercel's own platform 404, not this app's).

What's actually in this repo to make it work:
- `api/index.ts` — the real Vercel entrypoint. Bootstraps Nest with `ExpressAdapter` once per cold start (cached across warm invocations) and exports a plain `(req, res)` handler — no `.listen()`, since Vercel owns the request lifecycle.
- `src/create-app.ts` — the app configuration (helmet, CORS, validation pipe, exception filter, Swagger mount) shared between `src/main.ts` (local/Docker/Render — still calls `.listen()` and wires up the Socket.IO Redis adapter) and `api/index.ts` (Vercel — neither of those, see below).
- `vercel.json` — a catch-all rewrite (`"/(.*)" → "/api"`) so every path, not just literal `/api/*` files, reaches the one function.

**WebSocket messaging does not work on Vercel.** `MessagingGateway` still loads (no code path removed it), but a serverless function can't hold the persistent connection Socket.IO needs, and `api/index.ts` deliberately skips the Redis adapter setup `main.ts` does. Real-time chat requires a persistent host — Render, a VM, etc. — not Vercel serverless. Everything else (all REST endpoints, auth, uploads, Swagger) works fine on Vercel.

The Hobby plan's function duration is already 300s by default *and* max, so there's nothing to raise there even for the slowest realistic request in this app (ordinary Mongo CRUD, none of it close to that).

There's one hard platform ceiling worth knowing regardless of plan: **Vercel Functions cap request/response bodies at 4.5MB.** This app is already built around that — file uploads go straight from the mobile app to Supabase Storage via a presigned URL (`POST /uploads/presign`), never through this backend — so it isn't a practical limit for anything this app does today.

**Alternative: Render.** `render.yaml` and the Docker-based deploy path from an earlier version of this doc still work unchanged if you'd rather run this as a persistent server instead of on Vercel — see git history for those steps, or ask and they can be restored here. Render is also the only option here if you need WebSocket chat to actually work. Nothing about the Vercel-specific code above (Upstash REST fallback, Swagger mount) breaks that path; RedisService/RedisThrottlerStorage just fall back to plain `ioredis` against `REDIS_URL` when the Upstash REST vars aren't set.

## Environment variables

See `.env.example` for the full list with comments.

## API docs

Swagger/OpenAPI UI is served at `/api/docs` (outside the `/api/v1` prefix — e.g. `https://your-deployment.vercel.app/api/docs`), generated from every controller/DTO via the `@nestjs/swagger` CLI plugin (`nest-cli.json`), so route shapes, request/response DTOs, and auth requirements stay in sync with the code without hand-written annotations. Click **Authorize** and paste an access token from `/auth/login` or `/auth/signup` to try authenticated routes directly from the UI.

## What's implemented

Every endpoint in `docs/10-backend-design.md` Section 2, the full MongoDB schema in Section 1, the JWT + OAuth + role auth design in Section 3, and the Redis/storage integration points in Section 4 (storage is now S3-compatible generically rather than MinIO-specific — see "Deploying" above). See that doc for the full design rationale — this README covers running and deploying it, not re-explaining the design.

Notable production-readiness details actually in the code, not just the doc:

- **Refresh token rotation with reuse detection** (`auth/auth.service.ts`) — covered by unit tests in `auth/auth.service.spec.ts` (run `npx jest`), including the theft scenario where replaying an already-rotated token revokes the entire session family.
- **Atomic seat booking** (`bookings/bookings.service.ts` + `treks/treks.service.ts#decrementSeats`) — a Mongo transaction wraps the seat decrement (itself an atomic conditional `findOneAndUpdate` with `seatsLeft: { $gt: 0 }`) and the booking document creation, so a race on the last seat can't create a booking without a seat or decrement without a booking.
- **Presigned S3-compatible uploads** (`storage/storage.service.ts`, `uploads/`) — image bytes never pass through the Node process. Checksum behavior is pinned to `WHEN_REQUIRED` because newer AWS SDK versions default to attaching a checksum header that non-AWS providers can reject as a signature mismatch — verified in `scripts/smoke-storage.ts`.
- **Redis-backed rate limiting** (`redis/throttler-storage.redis.ts`) — verified against a real Redis instance in `scripts/smoke-redis.ts`.
- **Global validation + error envelope** (`main.ts`, `common/filters/http-exception.filter.ts`) — every 4xx/5xx comes back as `{ statusCode, message, error, timestamp, path }`.
- **passwordHash never serializes** — enforced at the schema level (`database/schemas/user.schema.ts` `toJSON` transform), not left to each controller to remember.
- **Dependency-free health check** (`health/health.controller.ts`) — exists specifically so Render (or any host) can health-check the process itself without that check failing due to a slow Mongo/Redis connection.

## Verifying it yourself

This was built and type-checked (`npm run build`, zero errors) and the DI/module wiring was verified by booting the compiled app against a real local Redis and a deliberately-unreachable Mongo — every module (Config, Mongoose, Redis, Storage, Throttler, all feature modules) initializes cleanly; the only failure is the expected Mongo connection refusal, with NestJS's built-in retry logic visibly kicking in. The sandbox this was built in doesn't have outbound access to Docker Hub, MongoDB's download hosts, or Supabase, so the actual `docker compose up` end-to-end run and a real Supabase upload need to happen where you have real network access — a smoke-test checklist for that is below.

### Smoke-test checklist (run after deploying, or after `docker compose up` locally)

```bash
BASE=http://localhost:3000/api/v1   # or your Vercel deployment URL

# 0. Health
curl $BASE/health

# 1. Signup
curl -X POST $BASE/auth/signup -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","roles":["trekker","vendor"]}'
# → { user, accessToken, refreshToken }

# 2. Create a vendor trek (use accessToken from step 1)
curl -X POST $BASE/treks -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"title":"Test Trek","location":"Test","organizerType":"vendor","difficulty":"Easy","durationDays":1,"totalSeats":10,"dateStart":"2026-12-01","dateEnd":"2026-12-01"}'

# 3. List treks (public, cached in Redis for 60s)
curl $BASE/treks

# 4. Book it
curl -X POST $BASE/bookings -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"trekId":"<id from step 2>"}'

# 5. Refresh
curl -X POST $BASE/auth/refresh -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken from step 1>"}'

# 6. Presigned upload (confirms the Supabase/S3 wiring)
curl -X POST $BASE/uploads/presign -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"contentType":"image/jpeg","purpose":"avatar"}'
# → { uploadUrl, key } — then: curl -X PUT "<uploadUrl>" -H 'Content-Type: image/jpeg' --data-binary @/path/to/photo.jpg
```

If all 6 come back as expected, the stack is healthy end to end.

## Project structure

```
src/
  auth/            signup, login, OAuth, refresh rotation, sessions
  users/            + vendors.controller.ts, KYC, field notes
  uploads/          presigned upload endpoint
  storage/          generic S3-compatible client (Supabase/R2/MinIO/AWS)
  treks/            listings, Redis-cached discovery feed
  bookings/         atomic seat booking + cancellation
  reviews/          polymorphic trek/user reviews
  follows/          follow graph
  posts/            photo feed, likes
  join-requests/    peer-trek "Request to Join" flow (closes frontend gap #1)
  messaging/        conversations, messages, Socket.IO gateway
  notifications/    inbox
  health/           dependency-free health check (for Render et al.)
  database/schemas/ every Mongoose schema, one file each
  redis/            infrastructure service + rate-limit storage
  common/           guards, decorators, global exception filter
scripts/
  smoke-redis.ts    standalone Redis cache + rate-limit verification
  smoke-storage.ts  standalone presigned-URL verification
```
