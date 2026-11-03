// Rebuilds the client after a content change, so the pre-rendered HTML matches /settings.
// Optional (DEPLOY_HOOK_URL). Never throws: a failed rebuild must not fail the save.
// Awaited (with a short timeout) because serverless hosts freeze the function after responding.
const logger = require("./logger");
const env = require("../config/env");

async function triggerRebuild(reason) {
  if (!env.DEPLOY_HOOK_URL) return false;
  try {
    const res = await fetch(env.DEPLOY_HOOK_URL, { method: "POST", signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    logger.info("Site rebuild triggered", { reason });
    return true;
  } catch (err) {
    logger.warn("Site rebuild trigger failed", { reason, error: err.message });
    return false;
  }
}

module.exports = { triggerRebuild };
