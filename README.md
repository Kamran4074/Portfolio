# Kamran Alam Portfolio

React (Vite) frontend + Express/MongoDB API. All content (profile, experience, projects, skills,
certifications, achievements) lives in MongoDB and is editable from the private `/settings` page
(password protected, not linked anywhere on the site, `/admin` also works).

## Setup

```bash
cd server
cp .env.example .env              # fill in MONGO_URI, Gmail values
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # paste into JWT_SECRET
npm run seed-password -- "a-long-strong-password"   # sets the /settings password (stored hashed in MongoDB)
npm run seed                      # loads client/src/data/content.json into MongoDB (add -- --force to overwrite)
npm run dev

cd ../client
npm run dev                       # http://localhost:5173, settings at /settings
```

## Deploying
- **Client (Vercel):** set `VITE_API_URL` to the backend URL (no trailing slash).
- **Server (Render/Railway/VPS):** set all `.env` values and `CLIENT_ORIGIN` to the Vercel URL.

## API
| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | public |
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
