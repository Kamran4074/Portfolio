// HTTP helpers around supertest.
const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const { Setting } = require("../../src/models");
const authService = require("../../src/modules/auth/auth.service");

const PASSWORD = "correct-horse-battery";

// Rate limits count per IP. Each call gives a new client IP (the app trusts one proxy,
// so X-Forwarded-For is the client), so tests never share a counter by accident.
let n = 0;
const freshIp = () => {
  n += 1;
  return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
};

// supertest bound to one client IP.
function client(ip = freshIp()) {
  const wrap = (method) => (url) => request(app)[method](url).set("X-Forwarded-For", ip);
  return { ip, get: wrap("get"), post: wrap("post"), put: wrap("put"), patch: wrap("patch"), delete: wrap("delete") };
}

// Stores the admin password (low bcrypt cost keeps tests fast) and returns a valid token.
async function seedAdmin({ password = PASSWORD, tokenVersion = 0 } = {}) {
  await Setting.deleteMany({});
  await Setting.create({ passwordHash: await bcrypt.hash(password, 4), tokenVersion });
  return authService.signToken(tokenVersion);
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, client, freshIp, seedAdmin, bearer, PASSWORD };
