// Test data. Image buffers only need a real file signature: the server checks the
// first bytes, it never decodes the picture.
const webp = (seed = "a") => Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.from(`VP8 ${seed}`.repeat(8))]);
const png = (seed = "a") => Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.from(seed.repeat(16))]);
const jpeg = (seed = "a") => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(seed.repeat(16))]);

const project = (overrides = {}) => ({
  title: "RooMates",
  subtitle: "Expense splitting and room listings",
  description: "Split rent and bills with roommates.",
  highlights: ["Row-Level Security", "Integer paise"],
  tech: ["Next.js", "PostgreSQL"],
  demoUrl: "https://roomatess.vercel.app",
  githubUrl: "https://github.com/Kamran4074/rooMates",
  featured: true,
  order: 0,
  ...overrides,
});

const profile = (overrides = {}) => ({ name: "Kamran Alam", title: "Full Stack Developer · Backend Focused", ...overrides });

const contact = (overrides = {}) => ({ name: "Visitor", email: "visitor@example.com", message: "Hello, I liked your portfolio.", ...overrides });

module.exports = { webp, png, jpeg, project, profile, contact };
