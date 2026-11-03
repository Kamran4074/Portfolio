const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer, PASSWORD } = require("../helpers/api");
const { RefreshToken } = require("../../src/models");

useTestDb();

const XHR = { "X-Requested-With": "XMLHttpRequest" };

// The refresh-token cookie from a response, as a Cookie header value.
const cookieOf = (res) => {
  const raw = (res.headers["set-cookie"] || []).find((c) => c.startsWith("refresh_token="));
  return raw ? raw.split(";")[0] : null;
};

async function login(api = client()) {
  const res = await api.post("/api/auth/login").send({ password: PASSWORD }).expect(200);
  return { api, res, accessToken: res.body.accessToken, cookie: cookieOf(res) };
}

const refresh = (api, cookie) => api.post("/api/auth/refresh").set(XHR).set("Cookie", cookie || "");

describe("POST /api/auth/login", () => {
  test("returns an access token in the body and the refresh token as an HttpOnly cookie", async () => {
    await seedAdmin();
    const { res, accessToken, cookie } = await login();
    expect(res.body).toEqual({ accessToken, expiresIn: 900, token: accessToken });
    expect(cookie).toMatch(/^refresh_token=[\w-]{43}$/);
    expect(JSON.stringify(res.body)).not.toContain(cookie.split("=")[1]);

    const setCookie = res.headers["set-cookie"][0];
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Path=\/api\/auth/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Expires=/);
  });

  test("the access token unlocks admin routes", async () => {
    await seedAdmin();
    const { api, accessToken } = await login();
    const me = await api.get("/api/auth/me").set(bearer(accessToken)).expect(200);
    expect(me.body.role).toBe("admin");
    expect(me.body.expiresAt).toBeGreaterThan(Date.now());
  });

  test("a wrong password is 401 and sets no cookie", async () => {
    await seedAdmin();
    const res = await client().post("/api/auth/login").send({ password: "nope" }).expect(401);
    expect(res.body).toEqual({ error: "Wrong password" });
    expect(cookieOf(res)).toBeNull();
  });

  test("with no password stored, login explains how to set one", async () => {
    const res = await client().post("/api/auth/login").send({ password: "x" }).expect(503);
    expect(res.body.error).toMatch(/seed-password/);
  });
});

describe("POST /api/auth/refresh", () => {
  test("swaps the refresh cookie for a new access token and a rotated cookie", async () => {
    await seedAdmin();
    const { api, cookie } = await login();
    const res = await refresh(api, cookie).expect(200);
    const next = cookieOf(res);
    expect(next).toBeTruthy();
    expect(next).not.toBe(cookie);
    await api.get("/api/auth/me").set(bearer(res.body.accessToken)).expect(200);
    await refresh(api, next).expect(200);
  });

  test("without a cookie it is 401 NO_SESSION (the normal check on page load)", async () => {
    const res = await refresh(client()).expect(401);
    expect(res.body.code).toBe("NO_SESSION");
  });

  test("needs the X-Requested-With header (CSRF guard)", async () => {
    await seedAdmin();
    const { api, cookie } = await login();
    await api.post("/api/auth/refresh").set("Cookie", cookie).expect(403);
  });

  test("an unknown token clears the cookie", async () => {
    const res = await refresh(client(), "refresh_token=made-up-token").expect(401);
    expect(res.body.code).toBe("SESSION_EXPIRED");
    expect(res.headers["set-cookie"][0]).toMatch(/refresh_token=;.*Expires=Thu, 01 Jan 1970/);
  });
});

