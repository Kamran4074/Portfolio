# Kamran Alam Portfolio

React (Vite) frontend + Express/MongoDB API. All content (profile, experience, projects, skills,
certifications, achievements) lives in MongoDB and is editable from the private `/settings` page
(password protected, not linked anywhere on the site, `/admin` also works).

## Setup

```bash
cd server
cp .env.example .env              # fill in MONGO_URI, Gmail values
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # paste into JWT_SECRET
# set ADMIN_PASSWORD in .env (min 10 chars)
npm run dev                       # auto-seeds on start: empty collections from client/src/data/content.json
                                  # and the /settings password from ADMIN_PASSWORD (never overwrites)
# optional: npm run seed -- --force            wipe and reload all content from content.json
# optional: npm run seed-password -- "new-pw"  force-reset the password

cd ../client
npm run dev                       # http://localhost:5173, settings at /settings
```

## Deploying (both on Vercel, two projects from this repo)
- **Server:** new Vercel project, Root Directory `server`, Framework "Other". `server/api/index.js` is the
  serverless entry and `server/vercel.json` routes everything to it. Env vars: `MONGO_URI`, `JWT_SECRET`,
  `ADMIN_PASSWORD`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CONTACT_TO`, `CLIENT_ORIGIN` (client URL),
  `NODE_ENV=production`, optional `CRON_SECRET`. Vercel Cron pings `/api/health/db` daily.
- **Client:** Vercel project with Root Directory `client`. Set `VITE_API_URL` to the server URL (no trailing slash).
- **Atlas:** Network Access → allow `0.0.0.0/0` (Vercel IPs are not fixed).

## Keeping the database alive
MongoDB Atlas free clusters get paused after long inactivity. On Vercel, the cron in `server/vercel.json`
calls `GET /api/health/db` daily. As a backup, `.github/workflows/keep-db-alive.yml` calls it on the 1st
and 21st of each month (repo secret `BACKEND_URL`, plus `KEEPALIVE_TOKEN` if set on the server).

## Logging
Winston (`server/src/utils/logger.js`) + Morgan (`server/src/middleware/requestLogger.js`).
Colored console in dev, JSON in production (`NODE_ENV=production`). Files go to `server/logs/`
(`error.log`, `combined.log`, rotated at 5 MB). Tune with `LOG_LEVEL` and `LOG_TO_FILE=false`.

## API
| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | public: liveness, no DB work |
| GET | `/api/health/db` | public (or `?token=KEEPALIVE_TOKEN`): real DB write+read, rate limited 10/hour |
| GET | `/api/content` | public: everything in one request |
| POST | `/api/contact` | public, rate limited 5/hour |
| POST | `/api/auth/login` | public (`{ password }`), rate limited 5/15 min |
| PUT | `/api/auth/password` | admin (`{ currentPassword, newPassword }`) |
| GET/PUT | `/api/profile` | PUT = admin |
| GET/POST/PUT/DELETE | `/api/{experience,projects,skills,certifications,achievements}` | writes = admin |
| GET/PATCH/DELETE | `/api/messages` | admin |

## Adding a new field
1. Add it to the Mongoose model in `server/src/models/index.js`
2. Add it to the Zod schema in `server/src/validators/schemas.js`
3. Add it to the field list in `client/src/admin/config.js` and render it in the component
