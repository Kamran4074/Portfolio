// Data access for the settings document (password hash, token version, session lifetimes)
// and refresh-token sessions.
const { Setting, RefreshToken } = require("../../models");

// ── Settings (singleton) ────────────────────────────────────────────────────
const getSetting = () => Setting.findOne().lean();

const getTokenVersion = async () => (await Setting.findOne().select("tokenVersion").lean())?.tokenVersion ?? 0;

const savePassword = (passwordHash, tokenVersion) =>
  Setting.findOneAndUpdate({}, { passwordHash, tokenVersion }, { upsert: true, new: true }).lean();

const saveSessionSettings = (values) => Setting.findOneAndUpdate({}, values, { new: true }).lean();

const bumpTokenVersion = async () =>
  (await Setting.findOneAndUpdate({}, { $inc: { tokenVersion: 1 } }, { new: true }).lean())?.tokenVersion ?? 0;

// ── Refresh-token sessions ──────────────────────────────────────────────────
const createSession = (data) => RefreshToken.create(data);

const findSessionByHash = (tokenHash) => RefreshToken.findOne({ tokenHash }).lean();

// Atomic: only one request can rotate a given token. Returns null if it was already revoked.
const rotateSession = (id, replacedBy) =>
  RefreshToken.findOneAndUpdate({ _id: id, revokedAt: null }, { revokedAt: new Date(), replacedBy }, { new: true }).lean();

const revokeFamily = (family) => RefreshToken.updateMany({ family, revokedAt: null }, { revokedAt: new Date() });

const revokeAllSessions = () => RefreshToken.updateMany({ revokedAt: null }, { revokedAt: new Date() });

const countActiveSessions = () => RefreshToken.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } });

module.exports = {
  getSetting,
  getTokenVersion,
  savePassword,
  saveSessionSettings,
  bumpTokenVersion,
  createSession,
  findSessionByHash,
  rotateSession,
  revokeFamily,
  revokeAllSessions,
  countActiveSessions,
};
