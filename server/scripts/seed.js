// Seeds MongoDB from client/src/data/content.json.
//   npm run seed           -> only fills empty collections
//   npm run seed -- --force -> wipes and re-seeds everything
require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");
const { Profile, Experience, Project, SkillGroup, Certification, Achievement } = require("../src/models");

const content = require(path.resolve(__dirname, "../../client/src/data/content.json"));
const force = process.argv.includes("--force");

const targets = [
  [Profile, [content.profile]],
  [Experience, content.experience],
  [Project, content.projects],
  [SkillGroup, content.skills],
  [Certification, content.certifications],
  [Achievement, content.achievements],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  for (const [Model, docs] of targets) {
    const count = await Model.countDocuments();
    if (count && !force) {
      console.log(`skip   ${Model.modelName} (${count} existing)`);
      continue;
    }
    await Model.deleteMany({});
    await Model.insertMany(docs);
    console.log(`seeded ${Model.modelName} (${docs.length})`);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
