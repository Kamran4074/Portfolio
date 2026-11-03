jest.mock("../../src/modules/auth/auth.repository");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const repo = require("../../src/modules/auth/auth.repository");
const auth = require("../../src/modules/auth/auth.service");
const env = require("../../src/config/env");

let hash;
beforeAll(async () => {
  hash = await bcrypt.hash("right-password", 4);
});
beforeEach(() => {
  jest.resetAllMocks();
  repo.getSetting.mockResolvedValue({ passwordHash: hash, tokenVersion: 3 });
  repo.getTokenVersion.mockResolvedValue(3);
});

describe("login", () => {
  test("returns a 2h admin token carrying the token version", async () => {
    const token = await auth.login("right-password");
    const payload = jwt.verify(token, env.JWT_SECRET);
    expect(payload).toMatchObject({ sub: "admin", role: "admin", tv: 3 });
    expect(payload.exp - payload.iat).toBe(2 * 60 * 60);
  });

  test("wrong password is a 401 with a log reason", async () => {
    await expect(auth.login("wrong")).rejects.toMatchObject({ status: 401, message: "Wrong password", reason: "wrong password" });
  });

  test("no password stored is a 503 telling how to set one", async () => {
    repo.getSetting.mockResolvedValue(null);
    await expect(auth.login("anything")).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/seed-password/) });
  });
});

describe("changePassword", () => {
  test("stores a new bcrypt hash and bumps the token version", async () => {
    repo.savePassword.mockResolvedValue({});
    const { token, tokenVersion } = await auth.changePassword("right-password", "brand-new-password");
    expect(tokenVersion).toBe(4);
    const [newHash, version] = repo.savePassword.mock.calls[0];
    expect(version).toBe(4);
    expect(await bcrypt.compare("brand-new-password", newHash)).toBe(true);
    expect(jwt.verify(token, env.JWT_SECRET).tv).toBe(4);
  });

  test("wrong current password changes nothing", async () => {
    await expect(auth.changePassword("wrong", "brand-new-password")).rejects.toMatchObject({ status: 400 });
    expect(repo.savePassword).not.toHaveBeenCalled();
  });
});

describe("authenticate", () => {
  test("accepts a current token", async () => {
    await expect(auth.authenticate(auth.signToken(3))).resolves.toMatchObject({ role: "admin" });
  });

  test("rejects a token from before a password change", async () => {
    await expect(auth.authenticate(auth.signToken(2))).rejects.toMatchObject({ status: 401, reason: "token from before a password change" });
  });

  test("rejects an expired token", async () => {
    const token = jwt.sign({ role: "admin", tv: 3 }, env.JWT_SECRET, { expiresIn: -10 });
    await expect(auth.authenticate(token)).rejects.toMatchObject({ status: 401, reason: "token expired" });
  });

  test("rejects a token signed with another secret", async () => {
    const token = jwt.sign({ role: "admin", tv: 3 }, "some-other-secret-value-1234");
    await expect(auth.authenticate(token)).rejects.toMatchObject({ status: 401, reason: "invalid token" });
  });

  test("rejects a non-admin role", async () => {
    const token = jwt.sign({ role: "viewer", tv: 3 }, env.JWT_SECRET);
    await expect(auth.authenticate(token)).rejects.toMatchObject({ status: 401, reason: "wrong role" });
  });
});
