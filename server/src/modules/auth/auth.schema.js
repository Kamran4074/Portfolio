const { z } = require("../../validators/common");
const policy = require("./auth.policy");

const login = z.object({ password: z.string().min(1).max(200) });

const changePassword = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, "Use at least 10 characters").max(200),
});

const range = ({ min, max }, unit) =>
  z.coerce.number().int().min(min, `At least ${min} ${unit}`).max(max, `At most ${max} ${unit}`);

const sessionSettings = z.object({
  accessTokenMinutes: range(policy.accessTokenMinutes, "minutes"),
  refreshTokenDays: range(policy.refreshTokenDays, "days"),
});

module.exports = { login, changePassword, sessionSettings };
