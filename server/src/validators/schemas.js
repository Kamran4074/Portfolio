const { z } = require("zod");

const str = (max = 300) => z.string().trim().max(max);
const optStr = (max = 300) => str(max).optional().default("");
// Empty string is allowed so a link can be cleared from the admin panel.
const url = z.union([z.literal(""), z.string().trim().url().max(500)]).optional().default("");
const list = (max = 300) => z.array(str(max).min(1)).max(50).optional().default([]);
const order = z.coerce.number().int().min(0).max(10000).optional().default(0);

const profile = z.object({
  name: str(80).min(1),
  title: str(120).min(1),
  tagline: optStr(300),
  location: optStr(120),
  email: z.union([z.literal(""), z.string().trim().email()]).optional().default(""),
  phone: optStr(30),
  resumeUrl: url,
  photoUrl: url,
  available: z.boolean().optional().default(true),
  about: list(1000),
  focus: list(80),
  socials: z.array(z.object({ label: str(40).min(1), url: z.string().trim().min(1).max(500) })).max(20).optional().default([]),
  stats: z.array(z.object({ value: str(20).min(1), label: str(60).min(1), url })).max(8).optional().default([]),
});

const experience = z.object({
  company: str(120).min(1),
  role: str(120).min(1),
  location: optStr(120),
  start: optStr(40),
  end: optStr(40),
  points: list(600),
  tech: list(40),
  order,
});

const project = z.object({
  title: str(120).min(1),
  subtitle: optStr(160),
  description: optStr(1200),
  highlights: list(400),
  tech: list(40),
  demoUrl: url,
  githubUrl: url,
  featured: z.boolean().optional().default(false),
  order,
});

const skillGroup = z.object({ title: str(60).min(1), items: list(40), order });

const certification = z.object({ title: str(160).min(1), issuer: optStr(120), url, order });

const achievement = z.object({ text: str(400).min(1), order });

const message = z.object({
  name: str(80).min(1),
  email: z.string().trim().email().max(120),
  message: str(3000).min(5),
});

const login = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) });

module.exports = { profile, experience, project, skillGroup, certification, achievement, message, login };
