const { useTestDb } = require("../helpers/db");
const { client, seedAdmin, bearer } = require("../helpers/api");
const { contact } = require("../helpers/fixtures");

useTestDb();

describe("contact form and inbox", () => {
  test("a visitor's message lands in the inbox, can be marked read and deleted", async () => {
    await client().post("/api/contact").send(contact()).expect(201, { success: true });

    const token = await seedAdmin();
    const api = client();
    const inbox = await api.get("/api/messages").set(bearer(token)).expect(200);
    expect(inbox.body).toEqual([expect.objectContaining({ name: "Visitor", read: false })]);
    const id = inbox.body[0]._id;

    const read = await api.patch(`/api/messages/${id}/read`).set(bearer(token)).expect(200);
    expect(read.body.read).toBe(true);
    await api.delete(`/api/messages/${id}`).set(bearer(token)).expect(204);
    expect((await api.get("/api/messages").set(bearer(token)).expect(200)).body).toEqual([]);
  });

  test("the inbox is newest first", async () => {
    const api = client();
    await api.post("/api/contact").send(contact({ name: "First" })).expect(201);
    await api.post("/api/contact").send(contact({ name: "Second" })).expect(201);
    const token = await seedAdmin();
    const { body } = await client().get("/api/messages").set(bearer(token)).expect(200);
    expect(body.map((m) => m.name)).toEqual(["Second", "First"]);
  });

  test("the inbox is private", async () => {
    await client().get("/api/messages").expect(401);
  });

  test("an invalid message is 400", async () => {
    await client().post("/api/contact").send(contact({ email: "not-an-email" })).expect(400);
  });
});
