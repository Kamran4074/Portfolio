// Data access for uploaded binary files (Asset) and the screenshot ids projects use.
const { Asset, Project } = require("../../models");

const findById = (id) => Asset.findById(id).lean();

const save = (id, { data, contentType, hash }) =>
  Asset.findByIdAndUpdate(id, { data, contentType, size: data.length, hash }, { upsert: true, new: true }).lean();

const removeById = (id) => Asset.deleteOne({ _id: id });

// Deletes assets whose id starts with `prefix`, is not in `keep`, and is older than `before`.
const removeUnused = async ({ prefix, keep, before }) =>
  (await Asset.deleteMany({ _id: { $regex: `^${prefix}`, $nin: keep }, createdAt: { $lt: before } })).deletedCount;

// Every screenshot id any project uses: { id, caption } entries, plus bare-string
// entries saved by the first version of the field.
const referencedScreenshotIds = async () => {
  const [ids, raw] = await Promise.all([Project.distinct("images.id"), Project.distinct("images")]);
  return [...new Set([...ids, ...raw.filter((x) => typeof x === "string")])];
};

module.exports = { findById, save, removeById, removeUnused, referencedScreenshotIds };
