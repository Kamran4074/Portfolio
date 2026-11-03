const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer } = require("../helpers/api");
const { Asset } = require("../../src/models");
const { webp, png, jpeg, project } = require("../helpers/fixtures");

useTestDb();

let token;
beforeEach(async () => {
  token = await seedAdmin();
});

const upload = (api, buf, type = "image/webp") =>
  api.post("/api/screenshots").set(bearer(token)).set("Content-Type", type).send(buf);

// supertest buffers unknown content types; parse images as raw bytes.
const binary = (res, cb) => {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

describe("screenshots", () => {
  test("upload returns an id; the image is served back byte for byte with long caching", async () => {
    const api = client();
    const file = webp("x");
    const { body } = await upload(api, file).expect(201);
    expect(body.id).toMatch(/^[a-f0-9]{12}$/);

    const res = await api.get(`/api/screenshots/${body.id}`).buffer(true).parse(binary).expect(200);
    expect(res.headers["content-type"]).toBe("image/webp");
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(res.body.equals(file)).toBe(true);
  });

  test("a matching ETag gets 304", async () => {
    const api = client();
    const { body } = await upload(api, png()).expect(201);
    const first = await api.get(`/api/screenshots/${body.id}`).expect(200);
    await api.get(`/api/screenshots/${body.id}`).set("If-None-Match", first.headers.etag).expect(304);
  });

  test("the same file uploaded twice is stored once", async () => {
    const api = client();
    const a = await upload(api, jpeg("same"), "image/jpeg").expect(201);
    const b = await upload(api, jpeg("same"), "image/jpeg").expect(201);
    expect(a.body.id).toBe(b.body.id);
    expect(await Asset.countDocuments()).toBe(1);
  });

  test("uploading needs a token", async () => {
    await client().post("/api/screenshots").set("Content-Type", "image/webp").send(webp()).expect(401);
  });

  test("an unknown id is 404", async () => {
    await client().get("/api/screenshots/0123456789ab").expect(404);
  });

  test("a project delete removes screenshots no project uses (after the grace period)", async () => {
    const api = client();
    const kept = (await upload(api, webp("kept")).expect(201)).body.id;
    const dropped = (await upload(api, webp("dropped")).expect(201)).body.id;
    const p1 = await api.post("/api/projects").set(bearer(token)).send(project({ title: "A", images: [{ id: kept }] })).expect(201);
    const p2 = await api.post("/api/projects").set(bearer(token)).send(project({ title: "B", images: [{ id: dropped }] })).expect(201);
    expect(p1.body._id).toBeDefined();

    // Pretend both uploads are old, then delete project B.
    await Asset.collection.updateMany({}, { $set: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) } });
    await api.delete(`/api/projects/${p2.body._id}`).set(bearer(token)).expect(204);

    await api.get(`/api/screenshots/${kept}`).expect(200);
    await api.get(`/api/screenshots/${dropped}`).expect(404);
  });
});

describe("profile photo", () => {
  test("upload sets the profile's photoVersion; remove clears it", async () => {
    const api = client();
    const { body } = await api.put("/api/profile/photo").set(bearer(token)).set("Content-Type", "image/webp").send(webp("me")).expect(200);
    expect(body.photoVersion).toMatch(/^[a-f0-9]{12}$/);
    expect((await api.get("/api/profile").expect(200)).body.photoVersion).toBe(body.photoVersion);

    const res = await api.get(`/api/profile/photo?v=${body.photoVersion}`).expect(200);
    expect(res.headers["cache-control"]).toMatch(/immutable/);

    await api.delete("/api/profile/photo").set(bearer(token)).expect(204);
    await api.get("/api/profile/photo").expect(404);
    expect((await api.get("/api/profile").expect(200)).body.photoVersion).toBeUndefined();
  });

  test("without ?v the photo is cached for 5 minutes only", async () => {
    const api = client();
    await api.put("/api/profile/photo").set(bearer(token)).set("Content-Type", "image/png").send(png()).expect(200);
    const res = await api.get("/api/profile/photo").expect(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
  });
});
