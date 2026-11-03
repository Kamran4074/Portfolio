const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer } = require("../helpers/api");
const { project } = require("../helpers/fixtures");

useTestDb();

let token;
beforeEach(async () => {
  token = await seedAdmin();
});

describe("projects CRUD", () => {
  test("create, read, update and delete a project", async () => {
    const api = client();
    const created = await api.post("/api/projects").set(bearer(token)).send(project()).expect(201);
    const id = created.body._id;
    expect(created.body).toMatchObject({ title: "RooMates", featured: true, images: [] });

    await api.put(`/api/projects/${id}`).set(bearer(token)).send(project({ title: "RooMates v2" })).expect(200);
    const list = await api.get("/api/projects").expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].title).toBe("RooMates v2");

    await api.delete(`/api/projects/${id}`).set(bearer(token)).expect(204);
    expect((await api.get("/api/projects").expect(200)).body).toEqual([]);
  });

  test("the public list is sorted by order", async () => {
    const api = client();
    for (const [title, order] of [["C", 2], ["A", 0], ["B", 1]]) {
      await api.post("/api/projects").set(bearer(token)).send(project({ title, order })).expect(201);
    }
    const { body } = await api.get("/api/projects").expect(200);
    expect(body.map((p) => p.title)).toEqual(["A", "B", "C"]);
  });

  test("screenshots are stored with captions, in order", async () => {
    const images = [
      { id: "aaaaaaaaaaaa", caption: "Dashboard with balances" },
      { id: "bbbbbbbbbbbb", caption: "Settle-up suggestions" },
    ];
    const { body } = await client().post("/api/projects").set(bearer(token)).send(project({ images })).expect(201);
    expect(body.images).toEqual(images);
  });

  test("writes need a token; reads do not", async () => {
    const api = client();
    await api.post("/api/projects").send(project()).expect(401);
    await api.get("/api/projects").expect(200);
  });

  test("updating or deleting a missing id is 404", async () => {
    const api = client();
    const missing = "507f1f77bcf86cd799439011";
    await api.put(`/api/projects/${missing}`).set(bearer(token)).send(project()).expect(404);
    await api.delete(`/api/projects/${missing}`).set(bearer(token)).expect(404);
  });

  test("an invalid body is 400 with the failing fields", async () => {
    const res = await client().post("/api/projects").set(bearer(token)).send({ title: "", demoUrl: "nope" }).expect(400);
    expect(res.body.details.map((d) => d.field).sort()).toEqual(["demoUrl", "title"]);
  });
});

describe.each([
  ["/api/experience", { company: "Viva", role: "Developer" }],
  ["/api/education", { institution: "Galgotias University", degree: "B.Tech" }],
  ["/api/skills", { title: "Backend", items: ["Node.js"] }],
  ["/api/certifications", { title: "NPTEL Software Engineering" }],
  ["/api/achievements", { text: "200+ DSA problems" }],
])("%s", (path, body) => {
  test("create then list", async () => {
    const api = client();
    await api.post(path).set(bearer(token)).send(body).expect(201);
    const { body: list } = await api.get(path).expect(200);
    expect(list).toEqual([expect.objectContaining(body)]);
  });
});
