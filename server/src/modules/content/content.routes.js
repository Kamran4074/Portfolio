//   GET /api/content   public; everything the site shows in one request
//   GET /api/profile   public
//   PUT /api/profile   admin
const express = require("express");
const { validate, requireAuth } = require("../../middleware");
const schemas = require("./content.schema");
const controller = require("./content.controller");

const router = express.Router();

router.get("/content", controller.getContent);
router.get("/profile", controller.getProfile);
router.put("/profile", requireAuth, validate(schemas.profile), controller.updateProfile);

module.exports = router;
