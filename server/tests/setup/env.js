// Runs before every test file, before any app code is loaded (config/env.js reads these).
// The real .env is never loaded in tests.
Object.assign(process.env, {
  NODE_ENV: "test",
  // Only has to pass validation: integration tests connect to an in-memory MongoDB.
  MONGO_URI: "mongodb://127.0.0.1:27017/portfolio-test",
  JWT_SECRET: "test-jwt-secret-that-is-long-enough-1234",
  CLIENT_ORIGIN: "http://allowed.test",
  KEEPALIVE_TOKEN: "keepalive-test-token",
  CRON_SECRET: "cron-test-secret",
  LOG_TO_FILE: "false",
});
for (const key of ["GMAIL_USER", "GMAIL_APP_PASSWORD", "CONTACT_TO", "ADMIN_PASSWORD", "ADMIN_PASSWORD_HASH", "VERCEL", "DNS_SERVERS"]) {
  delete process.env[key];
}
