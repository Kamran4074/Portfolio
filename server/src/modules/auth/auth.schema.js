const { z } = require("../../validators/common");

const login = z.object({ password: z.string().min(1).max(200) });

const changePassword = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, "Use at least 10 characters").max(200),
});

module.exports = { login, changePassword };
