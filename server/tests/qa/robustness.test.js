// Behaviour under bad input and load: limits, unusual requests, response time.
const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer } = require("../helpers/api");
const { project } = require("../helpers/fixtures");
const { MAX_UPLOAD_BYTES } = require("../../src/modules/media/media.constants");

useTestDb();

test("an upload over 1 MB is refused with 413", async () => {
  const token = await seedAdmin();
  const big = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(MAX_UPLOAD_BYTES)]);
  await client().post("/api/screenshots").set(bearer(token)).set("Content-Type", "image/webp").send(big).expect(413);
});

test("an upload sent as JSON instead of image bytes is a 400", async () => {
  const token = await seedAdmin();
  await client().post("/api/screenshots").set(bearer(token)).send({ file: "abc" }).expect(400);
});

test("unknown fields are dropped, not stored", async () => {
  const token = await seedAdmin();
  const { body } = await client().post("/api/projects").set(bearer(token)).send(project({ isAdmin: true, $where: "1" })).expect(201);
  expect(body.isAdmin).toBeUndefined();
  expect(body.$where).toBeUndefined();
});

test("NoSQL operator objects are rejected where strings are expected", async () => {
  await seedAdmin();
  await client().post("/api/auth/login").send({ password: { $ne: "" } }).expect(400);
});

test("unicode and emoji round-trip in captions", async () => {
  const token = await seedAdmin();
  const caption = "रूममेट्स डैशबोर्ड 🏠 — balances";
  const { body } = await client().post("/api/projects").set(bearer(token)).send(project({ images: [{ id: "aaaaaaaaaaaa", caption }] })).expect(201);
  expect(body.images[0].caption).toBe(caption);
});

test("/api/content answers within 500 ms with a full portfolio", async () => {
  const token = await seedAdmin();
  const api = client();
  const images = Array.from({ length: 10 }, (_, i) => ({ id: i.toString(16).padStart(12, "0"), caption: `Screen ${i}` }));
  for (let i = 0; i < 10; i += 1) {
    await api.post("/api/projects").set(bearer(token)).send(project({ title: `Project ${i}`, order: i, images })).expect(201);
  }
  await api.get("/api/content").expect(200); // warm up
  const started = Date.now();
  const { body } = await api.get("/api/content").expect(200);
  expect(Date.now() - started).toBeLessThan(500);
  expect(body.projects).toHaveLength(10);
});

test("an unchanged /api/content is a cheap 304 for a returning visitor", async () => {
  const api = client();
  const first = await api.get("/api/content").expect(200);
  await api.get("/api/content").set("If-None-Match", first.headers.etag).expect(304);
});
