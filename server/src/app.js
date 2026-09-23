const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const crudRouter = require("./routes/crud");
const schemas = require("./validators/schemas");
const { Experience, Project, SkillGroup, Certification, Achievement } = require("./models");
const { notFound, errorHandler } = require("./middleware");

const app = express();

// CLIENT_ORIGIN can be a comma-separated list, e.g. "https://kamran.dev,http://localhost:5173".
const origins = (process.env.CLIENT_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);

app.set("trust proxy", 1); // needed for correct IPs in rate limiting behind Render/Railway/Nginx
app.use(helmet());
app.use(cors(origins.length ? { origin: origins } : {}));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  const db = mongoose.connection.readyState === 1 ? "up" : "down";
  res.status(db === "up" ? 200 : 503).json({ status: db === "up" ? "ok" : "degraded", db, uptime: Math.round(process.uptime()) });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api", require("./routes/content"));
app.use("/api", require("./routes/messages"));
app.use("/api/experience", crudRouter(Experience, schemas.experience));
app.use("/api/projects", crudRouter(Project, schemas.project));
app.use("/api/skills", crudRouter(SkillGroup, schemas.skillGroup));
app.use("/api/certifications", crudRouter(Certification, schemas.certification));
app.use("/api/achievements", crudRouter(Achievement, schemas.achievement));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
