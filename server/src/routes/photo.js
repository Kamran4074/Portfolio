// Profile photo upload from /settings.
//   GET    /api/profile/photo   public; the image itself (long cache, URL is versioned)
//   PUT    /api/profile/photo   admin; raw image bytes in the body (Content-Type image/*)
//   DELETE /api/profile/photo   admin; back to the photo URL or the bundled default
//
// The browser crops and resizes to a 480x480 WebP before uploading, so the stored file
// is small. The server still checks type, size and the file's real signature.
const crypto = require("crypto");
const express = require("express");
const { Asset, Profile } = require("../models");
const { asyncHandler, requireAuth, audit, HttpError } = require("../middleware");

const router = express.Router();
const ID = "profile-photo";
const MAX_BYTES = 1024 * 1024; // 1 MB; a processed photo is usually 20-40 KB

// Identify the format from the first bytes, not from the Content-Type header,
// so a renamed or disguised file is rejected.
const sniff = (buf) => {
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.toString("hex", 0, 8) === "89504e470d0a1a0a") return "image/png";
  return null;
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const asset = await Asset.findById(ID).lean();
    if (!asset) throw new HttpError(404, "No uploaded photo");

    const etag = `"${asset.hash}"`;
    res.set({
      "Content-Type": asset.contentType,
      ETag: etag,
      // The site requests ?v=<hash>, so a new upload is a new URL and this can be cached for good.
      "Cache-Control": req.query.v ? "public, max-age=31536000, immutable" : "public, max-age=300",
      // The portfolio is served from a different origin than the API; helmet's default
      // (same-origin) would make the browser refuse to show the image.
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    if (req.get("if-none-match") === etag) return res.status(304).end();
    // .lean() returns the BSON Binary wrapper; its .buffer holds exactly the image bytes.
    res.send(Buffer.isBuffer(asset.data) ? asset.data : Buffer.from(asset.data.buffer));
  })
);

router.put(
  "/",
  requireAuth,
  express.raw({ type: "image/*", limit: MAX_BYTES }),
  asyncHandler(async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new HttpError(400, "Send the image as the request body with an image/* Content-Type");
    }
    const contentType = sniff(req.body);
    if (!contentType) throw new HttpError(415, "Only WebP, JPEG or PNG images are allowed");

    const hash = crypto.createHash("sha256").update(req.body).digest("hex").slice(0, 12);
    await Asset.findByIdAndUpdate(ID, { data: req.body, contentType, size: req.body.length, hash }, { upsert: true });
    const profile = await Profile.findOneAndUpdate({}, { photoVersion: hash }, { new: true, upsert: true }).lean();

    audit(req, "Profile photo uploaded", { bytes: req.body.length, contentType, hash });
    res.json({ photoVersion: profile.photoVersion });
  })
);

router.delete(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    await Asset.deleteOne({ _id: ID });
    await Profile.updateOne({}, { $unset: { photoVersion: 1 } });
    audit(req, "Profile photo removed");
    res.status(204).end();
  })
);

module.exports = router;
