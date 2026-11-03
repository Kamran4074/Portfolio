jest.mock("../../src/modules/media/asset.repository");

const assets = require("../../src/modules/media/asset.repository");
const service = require("../../src/modules/media/screenshot.service");
const { SCREENSHOT_GRACE_MS } = require("../../src/modules/media/media.constants");
const { webp } = require("../helpers/fixtures");

beforeEach(() => jest.resetAllMocks());

describe("upload", () => {
  test("stores the file under its content hash and returns the id", async () => {
    const { id, contentType } = await service.upload(webp());
    expect(id).toMatch(/^[a-f0-9]{12}$/);
    expect(contentType).toBe("image/webp");
    expect(assets.save).toHaveBeenCalledWith(`shot-${id}`, expect.objectContaining({ contentType: "image/webp", hash: id }));
  });

  test("rejects an empty body (400) and a non-image (415) without storing", async () => {
    await expect(service.upload(Buffer.alloc(0))).rejects.toMatchObject({ status: 400 });
    await expect(service.upload(Buffer.from("not an image at all"))).rejects.toMatchObject({ status: 415 });
    await expect(service.upload(undefined)).rejects.toMatchObject({ status: 400 });
    expect(assets.save).not.toHaveBeenCalled();
  });
});

describe("get", () => {
  test("an id that is not a hash is a 404 without a database query", async () => {
    await expect(service.get("../../etc")).rejects.toMatchObject({ status: 404 });
    expect(assets.findById).not.toHaveBeenCalled();
  });

  test("looks up the prefixed id", async () => {
    assets.findById.mockResolvedValue({ hash: "abc" });
    await service.get("0123456789ab");
    expect(assets.findById).toHaveBeenCalledWith("shot-0123456789ab");
  });
});

describe("prune", () => {
  test("keeps referenced screenshots and anything inside the grace period", async () => {
    assets.referencedScreenshotIds.mockResolvedValue(["aaaaaaaaaaaa"]);
    assets.removeUnused.mockResolvedValue(2);
    const now = Date.UTC(2026, 0, 1);
    await expect(service.prune({ now })).resolves.toBe(2);
    expect(assets.removeUnused).toHaveBeenCalledWith({
      prefix: "shot-",
      keep: ["shot-aaaaaaaaaaaa"],
      before: new Date(now - SCREENSHOT_GRACE_MS),
    });
  });

  test("never throws: a failed cleanup must not fail the save", async () => {
    assets.referencedScreenshotIds.mockRejectedValue(new Error("db down"));
    await expect(service.prune()).resolves.toBe(0);
  });
});
