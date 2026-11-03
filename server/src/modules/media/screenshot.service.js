// Project screenshots. Uploading only stores the file and returns its id; the project
// form then saves the list. Files no project uses any more are removed by prune().
const HttpError = require("../../core/HttpError");
const assets = require("./asset.repository");
const { SCREENSHOT_PREFIX, SCREENSHOT_ID, SCREENSHOT_GRACE_MS } = require("./media.constants");
const { contentHash } = require("./image.util");
const { assertImage } = require("./upload");
const logger = require("../../utils/logger");

async function get(id) {
  const asset = SCREENSHOT_ID.test(id) ? await assets.findById(SCREENSHOT_PREFIX + id) : null;
  if (!asset) throw new HttpError(404, "Not found");
  return asset;
}

async function upload(buf) {
  const contentType = assertImage(buf);
  const hash = contentHash(buf);
  await assets.save(SCREENSHOT_PREFIX + hash, { data: buf, contentType, hash });
  return { id: hash, contentType, bytes: buf.length };
}

// Deletes screenshots no project references (older than the grace period).
// Never throws: a failed cleanup must not fail the save that triggered it.
async function prune({ now = Date.now() } = {}) {
  try {
    const keep = (await assets.referencedScreenshotIds()).map((id) => SCREENSHOT_PREFIX + id);
    const removed = await assets.removeUnused({ prefix: SCREENSHOT_PREFIX, keep, before: new Date(now - SCREENSHOT_GRACE_MS) });
    if (removed) logger.info(`screenshots: removed ${removed} unused`);
    return removed;
  } catch (err) {
    logger.warn("screenshots: cleanup failed", { error: err.message });
    return 0;
  }
}

module.exports = { get, upload, prune };
