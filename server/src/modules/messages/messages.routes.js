//   POST   /api/contact             public, 5 / hour
//   GET    /api/messages            admin
//   PATCH  /api/messages/:id/read   admin
//   DELETE /api/messages/:id        admin
const express = require("express");
const { validate, requireAuth, rateLimit } = require("../../middleware");
const { idParam } = require("../../validators/common");
const schemas = require("./messages.schema");
const controller = require("./messages.controller");

const router = express.Router();

router.post("/contact", rateLimit.contact, validate(schemas.message), controller.submit);
router.get("/messages", requireAuth, controller.inbox);
router.patch("/messages/:id/read", requireAuth, validate(idParam, "params"), controller.markRead);
router.delete("/messages/:id", requireAuth, validate(idParam, "params"), controller.remove);

module.exports = router;
