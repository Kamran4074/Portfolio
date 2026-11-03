// Data access for the singleton settings document (password hash + token version).
const { Setting } = require("../../models");

const getSetting = () => Setting.findOne().lean();

const getTokenVersion = async () => (await Setting.findOne().select("tokenVersion").lean())?.tokenVersion ?? 0;

const savePassword = (passwordHash, tokenVersion) =>
  Setting.findOneAndUpdate({}, { passwordHash, tokenVersion }, { upsert: true, new: true }).lean();

module.exports = { getSetting, getTokenVersion, savePassword };
