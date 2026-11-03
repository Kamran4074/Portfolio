const { z, str, optStr, url, list } = require("../../validators/common");

const profile = z.object({
  name: str(80).min(1),
  title: str(120).min(1),
  tagline: optStr(300),
  location: optStr(120),
  email: z.union([z.literal(""), z.string().trim().email()]).optional().default(""),
  phone: optStr(30),
  whatsapp: optStr(30),
  resumeUrl: url,
  photoUrl: url,
  available: z.boolean().optional().default(true),
  about: list(1000),
  focus: list(80),
  socials: z.array(z.object({ label: str(40).min(1), url: z.string().trim().min(1).max(500) })).max(20).optional().default([]),
  stats: z.array(z.object({ value: str(20).min(1), label: str(60).min(1), url })).max(8).optional().default([]),
});

module.exports = { profile };
