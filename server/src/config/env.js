// Validates process.env once at startup with Zod and exports a typed, frozen config.
// A missing or malformed required value stops the server with a clear log line instead
// of failing later with something like "querySrv ENOTFOUND undefined".
// Everything else in src/ should read settings from here, not from process.env.
const { z } = require("zod");
const logger = require("../utils/logger");

// `KEY=` in a .env file arrives as "", which should mean "not set".
const optional = (schema) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
const csv = z.string().transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean));

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGO_URI: z
    .string({ required_error: "MONGO_URI is required" })
    .regex(/^mongodb(\+srv)?:\/\//, "MONGO_URI must start with mongodb:// or mongodb+srv://"),
  CLIENT_ORIGIN: optional(csv),
  DNS_SERVERS: optional(csv),

  JWT_SECRET: optional(z.string().min(16, "JWT_SECRET should be at least 16 characters (32+ recommended)")),
  ADMIN_PASSWORD: optional(z.string()),
  ADMIN_PASSWORD_HASH: optional(z.string().regex(/^\$2[aby]\$\d{2}\$/, "ADMIN_PASSWORD_HASH must be a bcrypt hash")),

  GMAIL_USER: optional(z.string().email("GMAIL_USER must be an email address")),
  GMAIL_APP_PASSWORD: optional(z.string()),
  CONTACT_TO: optional(z.string().email("CONTACT_TO must be an email address")),

  KEEPALIVE_TOKEN: optional(z.string().min(8)),
  CRON_SECRET: optional(z.string()),
  VERCEL: optional(z.string()),

  // Read directly by utils/logger.js (it loads first); listed here so typos are caught.
  LOG_LEVEL: optional(z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])),
  LOG_TO_FILE: optional(z.enum(["true", "false"])),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Only key names and rules are logged, never the values (they are secrets).
  for (const issue of parsed.error.issues) logger.error(`Invalid environment: ${issue.path.join(".")}: ${issue.message}`);
  throw new Error("Invalid environment configuration (see the log lines above)");
}

const env = parsed.data;

// Optional features: say once at startup what is switched off, so it is not a mystery later.
if (!env.JWT_SECRET) logger.warn("JWT_SECRET is not set: /settings login is disabled");
if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) logger.warn("GMAIL_USER/GMAIL_APP_PASSWORD not set: contact messages are saved but not emailed");
if (env.NODE_ENV === "production" && !env.CLIENT_ORIGIN) logger.warn("CLIENT_ORIGIN is not set: CORS allows any origin");

module.exports = Object.freeze({
  ...env,
  isProd: env.NODE_ENV === "production",
  isVercel: Boolean(env.VERCEL),
  mailEnabled: Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD),
});
