// Profile photo: one uploaded image; the profile stores its version (content hash).
const HttpError = require("../../core/HttpError");
const assets = require("./asset.repository");
const profiles = require("../content/profile.repository");
const { PHOTO_ID } = require("./media.constants");
const { contentHash } = require("./image.util");
const { assertImage } = require("./upload");

async function get() {
  const asset = await assets.findById(PHOTO_ID);
  if (!asset) throw new HttpError(404, "No uploaded photo");
  return asset;
}

async function save(buf) {
  const contentType = assertImage(buf);
  const hash = contentHash(buf);
  await assets.save(PHOTO_ID, { data: buf, contentType, hash });
  const profile = await profiles.update({ photoVersion: hash });
  return { photoVersion: profile.photoVersion, contentType, bytes: buf.length };
}

async function remove() {
  await assets.removeById(PHOTO_ID);
  await profiles.unset("photoVersion");
}

module.exports = { get, save, remove };
