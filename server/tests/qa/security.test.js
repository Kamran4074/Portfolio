// Security and API-contract quality checks that do not need a database.
const { client, request, app } = require("../helpers/api");

describe("security headers", () => {
  test("helmet headers are set and the framework is not advertised", async () => {
    const res = await client().get("/api");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["strict-transport-security"]).toMatch(/max-age=/);
    expect(res.headers["content-security-policy"]).toBeDefined();
  });
});

describe("CORS", () => {
  test("the configured site origin is allowed", async () => {
    const res = await client().get("/api").set("Origin", "http://allowed.test");
    expect(res.headers["access-control-allow-origin"]).toBe("http://allowed.test");
  });

  test("any other origin gets no CORS header", async () => {
    const res = await client().get("/api").set("Origin", "http://evil.test");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("request ids", () => {
  test("every response carries one", async () => {
    const res = await client().get("/api");
    expect(res.headers["x-request-id"]).toMatch(/^[\w-]{8,64}$/);
  });

  test("a safe incoming id is reused, an unsafe one replaced", async () => {
    const ok = await request(app).get("/api").set("X-Request-Id", "trace-12345678");
    expect(ok.headers["x-request-id"]).toBe("trace-12345678");
    const bad = await request(app).get("/api").set("X-Request-Id", "<script>");
    expect(bad.headers["x-request-id"]).not.toBe("<script>");
  });
});

describe("error responses", () => {
  test("unknown routes are a JSON 404", async () => {
    const res = await client().get("/api/does-not-exist").expect(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: "Route not found: GET /api/does-not-exist" });
  });

  test("malformed JSON is a 400, not a crash", async () => {
    const res = await client().post("/api/contact").set("Content-Type", "application/json").send('{"name": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Malformed JSON body" });
  });

  test("a JSON body over 100 KB is refused with 413", async () => {
    const res = await client().post("/api/contact").send({ message: "x".repeat(110 * 1024) });
    expect(res.status).toBe(413);
  });

  test("validation errors list fields but never echo the submitted values", async () => {
    const res = await client().post("/api/auth/login").send({ password: "" }).expect(400);
    expect(JSON.stringify(res.body)).not.toMatch(/"password":\s*""/);
    expect(res.body.details[0]).toEqual({ field: "password", message: expect.any(String) });
  });
});
