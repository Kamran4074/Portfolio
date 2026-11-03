const createService = require("../../src/modules/collections/collection.service");

const fakeRepo = () => ({
  list: jest.fn().mockResolvedValue([{ id: "a" }]),
  create: jest.fn(async (d) => ({ id: "new", ...d })),
  update: jest.fn(async (id, d) => ({ id, ...d })),
  remove: jest.fn(async (id) => ({ id })),
});

describe("collection service", () => {
  test("runs afterWrite after every successful change, not on reads", async () => {
    const afterWrite = jest.fn();
    const service = createService(fakeRepo(), { afterWrite });
    await service.list();
    expect(afterWrite).not.toHaveBeenCalled();
    await service.create({ title: "x" });
    await service.update("1", { title: "y" });
    await service.remove("1");
    expect(afterWrite).toHaveBeenCalledTimes(3);
  });

  test("update and remove of a missing document are 404 and skip afterWrite", async () => {
    const repo = fakeRepo();
    repo.update.mockResolvedValue(null);
    repo.remove.mockResolvedValue(null);
    const afterWrite = jest.fn();
    const service = createService(repo, { afterWrite });
    await expect(service.update("1", {})).rejects.toMatchObject({ status: 404 });
    await expect(service.remove("1")).rejects.toMatchObject({ status: 404 });
    expect(afterWrite).not.toHaveBeenCalled();
  });

  test("works without afterWrite", async () => {
    await expect(createService(fakeRepo()).create({ title: "x" })).resolves.toMatchObject({ title: "x" });
  });
});
