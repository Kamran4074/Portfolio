const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const crudRouter = require("./routes/crud");
const schemas = require("./validators/schemas");
const { Experience, Education, Project, SkillGroup, Certification, Achievement } = require("./models");
const { notFound, errorHandler } = require("./middleware");
const requestLogger = require("./middleware/requestLogger");
const logger = require("./utils/logger");
const env = require("./config/env");

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

app.use("/api/health", require("./routes/health"));

app.use("/api/auth", require("./routes/auth"));
app.use("/api", require("./routes/content"));
app.use("/api", require("./routes/messages"));
app.use("/api/experience", crudRouter(Experience, schemas.experience));
app.use("/api/education", crudRouter(Education, schemas.education));
app.use("/api/projects", crudRouter(Project, schemas.project));
app.use("/api/skills", crudRouter(SkillGroup, schemas.skillGroup));
app.use("/api/certifications", crudRouter(Certification, schemas.certification));
app.use("/api/achievements", crudRouter(Achievement, schemas.achievement));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
