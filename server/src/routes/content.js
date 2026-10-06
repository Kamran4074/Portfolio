const express = require("express");
const schemas = require("../validators/schemas");
const { Profile, Experience, Education, Project, SkillGroup, Certification, Achievement } = require("../models");
const { asyncHandler, validate, requireAuth, audit } = require("../middleware");

const router = express.Router();
const sorted = (Model) => Model.find().sort({ order: 1, createdAt: 1 }).lean();

// One round trip for the whole public site instead of seven requests.
router.get(
  "/content",
  asyncHandler(async (_req, res) => {
    const [profile, experience, education, projects, skills, certifications, achievements] = await Promise.all([
      Profile.findOne().lean(),
      sorted(Experience),
      sorted(Education),
      sorted(Project),
      sorted(SkillGroup),
      sorted(Certification),
      sorted(Achievement),
    ]);
    // no-cache = revalidate every time; Express ETags make unchanged responses a cheap 304.
    // Edits from /settings (including a new photo) then show up on the next page load.
    res.set("Cache-Control", "no-cache");
    res.json({ profile, experience, education, projects, skills, certifications, achievements });
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
    audit(req, "Profile updated");
    res.json(profile);
  })
);

module.exports = router;
