const { z, str } = require("../../validators/common");

const message = z.object({
  name: str(80).min(1),
  email: z.string().trim().email().max(120),
  message: str(3000).min(5),
});

module.exports = { message };
