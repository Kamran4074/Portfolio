const { useTestDb } = require("../helpers/db");
const { client } = require("../helpers/api");
const { Heartbeat } = require("../../src/models");

useTestDb();

describe("health", () => {
  test("/api/health reports the database as up", async () => {
    const { body } = await client().get("/api/health").expect(200);
    expect(body).toMatchObject({ status: "ok", db: "up" });
  });

  test("/api/health/db with the token writes a heartbeat", async () => {
    const api = client();
    await api.get("/api/health/db?token=keepalive-test-token").expect(200);
    const { body } = await api.get("/api/health/db").set("x-keepalive-token", "keepalive-test-token").expect(200);
    expect(body).toMatchObject({ status: "ok", db: "up", pings: 2 });
    expect((await Heartbeat.findById("keepalive").lean()).count).toBe(2);
  });

  test("Vercel Cron's bearer secret is accepted", async () => {
    await client().get("/api/health/db").set("Authorization", "Bearer cron-test-secret").expect(200);
  });

  test("a wrong or missing token is 401", async () => {
    await client().get("/api/health/db?token=wrong").expect(401);
    await client().get("/api/health/db").expect(401);
  });
});
