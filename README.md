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

## Logging and validation
**Winston** (`server/src/utils/logger.js`) writes everything: colored console in dev, one JSON object per line
in production (`NODE_ENV=production`), plus `server/logs/error.log` and `combined.log` (rotated at 5 MB, off on Vercel).
Tune with `LOG_LEVEL` (error, warn, info, http, debug) and `LOG_TO_FILE=false`.

**Morgan** (`server/src/middleware/requestLogger.js`) logs every request through Winston. Each request gets an id,
returned as the `X-Request-Id` header and attached to its access line and any error it causes. 500 responses include
it as `requestId`, so a bug report can be matched to the exact log lines. 4xx log as warn, 5xx as error.

What else is logged:
- Security: failed logins, rejected or expired tokens, rate-limit blocks, blocked CORS origins, bad keep-alive tokens.
- Audit (`audit:` prefix): every create, update and delete from /settings, logins and password changes.
- Contact form: message saved, mail sent or failed (by message id, not the sender's details).
- MongoDB: connect time, drops and reconnects, with a hint for common Atlas errors.
- Crashes: unhandled promise rejections and uncaught exceptions.

Never logged: passwords, tokens, request bodies or the MongoDB URI.

**Zod** validates:
- the environment at startup (`server/src/config/env.js`): a bad `.env` stops the server with one line per problem;
- request bodies, URL ids and query strings (`server/src/validators/schemas.js`, `validate(schema, "body" | "params" | "query")`).

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

## Frontend: rendering, SEO and animation
- **Pre-rendered HTML.** `npm run build` builds the app, renders the portfolio from `client/src/data/content.json`
  into `dist/index.html` (`scripts/prerender.mjs`), adds JSON-LD, and writes `robots.txt` and `sitemap.xml`.
  React then hydrates that markup. Live edits from `/settings` still appear after load; re-deploy to refresh
  the pre-rendered copy and structured data.
- **Site URL** lives in `client/site.config.mjs` (or `VITE_SITE_URL` in Vercel). It feeds the canonical link,
  Open Graph/Twitter tags, JSON-LD, robots.txt and sitemap.xml.
- **Animation is progressive enhancement.** The hero entrance is CSS only. Scroll effects (GSAP + ScrollTrigger)
  and smooth scrolling (Lenis) are in `client/src/motion/`, loaded after first paint, and skipped entirely for
  `prefers-reduced-motion`. Pointer effects (custom cursor, magnetic CTA, glow) are desktop-only.
  Markup hooks are documented at the top of `client/src/motion/index.js` (`data-reveal`, `data-stagger`, ...).
- **Project screenshots:** set *Screenshot URL* and *Screenshot description* for a project in `/settings`
  (16:10, ~1200px wide, WebP). Without one, a generated cover is shown.
- **Social image:** `client/public/og-image.png` (1200×630). Replace it if your title changes.
