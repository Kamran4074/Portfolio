// One MongoDB connection per process. On Vercel each serverless instance reuses it
// across requests, and auto-seed runs once per cold start (it never overwrites data).
const dns = require("dns");
const mongoose = require("mongoose");
const { autoSeed } = require("./seed");
const logger = require("./utils/logger");
const env = require("./config/env");

// mongodb+srv:// URIs need a DNS SRV lookup, and some ISP resolvers refuse those
// ("querySrv EREFUSED"). DNS_SERVERS=8.8.8.8,1.1.1.1 makes Node use public resolvers.
// Only Node's own lookups change; the rest of the machine is unaffected.
if (env.DNS_SERVERS?.length) {
  dns.setServers(env.DNS_SERVERS);
  logger.debug("Using custom DNS servers", { servers: env.DNS_SERVERS });
}

// Connection lifecycle after the first connect: drops and recoveries show up in the log.
let closing = false; // set by disconnectDB() so a planned shutdown is not logged as a problem
mongoose.connection.on("disconnected", () => (closing ? logger.info("MongoDB connection closed") : logger.warn("MongoDB disconnected")));
mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
mongoose.connection.on("error", (err) => logger.error("MongoDB connection error", { error: err.message }));

// Host only: the URI contains the database password.
const dbHost = () => {
  try { return new URL(env.MONGO_URI).host; } catch { return "unknown"; }
};

// Explains the common Atlas failures right in the log.
const hint = (err) => {
  const m = err.message || "";
  if (/querySrv E(REFUSED|CONNREFUSED|TIMEOUT)/.test(m)) return "Your DNS refused the SRV lookup. Set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env";
  if (/ENOTFOUND/.test(m)) return "Host not found: check the cluster address in MONGO_URI";
  if (/bad auth|Authentication failed/i.test(m)) return "Wrong database username or password in MONGO_URI";
  if (/Server selection timed out|ETIMEDOUT/.test(m)) return "Network blocked: add your IP in Atlas > Network Access";
  return undefined;
};

let connecting = null;

function connectDB() {
  if (!connecting) {
    const started = Date.now();
    connecting = mongoose
      .connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .then(async () => {
        logger.info("MongoDB connected", { host: dbHost(), ms: Date.now() - started });
        await autoSeed().catch((err) => logger.error("Auto-seed failed", { error: err.message }));
      })
      .catch((err) => {
        connecting = null; // let the next request retry
        logger.error("MongoDB connection failed", { host: dbHost(), error: err.message, hint: hint(err) });
        throw err;
      });
  }
  return connecting;
}

async function disconnectDB() {
  closing = true;
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
