jest.mock("../../src/modules/auth/auth.repository");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const repo = require("../../src/modules/auth/auth.repository");
const auth = require("../../src/modules/auth/auth.service");
const policy = require("../../src/modules/auth/auth.policy");
const env = require("../../src/config/env");

const DAY = 24 * 60 * 60 * 1000;
let hash;
let setting;

beforeAll(async () => {
  hash = await bcrypt.hash("right-password", 4);
});
beforeEach(() => {
  jest.resetAllMocks();
  setting = { passwordHash: hash, tokenVersion: 3 };
  repo.getSetting.mockImplementation(async () => setting);
  repo.getTokenVersion.mockImplementation(async () => setting.tokenVersion);
  repo.createSession.mockResolvedValue({});
  repo.rotateSession.mockResolvedValue({});
});

const session = (overrides = {}) => ({
  _id: "s1",
  family: "fam-1",
  tokenVersion: 3,
  expiresAt: new Date(Date.now() + DAY),
  revokedAt: null,
  ...overrides,
});

describe("login", () => {
  test("issues an access JWT and a refresh token stored only as a hash", async () => {
    const t = await auth.login("right-password", { ip: "1.2.3.4", userAgent: "jest" });
    const payload = jwt.verify(t.accessToken, env.JWT_SECRET);
    expect(payload).toMatchObject({ sub: "admin", role: "admin", typ: "access", tv: 3 });
    expect(payload.exp - payload.iat).toBe(policy.accessTokenMinutes.default * 60);
    expect(t.expiresIn).toBe(policy.accessTokenMinutes.default * 60);

    expect(t.refreshToken).toMatch(/^[\w-]{43}$/); // 32 random bytes, base64url
    const stored = repo.createSession.mock.calls[0][0];
    expect(stored.tokenHash).toBe(auth.hashToken(t.refreshToken));
    expect(JSON.stringify(stored)).not.toContain(t.refreshToken);
    expect(stored).toMatchObject({ tokenVersion: 3, ip: "1.2.3.4", userAgent: "jest" });
    expect(stored.expiresAt.getTime() - Date.now()).toBeCloseTo(policy.refreshTokenDays.default * DAY, -4);
  });

  test("uses the lifetimes set in the Security tab", async () => {
    setting = { ...setting, accessTokenMinutes: 30, refreshTokenDays: 2 };
    const t = await auth.login("right-password");
    const payload = jwt.decode(t.accessToken);
    expect(payload.exp - payload.iat).toBe(30 * 60);
    expect(t.refreshExpiresAt.getTime() - Date.now()).toBeCloseTo(2 * DAY, -4);
  });

  test("stored lifetimes outside the limits are clamped", async () => {
    setting = { ...setting, accessTokenMinutes: 100000, refreshTokenDays: 0 };
    const t = await auth.login("right-password");
    const payload = jwt.decode(t.accessToken);
    expect(payload.exp - payload.iat).toBe(policy.accessTokenMinutes.max * 60);
    expect(t.refreshExpiresAt.getTime() - Date.now()).toBeCloseTo(policy.refreshTokenDays.min * DAY, -4);
  });

  test("every login gets a different refresh token and a new family", async () => {
    const a = await auth.login("right-password");
    const b = await auth.login("right-password");
    expect(a.refreshToken).not.toBe(b.refreshToken);
    expect(repo.createSession.mock.calls[0][0].family).not.toBe(repo.createSession.mock.calls[1][0].family);
  });

  test("wrong password is 401; no stored password is 503", async () => {
    await expect(auth.login("wrong")).rejects.toMatchObject({ status: 401, reason: "wrong password" });
    setting = null;
    await expect(auth.login("x")).rejects.toMatchObject({ status: 503 });
    expect(repo.createSession).not.toHaveBeenCalled();
  });
});

