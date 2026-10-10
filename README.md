# Next Role — Find work that fits

Upload a resume, get the job roles that actually fit it — with the exact skills
each role requires and a match score against your experience.

Built with **React + TypeScript + Tailwind CSS** on the front end and
**Node + Express + MongoDB** on the back end, with an offline matcher that can
be upgraded to **Grok (xAI)** AI analysis and **Google OAuth** when keys are
configured. Every piece of app data — copy, skill catalogue, role library —
lives in a single file: [`nextrole.json`](./nextrole.json).

## What it does

- **Reads any resume, even scans.** Three extraction engines run in order:
  pdf-parse → pdf.js 3 → **Tesseract OCR**. A photographed/scanned PDF with no
  text layer is rendered page-by-page and read with real text recognition, so
  "image-only" resumes still produce matches.
- **Smart matching without any API key.** Skill detection normalises real-world
  spellings (`ReactJS`, `Node JS`, `k8s`, `postgres`, `HTML5`...), reads
  title signals ("front end developer", "DevOps", "nurse"...) and experience
  length, then ranks the 30-role library. Grok upgrades the same flow to
  AI-generated matches when `GROK_API_KEY` is set.
- **Explore roles section.** Search the library, see your match % on every card
  (matched roles float to the top), and pick any role from the selector to see
  the full required-skills checklist — including which skills you already have.
- **Three sections.** `Home` (the landing interface), `Explore roles`
  (the library), `Your profile` (saved analyses).
- **Secured accounts.** Email + password sign-up/sign-in (passwords hashed
  with scrypt), optional Google OAuth, JWT sessions. Works with MongoDB when
  configured and falls back to a file store inside `nextrole.json` — no
  database needed to run.
- **Desktop app.** Electron wrapper that starts the bundled server and opens
  the app in its own window (see below).

## Getting started

```bash
npm install          # installs root, client and server dependencies
cp .env.example .env # optional: Google / Grok / Mongo keys
npm run dev          # API on http://localhost:4000, UI on http://localhost:5173
```

Production (single server — UI and API from one process):

```bash
npm run build
npm start            # http://localhost:4000 serves everything
```

### Desktop app

```bash
npm run build        # once, to produce client/dist and server/dist
npm run desktop      # opens Next Role as a desktop app
```

Package a portable Windows build (folder with `Next Role.exe`, no installer,
no signing needed):

```bash
npm run package:win  # output in release/
```

## Environment variables

Everything is optional — the app runs fully without them.

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | Enables the Google sign-in button |
| `GROK_API_KEY` | AI-powered matching via xAI Grok (falls back to the local matcher) |
| `MONGODB_URI` | MongoDB persistence (falls back to the file store in `nextrole.json`) |
| `JWT_SECRET` | Session signing secret (a dev default is used otherwise) |

## Project structure

```
client/     React + Vite + Tailwind app (Home, Explore roles, Profile, Sign in/up)
server/     Express API: /api/analyze, /api/auth, /api/roles, /api/profile
electron/   Desktop app main process
nextrole.json  Single source of app data + optional runtime store
```

## How matching works

1. **Extract** text (pdf.js engines, then OCR for scans).
2. **Detect skills** against the 163-entry catalogue in `nextrole.json`, with
   alias normalisation and word-boundary matching.
3. **Score roles** from the 30-role library: direct skill overlap, skills that
   imply a role, and title/experience signals from the resume itself.
4. Return a ranked list with per-role "why" explanations — always at least
   six roles, best fit first.

When `GROK_API_KEY` is present, Grok performs steps 2–4 with the same
catalogue as ground truth, and the local matcher remains as the fallback.
