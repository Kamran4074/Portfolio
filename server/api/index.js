// Vercel serverless entry point. Every request is rewritten here (see server/vercel.json).
// Locally the server still runs through index.js with app.listen().
require("dotenv").config(); // no-op on Vercel, where env vars come from the dashboard
const logger = require("../src/utils/logger");
// Vercel reuses the process between requests, so log rather than exit on a stray error.
require("../src/utils/processHandlers")({ exitOnCrash: false });

let app;
let connectDB;
let configError = null;
try {
  app = require("../src/app"); // loads and validates the environment (src/config/env.js)
  ({ connectDB } = require("../src/db"));
} catch (err) {
  configError = err;
  logger.error("Server failed to load", { error: err.message });
}

const fail = (res, status, error) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error }));
};

module.exports = async (req, res) => {
  if (configError) return fail(res, 500, "Server misconfigured. Check the Vercel logs.");
  try {
    await connectDB(); // failures are logged with a hint in src/db.js
  } catch {
    return fail(res, 503, "Database unavailable");
  }
  return app(req, res);
};
