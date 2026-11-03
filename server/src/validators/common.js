// Zod building blocks shared by every module's schema.
const { z } = require("zod");

const str = (max = 300) => z.string().trim().max(max);
const optStr = (max = 300) => str(max).optional().default("");
// Empty string is allowed so a link can be cleared from the admin panel.
const url = z.union([z.literal(""), z.string().trim().url().max(500)]).optional().default("");
const list = (max = 300) => z.array(str(max).min(1)).max(50).optional().default([]);
const order = z.coerce.number().int().min(0).max(10000).optional().default(0);

// URL parts. Validating ids up front gives a clean 400 instead of a Mongoose CastError.
const idParam = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id") });

module.exports = { z, str, optStr, url, list, order, idParam };
