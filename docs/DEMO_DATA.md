# Sahyadri launch demo data

`scripts/seed-demo-sahyadri.ts` populates the database with a realistic Sahyadri-region
demo dataset so the app has real content on first open, ahead of the Sahyadri-community launch.

## What it creates

- 7 vendor accounts (`demo_vendor_*@trekktogether.dev`), several with bilingual
  Marathi/English bios
- 13 regular trekker accounts (`demo_user_*@trekktogether.dev`)
- 20 treks across real Sahyadri forts and trekking spots (Rajgad, Torna, Sinhagad,
  Rajmachi, Lohagad, Visapur, Harishchandragad, Kalsubai, Purandar, Korigad, Rohida,
  and more) — 15 vendor-organized (guided, priced), 5 peer-organized (free,
  trek-partner style)
- Follow relationships between trekkers and vendors, and between trekkers
- 17 posts (vendor + personal photo posts, plus one trek-partner post per peer trek),
  each with placeholder images
- Likes on those posts
- Join requests on the 5 peer treks, a majority already `accepted` ("joined")

Every account uses the same demo password: **`TrekkDemo2026!`**

## How to identify demo data

Every document this script writes — in every collection it touches (`users`, `treks`,
`posts`, `followedges`, `likes`, `joinrequests`) — is marked `isDemo: true`. That flag
is set nowhere else in the app; no real signup or app action can ever produce a
document with `isDemo: true`. Demo user emails are also namespaced under
`demo_vendor_*@trekktogether.dev` / `demo_user_*@trekktogether.dev` as a second,
human-readable marker.

## How to run it

```bash
cd backend
npm run seed:demo          # seeds the data (no-ops if demo data already exists)
```

Point `MONGO_URI` at whichever database you want to seed — your local dev DB or the
live production one — the same way the app itself picks it up (`.env`, or exported in
your shell). Running it twice without wiping in between is safe: it detects existing
demo data and does nothing rather than duplicating it.

## How to delete it later

```bash
npm run seed:demo:wipe
```

This runs `deleteMany({ isDemo: true })` against all six collections above and nothing
else — it cannot touch a document that doesn't already have `isDemo: true`, so real
accounts, treks, and content are untouched regardless of when you run it.

To reseed fresh content after a wipe, just run `npm run seed:demo` again. Or do both in
one step: `npm run seed:demo -- --reset`.

## Note on images

The seed script can't go through the real Supabase signed-upload flow, so trek/post/
avatar images are Lorem Picsum placeholder photos (`picsum.photos/seed/...` —
deterministic, always resolve, generic scenic/outdoor photography) stored as plain URLs
in the same fields a real upload would populate. They are not literal photographs of
each named fort.
