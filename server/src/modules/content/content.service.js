const { Experience, Education, Project, SkillGroup, Certification, Achievement } = require("../../models");
const createRepository = require("../collections/collection.repository");
const profiles = require("./profile.repository");
const { triggerRebuild } = require("../../utils/deployHook");

const sections = {
  experience: createRepository(Experience),
  education: createRepository(Education),
  projects: createRepository(Project),
  skills: createRepository(SkillGroup),
  certifications: createRepository(Certification),
  achievements: createRepository(Achievement),
};

// Everything the public site shows, in one round trip instead of seven requests.
async function getPublicContent() {
  const keys = Object.keys(sections);
  const [profile, ...lists] = await Promise.all([profiles.get(), ...keys.map((k) => sections[k].list())]);
  return { profile, ...Object.fromEntries(keys.map((k, i) => [k, lists[i]])) };
}

async function updateProfile(data) {
  const profile = await profiles.update(data);
  await triggerRebuild("Profile changed");
  return profile;
}

module.exports = { getPublicContent, getProfile: profiles.get, updateProfile };
