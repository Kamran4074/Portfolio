// Composition root: cross-cutting middleware, then one router per feature module.
//
// Each module in src/modules/<feature>/ is layered the same way:
//   *.routes.js      URL + middleware wiring (auth, rate limit, validation)
//   *.controller.js  HTTP in/out: reads req, calls the service, writes res, audit log
//   *.service.js     business rules; no Express objects, throws HttpError
//   *.repository.js  data access (Mongoose); the only layer that touches models
//   *.schema.js      Zod request schemas
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { requestLogger, rateLimit, notFound, errorHandler } = require("./middleware");
const logger = require("./utils/logger");
const env = require("./config/env");

const healthRoutes = require("./modules/health/health.routes");
const authRoutes = require("./modules/auth/auth.routes");
const contentRoutes = require("./modules/content/content.routes");
const messageRoutes = require("./modules/messages/messages.routes");
const collectionRoutes = require("./modules/collections");
const { photoRouter, screenshotRouter } = require("./modules/media/media.routes");

const app = express();

// CLIENT_ORIGIN can be a comma-separated list, e.g. "https://kamran.dev,http://localhost:5173".
// A blocked origin is logged once: it is almost always a missing entry in CLIENT_ORIGIN.
const origins = env.CLIENT_ORIGIN || [];
const warnedOrigins = new Set();
const corsOptions = origins.length
  ? {
      origin: (origin, done) => {
        if (!origin || origins.includes(origin)) return done(null, true);
        if (!warnedOrigins.has(origin)) {
          warnedOrigins.add(origin);
          logger.warn("CORS blocked an origin not in CLIENT_ORIGIN", { origin });
        }
        done(null, false);
      },
    }
  : {};

app.set("trust proxy", 1); // needed for correct IPs in rate limiting behind Render/Railway/Nginx
app.use(requestLogger); // request id + morgan access log (through winston)
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

// Friendly response for anyone opening the API root in a browser.
app.get(["/", "/api"], (_req, res) => res.json({ name: "Kamran Alam portfolio API", status: "ok", health: "/api/health/db" }));
app.get(["/favicon.ico", "/favicon.png"], (_req, res) => res.status(204).end());

app.use("/api", rateLimit.api);
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile/photo", photoRouter); // before /api/profile
app.use("/api/screenshots", screenshotRouter);
app.use("/api", contentRoutes);
app.use("/api", messageRoutes);
app.use("/api", collectionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
