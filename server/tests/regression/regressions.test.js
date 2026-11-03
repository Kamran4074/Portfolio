// One test per behaviour that broke, or would quietly break, if someone "simplified" it.
// Each name says what must stay true; the comment says why.
const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer, PASSWORD } = require("../helpers/api");
const { Asset, Project, Profile } = require("../../src/models");
const assets = require("../../src/modules/media/asset.repository");
const { seedContent } = require("../../src/seed");
const { webp, project } = require("../helpers/fixtures");

useTestDb();

const HOURS = 60 * 60 * 1000;
const ageAllAssets = (ms) => Asset.collection.updateMany({}, { $set: { createdAt: new Date(Date.now() - ms) } });

test("a password change signs out every token issued before it", async () => {
  // Without tokenVersion a stolen token would stay valid for 2h after the change.
  const oldToken = await seedAdmin();
  await client().put("/api/auth/password").set(bearer(oldToken)).send({ currentPassword: PASSWORD, newPassword: "new-password-123" }).expect(200);
  await client().get("/api/auth/me").set(bearer(oldToken)).expect(401, { error: "Session expired, please log in again", code: "SESSION_EXPIRED" });
});

describe("refresh tokens", () => {
  const XHR = { "X-Requested-With": "XMLHttpRequest" };
  const cookieOf = (res) => res.headers["set-cookie"].find((c) => c.startsWith("refresh_token=")).split(";")[0];
  const login = async (api) => cookieOf(await api.post("/api/auth/login").send({ password: PASSWORD }).expect(200));
  const { RefreshToken } = require("../../src/models");

  test("a stolen, already-rotated refresh token ends that login for the attacker and the owner", async () => {
    // Rotation alone is not enough: replaying an old token must also kill the new one.
    await seedAdmin();
    const api = client();
    const stolen = await login(api);
    const owners = cookieOf(await api.post("/api/auth/refresh").set(XHR).set("Cookie", stolen).expect(200));
    // Move the rotation outside the race grace window, as if the thief replays it later.
    await RefreshToken.updateMany({ revokedAt: { $ne: null } }, { $set: { revokedAt: new Date(Date.now() - 60 * 1000) } });

    await client().post("/api/auth/refresh").set(XHR).set("Cookie", stolen).expect(401);
    await api.post("/api/auth/refresh").set(XHR).set("Cookie", owners).expect(401);
  });

  test("two tabs refreshing at once do not sign the user out", async () => {
    // The loser of the race gets REFRESH_RACE (no revocation) and retries with the new cookie.
    await seedAdmin();
    const api = client();
    const cookie = await login(api);
    const [a, b] = await Promise.all([
      api.post("/api/auth/refresh").set(XHR).set("Cookie", cookie),
      api.post("/api/auth/refresh").set(XHR).set("Cookie", cookie),
    ]);
    const winner = [a, b].find((r) => r.status === 200);
    const loser = [a, b].find((r) => r !== winner);
    expect(winner).toBeDefined();
    if (loser.status !== 200) expect(loser.body.code).toBe("REFRESH_RACE");
    await api.post("/api/auth/refresh").set(XHR).set("Cookie", cookieOf(winner)).expect(200);
  });

  test("raw refresh tokens are never stored, only their hash", async () => {
    await seedAdmin();
    const cookie = await login(client());
    const raw = cookie.split("=")[1];
    const rows = await RefreshToken.find().lean();
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(raw);
  });

  test("the pre-refresh-token 2h JWT is no longer accepted", async () => {
    await seedAdmin();
    const legacy = require("jsonwebtoken").sign({ sub: "admin", role: "admin", tv: 0 }, process.env.JWT_SECRET, { expiresIn: "2h" });
    await client().get("/api/auth/me").set(bearer(legacy)).expect(401);
  });
});

test("seeding never overwrites content edited in /settings", async () => {
  // The server auto-seeds on every cold start; it must only fill empty collections.
  await Profile.create({ name: "Edited in settings", title: "Custom" });
  await seedContent();
  const profiles = await Profile.find().lean();
  expect(profiles).toHaveLength(1);
  expect(profiles[0].name).toBe("Edited in settings");
  expect(await Project.countDocuments()).toBeGreaterThan(0); // empty collections were filled
});

