// Images uploaded from /settings, stored in MongoDB (the API runs on Vercel: no disk).
//   GET    /api/profile/photo      public; the profile photo
//   PUT    /api/profile/photo      admin; raw image bytes in the body (Content-Type image/*)
//   DELETE /api/profile/photo      admin; back to the photo URL or the bundled default
//   GET    /api/screenshots/:id    public; a project screenshot (id = content hash)
//   POST   /api/screenshots        admin; raw image bytes, returns { id }
// The browser resizes before uploading; the server still checks type, size and signature.
const express = require("express");
const { requireAuth, rateLimit } = require("../../middleware");
const { rawImageBody } = require("./upload");
const controller = require("./media.controller");

const photoRouter = express.Router();
photoRouter.get("/", rateLimit.media, controller.photo.get);
photoRouter.put("/", rateLimit.upload, requireAuth, rawImageBody, controller.photo.save);
photoRouter.delete("/", requireAuth, controller.photo.remove);

const screenshotRouter = express.Router();
screenshotRouter.get("/:id", rateLimit.media, controller.screenshot.get);
screenshotRouter.post("/", rateLimit.upload, requireAuth, rawImageBody, controller.screenshot.upload);

module.exports = { photoRouter, screenshotRouter };
