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
- **Client:** Vercel project with Root Directory `client`. Recommended: leave `VITE_API_URL` empty and add a
  rewrite to `client/vercel.json` so `/api` is served from the site's own domain (the refresh cookie is then
  first-party and works in every browser):
  `{ "source": "/api/(.*)", "destination": "https://<your-api>.vercel.app/api/$1" }` (first in `rewrites`).
  Alternative: set `VITE_API_URL` to the server URL and `REFRESH_COOKIE_SAMESITE=none` on the server
  (Safari and other browsers that block third-party cookies will then sign you out on reload).
- **Atlas:** Network Access → allow `0.0.0.0/0` (Vercel IPs are not fixed).

## Settings login: access and refresh tokens
- **Access token:** a JWT, 15 min by default, kept in localStorage and sent as `Authorization: Bearer`.
  When it expires, the next request refreshes it and retries automatically.
- **Refresh token:** 256 random bits, 7 days by default, in an `HttpOnly` cookie limited to `/api/auth`
  (page scripts cannot read it). The database stores only its SHA-256 (`refreshtokens`, expired rows auto-deleted).
- **Rotation:** every refresh replaces the refresh token. Reusing an old one signs that whole login out
  (theft detection). Two tabs refreshing at the same moment are told `REFRESH_RACE` and retry, not signed out.
- **Revocation:** Log out ends this login; a password change or **Security → Sign out everywhere** ends all of them,
  including access tokens already issued.
- **Lifetimes are set in /settings → Security** (access 5–120 min, refresh 1–30 days). Changes apply from the
  next login or refresh.
- Refresh and logout need `X-Requested-With: XMLHttpRequest` (a CSRF guard: other sites cannot send it).

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
- request bodies, URL ids and query strings (each module's `*.schema.js`, `validate(schema, "body" | "params" | "query")`).

**Rate limits** (`server/src/middleware/rateLimit.js`, per IP, standard `RateLimit-*` headers, every block logged):
whole API 500 / 15 min (images have their own 2000 / 15 min), login 5 / 15 min, contact 5 / hour (plus a honeypot field),
uploads 60 / hour, refresh 30 / 15 min, keep-alive 10 / hour. Login, refresh, contact, upload and keep-alive count in
MongoDB (`ratelimits`), so they hold across every serverless instance; the rest count in memory.

## Server structure
```
server/src/
  app.js            composition root: middleware, then one router per module
  config/env.js     validated environment
  core/             HttpError, asyncHandler, request context (log meta, audit)
  middleware/       validate, requireAuth, rateLimit, requestLogger, errorHandler
  models/           Mongoose schemas
  modules/<feature>/  auth, content, collections, media, messages, health
    *.routes.js       URLs + middleware (auth, rate limit, validation)
    *.controller.js   HTTP in/out and audit log
    *.service.js      business rules; no Express objects, throws HttpError
    *.repository.js   data access; the only layer that touches models
    *.schema.js       Zod request schemas
```

## Tests (`server/`, Jest)
```bash
npm test                  # everything (~25 s; the first run downloads MongoDB for the in-memory server)
npm run test:unit         # one module at a time, collaborators mocked, no database
npm run test:integration  # real HTTP (supertest) against the app and an in-memory MongoDB
npm run test:regression   # one test per fixed bug, so it cannot come back
npm run test:qa           # security headers, CORS, rate limits, error shape, limits, response time
npm run test:coverage
```
Tests never read `.env` or touch the real database. `LOG_IN_TESTS=true` shows the app's logs.
GitHub Actions (`.github/workflows/test.yml`) runs them, and the client build, on every push.

## API
| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | public: liveness, no DB work |
| GET | `/api/health/db` | public (or `?token=KEEPALIVE_TOKEN`): real DB write+read, rate limited 10/hour |
| GET | `/api/content` | public: everything in one request |
| POST | `/api/contact` | public, rate limited 5/hour |
| POST | `/api/auth/login` | public (`{ password }`) → `{ accessToken }` + refresh cookie, rate limited 5/15 min |
| POST | `/api/auth/refresh` | refresh cookie → new access token + rotated cookie, 30/15 min |
| POST | `/api/auth/logout` | ends this login |
| POST | `/api/auth/logout-all` | admin: signs out every session |
| GET/PUT | `/api/auth/settings` | admin: token lifetimes (`{ accessTokenMinutes, refreshTokenDays }`) |
| PUT | `/api/auth/password` | admin (`{ currentPassword, newPassword }`) |
| GET/PUT | `/api/profile` | PUT = admin |
| GET/POST/PUT/DELETE | `/api/{experience,projects,skills,certifications,achievements}` | writes = admin |
| GET/PATCH/DELETE | `/api/messages` | admin |
| GET/PUT/DELETE | `/api/profile/photo` | GET public; PUT (raw image body) and DELETE admin |
| GET | `/api/screenshots/:id` | public, cached for good (id = content hash) |
| POST | `/api/screenshots` | admin, raw image body, returns `{ id }`; up to 10 per project, each `{ id, caption }` |

## Adding a new field
1. Add it to the Mongoose model in `server/src/models/index.js`
2. Add it to the module's Zod schema (e.g. `server/src/modules/collections/collections.schema.js`)
3. Add it to the field list in `client/src/admin/config.js` and render it in the component

## Frontend: rendering, SEO and animation
- **Pre-rendered HTML.** `npm run build` builds the app, renders the portfolio into `dist/index.html`
  (`scripts/prerender.mjs`), adds JSON-LD and a Content-Security-Policy, and writes `robots.txt` and `sitemap.xml`.
  Content comes from the live API (`PRERENDER_API_URL`, else `VITE_API_URL`, set in the client's Vercel env),
  falling back to `client/src/data/content.json`. The content used is embedded in the page, so React hydrates
  without a mismatch. Set `DEPLOY_HOOK_URL` on the server (a Vercel deploy hook of the client project) and every
  save in `/settings` rebuilds the page, so search engines and link previews stay current.
- **Security headers.** The CSP is a meta tag generated at build: inline scripts and the font `onload` handler are
  allowed by SHA-256 hash only, `connect-src` is the site plus the API origin. `client/vercel.json` adds
  `frame-ancestors 'none'`/`X-Frame-Options: DENY` (no framing of `/settings`), `nosniff`, `Referrer-Policy` and
  `Permissions-Policy`. Every link from the API passes `client/src/safeUrl.js` (http(s), mailto, tel, #section),
  and the server stores nothing else.
- **Site URL** lives in `client/site.config.mjs` (or `VITE_SITE_URL` in Vercel). It feeds the canonical link,
  Open Graph/Twitter tags, JSON-LD, robots.txt and sitemap.xml.
- **Animation is progressive enhancement.** The hero entrance is CSS only. Scroll effects (GSAP + ScrollTrigger)
  and smooth scrolling (Lenis) are in `client/src/motion/`, loaded after first paint, and skipped entirely for
  `prefers-reduced-motion`. Pointer effects (custom cursor, magnetic CTA, glow) are desktop-only.
  Markup hooks are documented at the top of `client/src/motion/index.js` (`data-reveal`, `data-stagger`, ...).
- **Project screenshots:** upload up to 10 per project in `/settings`, each with a caption. The browser stores a
  1600px and an 800px copy; cards use `srcset`, so phones download the small one. Images are served with
  `s-maxage`, so Vercel's CDN caches them. Without screenshots, *Screenshot URL* or a generated cover is shown.
- **Social image:** `client/public/og-image.png` (1200×630). Replace it if your title changes.
