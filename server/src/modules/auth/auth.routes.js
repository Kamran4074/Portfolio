//   POST /api/auth/login     public ({ password }), 5 attempts / 15 min
//   GET  /api/auth/me        admin
//   PUT  /api/auth/password  admin ({ currentPassword, newPassword })
const express = require("express");
const { validate, requireAuth, rateLimit } = require("../../middleware");
const schemas = require("./auth.schema");
const controller = require("./auth.controller");

const router = express.Router();

router.post("/login", rateLimit.login, validate(schemas.login), controller.login);
router.get("/me", requireAuth, controller.me);
router.put("/password", rateLimit.login, requireAuth, validate(schemas.changePassword), controller.changePassword);

module.exports = router;
