const { z, ZodError } = require("zod");
const validate = require("../../src/middleware/validate");
const { errorHandler, notFound } = require("../../src/middleware/errorHandler");
const HttpError = require("../../src/core/HttpError");
const asyncHandler = require("../../src/core/asyncHandler");

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const req = (extra = {}) => ({ id: "req-123", method: "GET", originalUrl: "/api/x", ip: "1.2.3.4", ...extra });

describe("validate", () => {
  const schema = z.object({ name: z.string().trim().min(1), n: z.coerce.number().default(1) });

  test("replaces the request part with the parsed value", () => {
    const r = req({ body: { name: "  K  " } });
    const next = jest.fn();
    validate(schema)(r, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(r.body).toEqual({ name: "K", n: 1 });
  });

  test("validates query and params too", () => {
    const r = req({ query: { name: "a", n: "5" } });
    validate(schema, "query")(r, {}, jest.fn());
    expect(r.query.n).toBe(5);
  });

  test("passes a ZodError tagged with its source", () => {
    const next = jest.fn();
    validate(schema, "params")(req({ params: {} }), {}, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ZodError);
    expect(err.source).toBe("params");
  });
});

describe("errorHandler", () => {
  const run = (err) => {
    const res = mockRes();
    errorHandler(err, req(), res, jest.fn());
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
  };

  test("validation errors become 400 with field details", () => {
    const err = z.object({ title: z.string() }).safeParse({}).error;
    const { status, body } = run(err);
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Validation failed", details: [expect.objectContaining({ field: "title" })] });
  });

  test("HttpError keeps its status and message", () => {
    expect(run(new HttpError(404, "Not found"))).toEqual({ status: 404, body: { error: "Not found" } });
  });

  test("the log-only reason is never sent", () => {
    expect(run(new HttpError(401, "Wrong password", { reason: "secret detail" })).body).toEqual({ error: "Wrong password" });
  });

  test.each([
    [{ name: "CastError" }, 400, "Invalid id"],
    [{ type: "entity.parse.failed" }, 400, "Malformed JSON body"],
    [{ type: "entity.too.large" }, 413, "Request body too large"],
  ])("maps %o to %i", (props, status, error) => {
    expect(run(Object.assign(new Error("x"), props))).toEqual({ status, body: { error } });
  });

  test("unexpected errors are a generic 500 with the request id, no internals", () => {
    const { status, body } = run(new Error("connection string mongodb://user:pass@host"));
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Internal server error", requestId: "req-123" });
  });

  test("notFound passes a 404 naming the route", () => {
    const next = jest.fn();
    notFound(req({ method: "POST", originalUrl: "/api/nope" }), {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 404, message: "Route not found: POST /api/nope" });
  });
});

describe("asyncHandler", () => {
  test("forwards a rejected promise to next", async () => {
    const boom = new Error("boom");
    const next = jest.fn();
    await asyncHandler(async () => { throw boom; })({}, {}, next);
    expect(next).toHaveBeenCalledWith(boom);
  });
});
