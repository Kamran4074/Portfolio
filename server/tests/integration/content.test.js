const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer } = require("../helpers/api");
const { profile, project } = require("../helpers/fixtures");

useTestDb();

describe("GET /api/content", () => {
  test("returns every section in one response, revalidated on each load", async () => {
    const token = await seedAdmin();
    const api = client();
    await api.put("/api/profile").set(bearer(token)).send(profile()).expect(200);
    await api.post("/api/projects").set(bearer(token)).send(project()).expect(201);

    const res = await api.get("/api/content").expect(200);
    expect(res.headers["cache-control"]).toBe("no-cache");
    expect(Object.keys(res.body).sort()).toEqual(
      ["achievements", "certifications", "education", "experience", "profile", "projects", "skills"].sort()
    );
    expect(res.body.profile.name).toBe("Kamran Alam");
    expect(res.body.projects[0].title).toBe("RooMates");
  });

  test("works on an empty database", async () => {
    const { body } = await client().get("/api/content").expect(200);
    expect(body.profile).toBeNull();
    expect(body.projects).toEqual([]);
  });
});

describe("/api/profile", () => {
  test("PUT needs a token", async () => {
    await client().put("/api/profile").send(profile()).expect(401);
  });

  test("PUT saves and GET returns it", async () => {
    const token = await seedAdmin();
    const api = client();
    await api.put("/api/profile").set(bearer(token)).send(profile({ location: "Ghaziabad" })).expect(200);
    expect((await api.get("/api/profile").expect(200)).body).toMatchObject({ name: "Kamran Alam", location: "Ghaziabad" });
  });

  test("PUT cannot set photoVersion (only an upload can)", async () => {
    const token = await seedAdmin();
    const api = client();
    await api.put("/api/profile").set(bearer(token)).send(profile({ photoVersion: "aaaaaaaaaaaa" })).expect(200);
    expect((await api.get("/api/profile").expect(200)).body.photoVersion).toBeUndefined();
  });
});
