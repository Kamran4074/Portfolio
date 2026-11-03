const asyncHandler = require("../../core/asyncHandler");
const { audit } = require("../../core/requestContext");
const photoService = require("./photo.service");
const screenshotService = require("./screenshot.service");
const { toBuffer } = require("./image.util");

// Sends a stored image. `immutable` when the URL carries the content hash.
function sendImage(req, res, asset, { immutable }) {
  const etag = `"${asset.hash}"`;
  res.set({
    "Content-Type": asset.contentType,
    ETag: etag,
    // s-maxage lets Vercel's CDN keep the image too, so repeat views never reach the
    // function or the database.
    "Cache-Control": immutable ? "public, max-age=31536000, s-maxage=31536000, immutable" : "public, max-age=300, s-maxage=300",
    // The portfolio is served from a different origin than the API; helmet's default
    // (same-origin) would make the browser refuse to show the image.
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  if (req.get("if-none-match") === etag) return res.status(304).end();
  res.send(toBuffer(asset.data));
}

const photo = {
  // The site requests ?v=<hash>, so a new upload is a new URL and can be cached for good.
  get: asyncHandler(async (req, res) => sendImage(req, res, await photoService.get(), { immutable: !!req.query.v })),
  save: asyncHandler(async (req, res) => {
    const { photoVersion, contentType, bytes } = await photoService.save(req.body);
    audit(req, "Profile photo uploaded", { bytes, contentType, hash: photoVersion });
    res.json({ photoVersion });
  }),
  remove: asyncHandler(async (req, res) => {
    await photoService.remove();
    audit(req, "Profile photo removed");
    res.status(204).end();
  }),
};

const screenshot = {
  get: asyncHandler(async (req, res) => sendImage(req, res, await screenshotService.get(req.params.id), { immutable: true })),
  upload: asyncHandler(async (req, res) => {
    const { id, contentType, bytes } = await screenshotService.upload(req.body);
    audit(req, "Screenshot uploaded", { bytes, contentType, hash: id });
    res.status(201).json({ id });
  }),
};

module.exports = { photo, screenshot, sendImage };
