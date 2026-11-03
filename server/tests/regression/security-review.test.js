// Fixes from the security review. Each must stay fixed.
const jwt = require("jsonwebtoken");
const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer, PASSWORD } = require("../helpers/api");
const { Message, RateLimit, Asset } = require("../../src/models");
const { url, link } = require("../../src/validators/common");
const { webp, project, profile, contact } = require("../helpers/fixtures");

useTestDb();

const DANGEROUS = ["javascript:alert(document.domain)", "JavaScript:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)"];

describe("links that run code are never stored", () => {
  test.each(DANGEROUS)("web URL fields reject %j", (value) => {
    expect(url.safeParse(value).success).toBe(false);
  });

  test.each(DANGEROUS)("social/stat links reject %j", (value) => {
    expect(link.safeParse(value).success).toBe(false);
  });

  test("safe links still work", () => {
    expect(url.parse("https://github.com/Kamran4074")).toBe("https://github.com/Kamran4074");
    expect(url.parse("")).toBe("");
    for (const ok of ["https://x.com", "mailto:me@example.com", "tel:+917301730616", "#projects", "/resume.pdf"]) {
      expect(link.safeParse(ok).success).toBe(true);
    }
    expect(link.safeParse("//evil.com").success).toBe(false); // protocol-relative: another site
  });

  test("the API refuses a project with a javascript: demo link", async () => {
    const token = await seedAdmin();
    const res = await client().post("/api/projects").set(bearer(token)).send(project({ demoUrl: "javascript:alert(1)" })).expect(400);
    expect(res.body.details[0].field).toBe("demoUrl");
  });

  test("the API refuses a javascript: social link and resume link", async () => {
    const token = await seedAdmin();
    const api = client();
    await api.put("/api/profile").set(bearer(token)).send(profile({ socials: [{ label: "GitHub", url: "javascript:alert(1)" }] })).expect(400);
    await api.put("/api/profile").set(bearer(token)).send(profile({ resumeUrl: "data:text/html,hi" })).expect(400);
    await api.put("/api/profile").set(bearer(token)).send(profile({ socials: [{ label: "Mail", url: "mailto:me@example.com" }] })).expect(200);
  });
});

describe("contact honeypot", () => {
  test("a filled honeypot looks like success to the bot but stores nothing", async () => {
    await client().post("/api/contact").send(contact({ website: "http://spam.example" })).expect(201, { success: true });
    expect(await Message.countDocuments()).toBe(0);
  });

  test("an empty honeypot is a normal message", async () => {
    await client().post("/api/contact").send(contact({ website: "" })).expect(201);
    expect(await Message.countDocuments()).toBe(1);
  });
});

describe("rate limits are shared across server instances", () => {
  test("login attempts are counted in MongoDB, not only in this process", async () => {
    await seedAdmin();
    const api = client();
    await api.post("/api/auth/login").send({ password: "guess" }).expect(401);
    await api.post("/api/auth/login").send({ password: "guess" }).expect(401);
    const row = await RateLimit.findById(`login:${api.ip}`).lean();
    expect(row.hits).toBe(2);
    expect(row.resetAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("JWT algorithm is pinned", () => {
  test("a token signed with another HMAC algorithm is rejected", async () => {
    await seedAdmin();
    const hs512 = jwt.sign({ sub: "admin", role: "admin", typ: "access", tv: 0 }, process.env.JWT_SECRET, { algorithm: "HS512" });
    await client().get("/api/auth/me").set(bearer(hs512)).expect(401);
  });

  test("an unsigned ('none') token is rejected", async () => {
    await seedAdmin();
    const none = jwt.sign({ sub: "admin", role: "admin", typ: "access", tv: 0 }, "", { algorithm: "none" });
    await client().get("/api/auth/me").set(bearer(none)).expect(401);
  });
});

describe("images", () => {
  test("Vercel's CDN may cache screenshots (s-maxage)", async () => {
    const token = await seedAdmin();
    const api = client();
    const { id } = (await api.post("/api/screenshots").set(bearer(token)).set("Content-Type", "image/webp").send(webp("cdn")).expect(201)).body;
    const res = await api.get(`/api/screenshots/${id}`).expect(200);
    expect(res.headers["cache-control"]).toMatch(/s-maxage=31536000/);
  });

  test("a screenshot's phone-size copy is stored with it and not cleaned up", async () => {
    const token = await seedAdmin();
    const api = client();
    const upload = async (seed) => (await api.post("/api/screenshots").set(bearer(token)).set("Content-Type", "image/webp").send(webp(seed)).expect(201)).body.id;
    const id = await upload("large");
    const thumb = await upload("small");
    const { body } = await api.post("/api/projects").set(bearer(token)).send(project({ images: [{ id, thumb, caption: "Dashboard" }] })).expect(201);
    expect(body.images[0]).toEqual({ id, thumb, caption: "Dashboard" });

    await Asset.collection.updateMany({}, { $set: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) } });
    await api.post("/api/projects").set(bearer(token)).send(project({ title: "Other" })).expect(201); // runs cleanup
    await api.get(`/api/screenshots/${thumb}`).expect(200);
  });
});

describe("deploy hook", () => {
  test("without DEPLOY_HOOK_URL nothing is called", async () => {
    const { triggerRebuild } = require("../../src/utils/deployHook");
    const spy = jest.spyOn(global, "fetch");
    await expect(triggerRebuild("test")).resolves.toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("with DEPLOY_HOOK_URL a content change triggers a rebuild; a failure never fails the save", async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.DEPLOY_HOOK_URL = "https://api.vercel.com/v1/integrations/deploy/test";
      const { triggerRebuild } = require("../../src/utils/deployHook");
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new Error("network down"));
      await expect(triggerRebuild("Profile changed")).resolves.toBe(true);
      await expect(triggerRebuild("Profile changed")).resolves.toBe(false);
      expect(fetchSpy).toHaveBeenCalledWith(process.env.DEPLOY_HOOK_URL, expect.objectContaining({ method: "POST" }));
      fetchSpy.mockRestore();
      delete process.env.DEPLOY_HOOK_URL;
    });
  });
});

test("login still works end to end after the hardening", async () => {
  await seedAdmin();
  await client().post("/api/auth/login").send({ password: PASSWORD }).expect(200);
});
