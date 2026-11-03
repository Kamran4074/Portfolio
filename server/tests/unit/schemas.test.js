const collections = require("../../src/modules/collections/collections.schema");
const { message } = require("../../src/modules/messages/messages.schema");
const { profile } = require("../../src/modules/content/content.schema");
const { changePassword } = require("../../src/modules/auth/auth.schema");
const { idParam } = require("../../src/validators/common");
const { project } = require("../helpers/fixtures");

const ID = (n) => n.toString(16).padStart(12, "0");

describe("project schema", () => {
  test("applies defaults and trims text", () => {
    const parsed = collections.project.parse({ title: "  RooMates  " });
    expect(parsed).toMatchObject({ title: "RooMates", images: [], highlights: [], featured: false, order: 0, demoUrl: "" });
  });

  test("keeps screenshot captions", () => {
    const parsed = collections.project.parse(project({ images: [{ id: ID(1), caption: "  Dashboard  " }] }));
    expect(parsed.images).toEqual([{ id: ID(1), caption: "Dashboard" }]);
  });

  test("accepts up to 10 screenshots", () => {
    const images = Array.from({ length: 10 }, (_, i) => ({ id: ID(i + 1) }));
    expect(collections.project.parse(project({ images })).images).toHaveLength(10);
  });

  test("rejects an 11th screenshot", () => {
    const images = Array.from({ length: 11 }, (_, i) => ({ id: ID(i + 1) }));
    const result = collections.project.safeParse(project({ images }));
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/At most 10/);
  });

  test("rejects ids that are not a content hash", () => {
    for (const id of ["../etc/passwd", "ABCDEF123456", "abc", ID(1) + "0"]) {
      expect(collections.project.safeParse(project({ images: [{ id }] })).success).toBe(false);
    }
  });

  test("rejects captions over 200 characters", () => {
    expect(collections.project.safeParse(project({ images: [{ id: ID(1), caption: "x".repeat(201) }] })).success).toBe(false);
  });

  test("rejects bad URLs but allows clearing them", () => {
    expect(collections.project.safeParse(project({ demoUrl: "not a url" })).success).toBe(false);
    expect(collections.project.parse(project({ demoUrl: "" })).demoUrl).toBe("");
  });

  test("requires a title", () => {
    expect(collections.project.safeParse({ title: "   " }).success).toBe(false);
  });
});

describe("other schemas", () => {
  test("contact message needs a valid email and at least 5 characters", () => {
    expect(message.safeParse({ name: "A", email: "nope", message: "Hello there" }).success).toBe(false);
    expect(message.safeParse({ name: "A", email: "a@b.co", message: "Hi" }).success).toBe(false);
    expect(message.safeParse({ name: "A", email: "a@b.co", message: "Hello there" }).success).toBe(true);
  });

  test("profile allows an empty email and caps stats at 8", () => {
    expect(profile.parse({ name: "K", title: "Dev", email: "" }).email).toBe("");
    const stats = Array.from({ length: 9 }, () => ({ value: "1", label: "x" }));
    expect(profile.safeParse({ name: "K", title: "Dev", stats }).success).toBe(false);
  });

  test("new password must be at least 10 characters", () => {
    expect(changePassword.safeParse({ currentPassword: "x", newPassword: "short" }).success).toBe(false);
    expect(changePassword.safeParse({ currentPassword: "x", newPassword: "long-enough-pw" }).success).toBe(true);
  });

  test("ids must be 24-char ObjectIds", () => {
    expect(idParam.safeParse({ id: "507f1f77bcf86cd799439011" }).success).toBe(true);
    expect(idParam.safeParse({ id: "123" }).success).toBe(false);
  });

  test.each(Object.keys(collections))("%s schema rejects a negative order", (name) => {
    const result = collections[name].safeParse({ order: -1 });
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.path[0] === "order")).toBe(true);
  });
});
