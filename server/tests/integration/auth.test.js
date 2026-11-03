const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer, PASSWORD } = require("../helpers/api");

useTestDb();

describe("POST /api/auth/login", () => {
  test("the right password returns a token that unlocks /me", async () => {
    await seedAdmin();
    const api = client();
    const login = await api.post("/api/auth/login").send({ password: PASSWORD }).expect(200);
    expect(login.body.token).toEqual(expect.any(String));
    await api.get("/api/auth/me").set(bearer(login.body.token)).expect(200, { role: "admin" });
  });

  test("a wrong password is 401", async () => {
    await seedAdmin();
    const res = await client().post("/api/auth/login").send({ password: "nope" }).expect(401);
    expect(res.body).toEqual({ error: "Wrong password" });
  });

  test("a missing password is a validation error", async () => {
    const res = await client().post("/api/auth/login").send({}).expect(400);
    expect(res.body.details[0].field).toBe("password");
  });

  test("with no password stored, login explains how to set one", async () => {
    const res = await client().post("/api/auth/login").send({ password: "x" }).expect(503);
    expect(res.body.error).toMatch(/seed-password/);
  });
});

describe("GET /api/auth/me", () => {
  test("without a token is 401", async () => {
    await client().get("/api/auth/me").expect(401, { error: "Authentication required" });
  });

  test("with a garbage token is 401", async () => {
    await seedAdmin();
    await client().get("/api/auth/me").set(bearer("not.a.jwt")).expect(401);
  });
});

describe("PUT /api/auth/password", () => {
  test("changes the password, returns a new token and signs out older tokens", async () => {
    const oldToken = await seedAdmin();
    const api = client();
    const res = await api
      .put("/api/auth/password")
      .set(bearer(oldToken))
      .send({ currentPassword: PASSWORD, newPassword: "a-much-better-password" })
      .expect(200);

    await api.get("/api/auth/me").set(bearer(res.body.token)).expect(200);
    await api.get("/api/auth/me").set(bearer(oldToken)).expect(401);
    await client().post("/api/auth/login").send({ password: PASSWORD }).expect(401);
    await client().post("/api/auth/login").send({ password: "a-much-better-password" }).expect(200);
  });

  test("a wrong current password is 400 and changes nothing", async () => {
    const token = await seedAdmin();
    await client().put("/api/auth/password").set(bearer(token)).send({ currentPassword: "wrong", newPassword: "a-much-better-password" }).expect(400);
    await client().post("/api/auth/login").send({ password: PASSWORD }).expect(200);
  });

  test("a short new password is rejected", async () => {
    const token = await seedAdmin();
    await client().put("/api/auth/password").set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: "short" }).expect(400);
  });
});
