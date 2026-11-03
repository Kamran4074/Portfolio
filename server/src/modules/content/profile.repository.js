// Data access for the singleton profile document.
const { Profile } = require("../../models");

const get = () => Profile.findOne().lean();

const update = (data) => Profile.findOneAndUpdate({}, data, { new: true, upsert: true, runValidators: true }).lean();

const unset = (field) => Profile.updateOne({}, { $unset: { [field]: 1 } });

module.exports = { get, update, unset };
