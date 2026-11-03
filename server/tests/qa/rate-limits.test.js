// Abuse protection: each limiter blocks at its limit, per IP, with standard headers.
const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer } = require("../helpers/api");
const { contact, webp } = require("../helpers/fixtures");

useTestDb();

const hit = async (n, fn) => {
  const statuses = [];
  for (let i = 0; i < n; i += 1) statuses.push((await fn()).status);
  return statuses;
};

test("login: 5 attempts per 15 minutes, then 429", async () => {
  await seedAdmin();
  const api = client();
  const statuses = await hit(6, () => api.post("/api/auth/login").send({ password: "guess" }));
  expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);

  const blocked = await api.post("/api/auth/login").send({ password: "guess" });
  expect(blocked.body).toEqual({ error: "Too many attempts. Try again in 15 minutes." });
  expect(blocked.headers["ratelimit-limit"]).toBe("5");
  expect(blocked.headers["retry-after"]).toBeDefined();
});

test("limits are per IP: another visitor is not blocked", async () => {
  await seedAdmin();
  const attacker = client();
  await hit(6, () => attacker.post("/api/auth/login").send({ password: "guess" }));
  await client().post("/api/auth/login").send({ password: "guess" }).expect(401);
});

test("contact form: 5 messages per hour", async () => {
  const api = client();
  const statuses = await hit(6, () => api.post("/api/contact").send(contact()));
  expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
});

test("whole API: 500 requests per 15 minutes per IP", async () => {
  const api = client();
  const statuses = await hit(501, () => api.get("/api/nope"));
  expect(statuses.slice(0, 500).every((s) => s === 404)).toBe(true);
  expect(statuses[500]).toBe(429);
});

test("image requests do not use up the API budget", async () => {
  const api = client();
  await hit(500, () => api.get("/api/screenshots/0123456789ab"));
  await api.get("/api/nope").expect(404); // still allowed
});

test("uploads: 60 per hour", async () => {
  const token = await seedAdmin();
  const api = client();
  const statuses = await hit(61, () => api.post("/api/screenshots").set(bearer(token)).set("Content-Type", "image/webp").send(webp("same")));
  expect(statuses.filter((s) => s === 201)).toHaveLength(60);
  expect(statuses[60]).toBe(429);
});