describe("logout", () => {
  test("ends the session: the refresh token stops working and the cookie is cleared", async () => {
    await seedAdmin();
    const { api, cookie } = await login();
    const res = await api.post("/api/auth/logout").set(XHR).set("Cookie", cookie).expect(204);
    expect(res.headers["set-cookie"][0]).toMatch(/refresh_token=;/);
    await refresh(api, cookie).expect(401);
  });

  test("only ends this login, not others", async () => {
    await seedAdmin();
    const laptop = await login();
    const phone = await login();
    await laptop.api.post("/api/auth/logout").set(XHR).set("Cookie", laptop.cookie).expect(204);
    await refresh(phone.api, phone.cookie).expect(200);
  });

  test("logout-all signs out every session, including current access tokens", async () => {
    await seedAdmin();
    const laptop = await login();
    const phone = await login();
    await laptop.api.post("/api/auth/logout-all").set(bearer(laptop.accessToken)).expect(204);
    await refresh(phone.api, phone.cookie).expect(401);
    await phone.api.get("/api/auth/me").set(bearer(phone.accessToken)).expect(401);
    expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(0);
  });
});

describe("PUT /api/auth/password", () => {
  test("signs out every other session; this one gets fresh tokens", async () => {
    await seedAdmin();
    const me = await login();
    const other = await login();
    const res = await me.api
      .put("/api/auth/password")
      .set(bearer(me.accessToken))
      .send({ currentPassword: PASSWORD, newPassword: "a-much-better-password" })
      .expect(200);

    await me.api.get("/api/auth/me").set(bearer(res.body.accessToken)).expect(200);
    await refresh(me.api, cookieOf(res)).expect(200);
    await me.api.get("/api/auth/me").set(bearer(me.accessToken)).expect(401);
    await refresh(other.api, other.cookie).expect(401);
    await client().post("/api/auth/login").send({ password: "a-much-better-password" }).expect(200);
  });

  test("a wrong current password is 400 and changes nothing", async () => {
    await seedAdmin();
    const { api, accessToken } = await login();
    await api.put("/api/auth/password").set(bearer(accessToken)).send({ currentPassword: "wrong", newPassword: "a-much-better-password" }).expect(400);
    await client().post("/api/auth/login").send({ password: PASSWORD }).expect(200);
  });

  test("a short new password is rejected", async () => {
    const token = await seedAdmin();
    await client().put("/api/auth/password").set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: "short" }).expect(400);
  });
});

describe("session settings (Security tab)", () => {
  test("defaults, then a change applies to the next login", async () => {
    await seedAdmin();
    const { api, accessToken } = await login();
    const before = await api.get("/api/auth/settings").set(bearer(accessToken)).expect(200);
    expect(before.body).toMatchObject({ accessTokenMinutes: 15, refreshTokenDays: 7, activeSessions: 1 });

    const saved = await api.put("/api/auth/settings").set(bearer(accessToken)).send({ accessTokenMinutes: 30, refreshTokenDays: 14 }).expect(200);
    expect(saved.body).toMatchObject({ accessTokenMinutes: 30, refreshTokenDays: 14 });

    const next = await login();
    expect(next.res.body.expiresIn).toBe(30 * 60);
    const expires = new Date(next.res.headers["set-cookie"][0].match(/Expires=([^;]+)/)[1]);
    expect(expires.getTime() - Date.now()).toBeGreaterThan(13 * 24 * 60 * 60 * 1000);
  });

  test("values outside the limits are rejected", async () => {
    const token = await seedAdmin();
    const res = await client().put("/api/auth/settings").set(bearer(token)).send({ accessTokenMinutes: 1, refreshTokenDays: 365 }).expect(400);
    expect(res.body.details.map((d) => d.field).sort()).toEqual(["accessTokenMinutes", "refreshTokenDays"]);
  });

  test("needs a token", async () => {
    await client().get("/api/auth/settings").expect(401);
    await client().put("/api/auth/settings").send({ accessTokenMinutes: 30, refreshTokenDays: 7 }).expect(401);
  });
});

describe("GET /api/auth/me", () => {
  test("without a token is 401; with garbage is 401", async () => {
    await client().get("/api/auth/me").expect(401, { error: "Authentication required" });
    await seedAdmin();
    await client().get("/api/auth/me").set(bearer("not.a.jwt")).expect(401);
  });
});
