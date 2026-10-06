// Last-resort logging for errors that escape every try/catch. Without this, an unhandled
// promise rejection or exception kills the process with output only on stderr, which
// never reaches the log files.
const logger = require("./logger");

let installed = false;

module.exports = function installProcessHandlers({ exitOnCrash = true } = {}) {
  if (installed) return;
  installed = true;

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", {
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception, process will exit", { error: err.message, stack: err.stack });
    // State is unknown after an uncaught exception; exit and let nodemon/PM2/the host restart.
    // The short delay lets the file transport flush.
    if (exitOnCrash) setTimeout(() => process.exit(1), 300);
  });

  process.on("warning", (w) => logger.warn(`Node warning: ${w.name}: ${w.message}`));
};
