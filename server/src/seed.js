// Seeding shared by server startup and the npm scripts.
// Nothing here overwrites data unless `force` is passed, so edits made in /settings are safe.
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const logger = require("./utils/logger");
const { Setting, Profile, Experience, Project, SkillGroup, Certification, Achievement } = require("./models");

const CONTENT_PATH = path.resolve(__dirname, "../../client/src/data/content.json");

// Fills empty collections from client/src/data/content.json (force = wipe and re-seed).
async function seedContent({ force = false } = {}) {
  if (!fs.existsSync(CONTENT_PATH)) {
    logger.warn(`seed: ${CONTENT_PATH} not found, skipping content`);
    return;
  }
  const content = JSON.parse(fs.readFileSync(CONTENT_PATH, "utf8"));
  const targets = [
    [Profile, [content.profile]],
    [Experience, content.experience],
    [Project, content.projects],
    [SkillGroup, content.skills],
    [Certification, content.certifications],
    [Achievement, content.achievements],
  ];

  for (const [Model, docs] of targets) {
    if (!docs?.length || !docs[0]) continue;
    const count = await Model.countDocuments();
    if (count && !force) continue;
    await Model.deleteMany({});
    await Model.insertMany(docs);
    logger.info(`seed: ${Model.modelName} (${docs.length})`);
  }
}

// Sets the settings password. Without `force` it only seeds when none exists yet,
// so a password changed from the Password tab is never replaced on restart.
async function seedPassword(password, { force = false } = {}) {
  if (!password) return;
  if (password.length < 10) {
    logger.warn("seed: ADMIN_PASSWORD must be at least 10 characters, skipping");
    return;
  }
  const existing = await Setting.findOne().lean();
  if (existing && !force) return;
  await Setting.findOneAndUpdate(
    {},
    { passwordHash: await bcrypt.hash(password, 12), tokenVersion: (existing?.tokenVersion ?? 0) + 1 },
    { upsert: true }
  );
  logger.info(existing ? "seed: password updated" : "seed: password seeded");
}

async function autoSeed() {
  await seedContent();
  await seedPassword(process.env.ADMIN_PASSWORD);
}

module.exports = { seedContent, seedPassword, autoSeed };
