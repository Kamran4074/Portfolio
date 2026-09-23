const express = require("express");
const schemas = require("../validators/schemas");
const { Profile, Experience, Project, SkillGroup, Certification, Achievement } = require("../models");
const { asyncHandler, validate, requireAuth } = require("../middleware");

const router = express.Router();
const sorted = (Model) => Model.find().sort({ order: 1, createdAt: 1 }).lean();

// One round trip for the whole public site instead of six requests.
router.get(
  "/content",
  asyncHandler(async (_req, res) => {
    const [profile, experience, projects, skills, certifications, achievements] = await Promise.all([
      Profile.findOne().lean(),
      sorted(Experience),
      sorted(Project),
      sorted(SkillGroup),
      sorted(Certification),
      sorted(Achievement),
    ]);
    res.set("Cache-Control", "public, max-age=60");
    res.json({ profile, experience, projects, skills, certifications, achievements });
  })
);

router.get(
  "/profile",
  asyncHandler(async (_req, res) => res.json(await Profile.findOne().lean()))
);

router.put(
  "/profile",
  requireAuth,
  validate(schemas.profile),
  asyncHandler(async (req, res) => {
    const profile = await Profile.findOneAndUpdate({}, req.body, { new: true, upsert: true, runValidators: true });
    res.json(profile);
  })
);

module.exports = router;
