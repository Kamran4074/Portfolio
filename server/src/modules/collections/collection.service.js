// Business rules for an ordered collection. `afterWrite` runs after every change
// (projects use it to clean up screenshots no project uses any more).
const HttpError = require("../../core/HttpError");

module.exports = function createCollectionService(repo, { afterWrite } = {}) {
  const changed = async (result) => {
    await afterWrite?.();
    return result;
  };

  return {
    list: () => repo.list(),
    create: async (data) => changed(await repo.create(data)),
    update: async (id, data) => {
      const doc = await repo.update(id, data);
      if (!doc) throw new HttpError(404, "Not found");
      return changed(doc);
    },
    remove: async (id) => {
      const doc = await repo.remove(id);
      if (!doc) throw new HttpError(404, "Not found");
      return changed(doc);
    },
  };
};
