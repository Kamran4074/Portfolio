const { z, str, optStr, url, list, order } = require("../../validators/common");
const { MAX_SCREENSHOTS, SCREENSHOT_ID } = require("../media/media.constants");

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

// A screenshot reference: { id, thumb?, caption }. `thumb` is an 800px copy for phones.
// A bare id string (the first version of this field) is still accepted.
const screenshotId = z.string().regex(SCREENSHOT_ID, "Invalid screenshot id");
const screenshot = z.union([
  screenshotId.transform((id) => ({ id, caption: "" })),
  z.object({ id: screenshotId, thumb: screenshotId.optional(), caption: optStr(200) }),
]);

const project = z.object({
  title: str(120).min(1),
  subtitle: optStr(160),
  description: optStr(1200),
  highlights: list(400),
  tech: list(40),
  demoUrl: url,
  githubUrl: url,
  image: url,
  imageAlt: optStr(160),
  images: z
    .array(screenshot)
    .max(MAX_SCREENSHOTS, `At most ${MAX_SCREENSHOTS} screenshots`)
    .refine((shots) => new Set(shots.map((s) => s.id)).size === shots.length, "The same screenshot is listed twice")
    .optional()
    .default([]),
  featured: z.boolean().optional().default(false),
  order,
});

const education = z.object({
  institution: str(160).min(1),
  degree: str(160).min(1),
  field: optStr(160),
  location: optStr(120),
  start: optStr(40),
  end: optStr(40),
  grade: optStr(40),
  details: list(400),
  order,
});

const skillGroup = z.object({ title: str(60).min(1), items: list(40), order });

const certification = z.object({ title: str(160).min(1), issuer: optStr(120), url, order });

const achievement = z.object({ text: str(400).min(1), order });

module.exports = { experience, project, education, skillGroup, certification, achievement };
