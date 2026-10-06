// App-wide logger.
//   Dev:  colored, human-readable console output.
//   Prod: one JSON object per line (what Render/Railway log viewers expect).
// Files in server/logs/ (error.log, combined.log) rotate at 5 MB, 5 files each.
// Set LOG_LEVEL=debug for more detail, LOG_TO_FILE=false to disable files.
// Files are always off on Vercel (read-only filesystem); use the Vercel logs tab there.
const path = require("path");
const { createLogger, format, transports } = require("winston");

const isProd = process.env.NODE_ENV === "production";
const logDir = path.resolve(__dirname, "../../logs");

const devFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: "HH:mm:ss" }),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level} ${stack || message}${extra}`;
  })
);

const jsonFormat = format.combine(format.timestamp(), format.errors({ stack: true }), format.json());

// An unknown LOG_LEVEL would make winston drop every message (including the config
// error that explains it), so fall back to the default; config/env.js reports the typo.
const LEVELS = ["error", "warn", "info", "http", "verbose", "debug", "silly"];
const level = LEVELS.includes(process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : isProd ? "http" : "debug";

const logger = createLogger({
  level,
  format: format.errors({ stack: true }),
  transports: [new transports.Console({ format: isProd ? jsonFormat : devFormat })],
});

if (process.env.LOG_TO_FILE !== "false" && !process.env.VERCEL) {
  const file = (filename, level) =>
    new transports.File({ filename: path.join(logDir, filename), level, format: jsonFormat, maxsize: 5 * 1024 * 1024, maxFiles: 5 });
  logger.add(file("error.log", "error"));
  logger.add(file("combined.log"));
}

module.exports = logger;
