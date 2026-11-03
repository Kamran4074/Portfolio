// Zod building blocks shared by every module's schema.
const { z } = require("zod");

const str = (max = 300) => z.string().trim().max(max);
const optStr = (max = 300) => str(max).optional().default("");

// zod's .url() accepts any scheme, including javascript: and data:, which run code when
// rendered as a link. Only these schemes are stored.
const protocolOf = (value) => {
  try { return new URL(value).protocol; } catch { return null; }
};
const webUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => ["http:", "https:"].includes(protocolOf(v)), "Must be an http(s) link");
// Social and stat links may also be mail/phone links or a link within the site (#section, /page).
const linkValue = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (v) => ["http:", "https:", "mailto:", "tel:"].includes(protocolOf(v)) || /^(#[\w-]*|\/(?!\/)\S*)$/.test(v),
    "Must be an http(s), mailto: or tel: link, or a #section"
  );

// Empty string is allowed so a link can be cleared from the admin panel.
const url = z.union([z.literal(""), webUrl]).optional().default("");
const link = linkValue;
const optLink = z.union([z.literal(""), linkValue]).optional().default("");
const list = (max = 300) => z.array(str(max).min(1)).max(50).optional().default([]);
const order = z.coerce.number().int().min(0).max(10000).optional().default(0);

// URL parts. Validating ids up front gives a clean 400 instead of a Mongoose CastError.
const idParam = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id") });

module.exports = { z, str, optStr, url, link, optLink, list, order, idParam };
