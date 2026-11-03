// HTTP handlers for an ordered collection. Every write is recorded in the audit log.
const asyncHandler = require("../../core/asyncHandler");
const { audit } = require("../../core/requestContext");

module.exports = function createCollectionController(service, name) {
  return {
    list: asyncHandler(async (_req, res) => res.json(await service.list())),
    create: asyncHandler(async (req, res) => {
      const doc = await service.create(req.body);
      audit(req, `${name} created`, { id: doc.id });
      res.status(201).json(doc);
    }),
    update: asyncHandler(async (req, res) => {
      const doc = await service.update(req.params.id, req.body);
      audit(req, `${name} updated`, { id: doc.id });
      res.json(doc);
    }),
    remove: asyncHandler(async (req, res) => {
      const doc = await service.remove(req.params.id);
      audit(req, `${name} deleted`, { id: doc.id });
      res.status(204).end();
    }),
  };
};
