const asyncHandler = require("../../core/asyncHandler");
const { audit } = require("../../core/requestContext");
const service = require("./content.service");

const getContent = asyncHandler(async (_req, res) => {
  // no-cache = revalidate every time; Express ETags make unchanged responses a cheap 304.
  // Edits from /settings (including a new photo) then show up on the next page load.
  res.set("Cache-Control", "no-cache");
  res.json(await service.getPublicContent());
});

const getProfile = asyncHandler(async (_req, res) => res.json(await service.getProfile()));

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await service.updateProfile(req.body);
  audit(req, "Profile updated");
  res.json(profile);
});

module.exports = { getContent, getProfile, updateProfile };
