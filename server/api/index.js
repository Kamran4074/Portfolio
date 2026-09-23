// Vercel serverless entry point. Every request is rewritten here (see server/vercel.json).
// Locally the server still runs through index.js with app.listen().
require("dotenv").config(); // no-op on Vercel, where env vars come from the dashboard
const app = require("../src/app");
const { connectDB } = require("../src/db");
const logger = require("../src/utils/logger");

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    logger.error("MongoDB connection failed", { error: err.message });
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify({ error: "Database unavailable" }));
  }
  return app(req, res);
};