test("bare screenshot ids from the first version of the field are still accepted", async () => {
  // The first release sent images: ["<id>"]; old admin tabs may still send that shape.
  const token = await seedAdmin();
  const { body } = await client().post("/api/projects").set(bearer(token)).send(project({ images: ["aaaaaaaaaaaa"] })).expect(201);
  expect(body.images).toEqual([{ id: "aaaaaaaaaaaa", caption: "" }]);
});

test("screenshots stored as bare strings are not deleted by the cleanup", async () => {
  // Documents written by the first version hold plain strings; cleanup must count them as used.
  const token = await seedAdmin();
  const api = client();
  const { id } = (await api.post("/api/screenshots").set(bearer(token)).set("Content-Type", "image/webp").send(webp("legacy")).expect(201)).body;
  await Project.collection.insertOne({ title: "Legacy", images: [id], order: 5 });
  await ageAllAssets(2 * HOURS);

  expect(await assets.referencedScreenshotIds()).toContain(id);
  await api.post("/api/projects").set(bearer(token)).send(project()).expect(201); // triggers cleanup
  await api.get(`/api/screenshots/${id}`).expect(200);
});

test("a fresh upload survives cleanup while its form is still open", async () => {
  // Uploads happen before Save; a save of another project in between must not delete them.
  const token = await seedAdmin();
  const api = client();
  const { id } = (await api.post("/api/screenshots").set(bearer(token)).set("Content-Type", "image/webp").send(webp("draft")).expect(201)).body;
  await api.post("/api/projects").set(bearer(token)).send(project({ title: "Other" })).expect(201);
  await api.get(`/api/screenshots/${id}`).expect(200);
});

test("more than 10 screenshots, or the same one twice, is rejected", async () => {
  const token = await seedAdmin();
  const eleven = Array.from({ length: 11 }, (_, i) => ({ id: i.toString(16).padStart(12, "0") }));
  await client().post("/api/projects").set(bearer(token)).send(project({ images: eleven })).expect(400);
  const twice = [{ id: "aaaaaaaaaaaa" }, { id: "aaaaaaaaaaaa" }];
  await client().post("/api/projects").set(bearer(token)).send(project({ images: twice })).expect(400);
});

test("a file disguised with an image Content-Type is rejected", async () => {
  // The type is read from the file's bytes, never trusted from the header.
  const token = await seedAdmin();
  const res = await client().post("/api/screenshots").set(bearer(token)).set("Content-Type", "image/png").send(Buffer.from("<script>alert(1)</script>"));
  expect(res.status).toBe(415);
  expect(await Asset.countDocuments()).toBe(0);
});

test("an SVG upload is rejected (it can carry script)", async () => {
  const token = await seedAdmin();
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  await client().post("/api/screenshots").set(bearer(token)).set("Content-Type", "image/svg+xml").send(svg).expect(415);
});

test("a malformed id is a 400, not a 500", async () => {
  const token = await seedAdmin();
  await client().put("/api/projects/not-an-id").set(bearer(token)).send(project()).expect(400);
  await client().delete("/api/messages/123").set(bearer(token)).expect(400);
});

test("a failed screenshot cleanup does not fail the project save", async () => {
  const token = await seedAdmin();
  const spy = jest.spyOn(assets, "referencedScreenshotIds").mockRejectedValue(new Error("db hiccup"));
  await client().post("/api/projects").set(bearer(token)).send(project()).expect(201);
  spy.mockRestore();
});

test("images can be shown on the site's own origin (CORP cross-origin)", async () => {
  // The site and the API are on different domains; helmet's default would block the <img>.
  const token = await seedAdmin();
  const api = client();
  const { id } = (await api.post("/api/screenshots").set(bearer(token)).set("Content-Type", "image/webp").send(webp()).expect(201)).body;
  const res = await api.get(`/api/screenshots/${id}`).expect(200);
  expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
});

test("captions are trimmed and saved per screenshot, not shared", async () => {
  const token = await seedAdmin();
  const images = [{ id: "aaaaaaaaaaaa", caption: "  One  " }, { id: "bbbbbbbbbbbb", caption: "Two" }];
  const { body } = await client().post("/api/projects").set(bearer(token)).send(project({ images })).expect(201);
  expect(body.images.map((i) => i.caption)).toEqual(["One", "Two"]);
});