describe("refresh", () => {
  test("rotates: old token revoked, new one in the same family", async () => {
    repo.findSessionByHash.mockResolvedValue(session());
    const t = await auth.refresh("old-raw-token");
    expect(repo.findSessionByHash).toHaveBeenCalledWith(auth.hashToken("old-raw-token"));
    expect(repo.rotateSession).toHaveBeenCalledWith("s1", auth.hashToken(t.refreshToken));
    expect(repo.createSession.mock.calls[0][0]).toMatchObject({ family: "fam-1", tokenHash: auth.hashToken(t.refreshToken) });
    expect(jwt.verify(t.accessToken, env.JWT_SECRET).tv).toBe(3);
  });

  test("no cookie is NO_SESSION; an unknown token is SESSION_EXPIRED", async () => {
    await expect(auth.refresh(null)).rejects.toMatchObject({ status: 401, code: "NO_SESSION" });
    repo.findSessionByHash.mockResolvedValue(null);
    await expect(auth.refresh("nope")).rejects.toMatchObject({ status: 401, code: "SESSION_EXPIRED" });
  });

  test("reusing a rotated token revokes the whole family (theft detection)", async () => {
    repo.findSessionByHash.mockResolvedValue(session({ revokedAt: new Date(Date.now() - 60 * 1000), replacedBy: "x" }));
    await expect(auth.refresh("stolen")).rejects.toMatchObject({ status: 401, code: "SESSION_EXPIRED" });
    expect(repo.revokeFamily).toHaveBeenCalledWith("fam-1");
    expect(repo.createSession).not.toHaveBeenCalled();
  });

  test("reuse within the grace window is a race, not theft: nothing revoked", async () => {
    repo.findSessionByHash.mockResolvedValue(session({ revokedAt: new Date(), replacedBy: "x" }));
    await expect(auth.refresh("tab-2")).rejects.toMatchObject({ status: 401, code: "REFRESH_RACE" });
    expect(repo.revokeFamily).not.toHaveBeenCalled();
  });

  test("losing the atomic rotation is a race and issues nothing", async () => {
    repo.findSessionByHash.mockResolvedValue(session());
    repo.rotateSession.mockResolvedValue(null);
    await expect(auth.refresh("raw")).rejects.toMatchObject({ code: "REFRESH_RACE" });
    expect(repo.createSession).not.toHaveBeenCalled();
    expect(repo.revokeFamily).not.toHaveBeenCalled();
  });

  test("an expired refresh token is rejected", async () => {
    repo.findSessionByHash.mockResolvedValue(session({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(auth.refresh("raw")).rejects.toMatchObject({ status: 401, reason: "refresh token expired" });
  });

  test("a refresh token from before a password change is rejected and its family revoked", async () => {
    repo.findSessionByHash.mockResolvedValue(session({ tokenVersion: 2 }));
    await expect(auth.refresh("raw")).rejects.toMatchObject({ status: 401 });
    expect(repo.revokeFamily).toHaveBeenCalledWith("fam-1");
  });
});

describe("logout, logoutAll, changePassword", () => {
  test("logout revokes this login's family; without a cookie it is a no-op", async () => {
    repo.findSessionByHash.mockResolvedValue(session());
    await auth.logout("raw");
    expect(repo.revokeFamily).toHaveBeenCalledWith("fam-1");
    await auth.logout(null);
    expect(repo.revokeFamily).toHaveBeenCalledTimes(1);
  });

  test("logoutAll invalidates access tokens (version bump) and every refresh token", async () => {
    await auth.logoutAll();
    expect(repo.bumpTokenVersion).toHaveBeenCalled();
    expect(repo.revokeAllSessions).toHaveBeenCalled();
  });

  test("changePassword revokes every session before issuing this one's new tokens", async () => {
    repo.savePassword.mockImplementation(async (passwordHash, tokenVersion) => ({ passwordHash, tokenVersion }));
    const t = await auth.changePassword("right-password", "brand-new-password");
    expect(t.tokenVersion).toBe(4);
    expect(await bcrypt.compare("brand-new-password", repo.savePassword.mock.calls[0][0])).toBe(true);
    expect(repo.revokeAllSessions.mock.invocationCallOrder[0]).toBeLessThan(repo.createSession.mock.invocationCallOrder[0]);
    expect(jwt.decode(t.accessToken).tv).toBe(4);
  });

  test("a wrong current password changes nothing", async () => {
    await expect(auth.changePassword("wrong", "brand-new-password")).rejects.toMatchObject({ status: 400 });
    expect(repo.savePassword).not.toHaveBeenCalled();
    expect(repo.revokeAllSessions).not.toHaveBeenCalled();
  });
});

describe("authenticate", () => {
  test("accepts a current access token", async () => {
    await expect(auth.authenticate(auth.signAccessToken(3))).resolves.toMatchObject({ role: "admin" });
  });

  test("rejects a token from before a password change", async () => {
    await expect(auth.authenticate(auth.signAccessToken(2))).rejects.toMatchObject({ status: 401, code: "SESSION_EXPIRED" });
  });

  test("an expired access token says TOKEN_EXPIRED so the client refreshes", async () => {
    const token = jwt.sign({ role: "admin", typ: "access", tv: 3 }, env.JWT_SECRET, { expiresIn: -10 });
    await expect(auth.authenticate(token)).rejects.toMatchObject({ status: 401, code: "TOKEN_EXPIRED" });
  });

  test("rejects a token signed with another secret", async () => {
    const token = jwt.sign({ role: "admin", typ: "access", tv: 3 }, "some-other-secret-value-1234");
    await expect(auth.authenticate(token)).rejects.toMatchObject({ status: 401, reason: "invalid token" });
  });

  test("rejects a JWT that is not an access token (e.g. the old 2h token)", async () => {
    const token = jwt.sign({ role: "admin", tv: 3 }, env.JWT_SECRET);
    await expect(auth.authenticate(token)).rejects.toMatchObject({ status: 401, reason: "wrong token type" });
  });
});

describe("session settings", () => {
  test("returns defaults, limits and the active session count", async () => {
    repo.countActiveSessions.mockResolvedValue(2);
    await expect(auth.getSessionSettings()).resolves.toEqual({
      accessTokenMinutes: 15,
      refreshTokenDays: 7,
      activeSessions: 2,
      limits: { accessTokenMinutes: policy.accessTokenMinutes, refreshTokenDays: policy.refreshTokenDays },
    });
  });
});
