const express = require("express");
const { idParam } = require("../validators/schemas");
const { asyncHandler, validate, requireAuth, audit, HttpError } = require("../middleware");

/**
 * Builds a REST router for an ordered collection:
 *   GET    /       public, sorted by `order`
 *   POST   /       admin
 *   PUT    /:id    admin, full replace (validated)
 *   DELETE /:id    admin
 * Every write is recorded in the audit log.
 */
module.exports = function crudRouter(Model, schema) {
  const router = express.Router();
  const name = Model.modelName;

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      res.json(await Model.find().sort({ order: 1, createdAt: 1 }).lean());
    })
  );

  router.post(
    "/",
    requireAuth,
    validate(schema),
    asyncHandler(async (req, res) => {
      const doc = await Model.create(req.body);
      audit(req, `${name} created`, { id: doc.id });
      res.status(201).json(doc);
    })
  );

  router.put(
    "/:id",
    requireAuth,
    validate(idParam, "params"),
    validate(schema),
    asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) throw new HttpError(404, "Not found");
      audit(req, `${name} updated`, { id: doc.id });
      res.json(doc);
    })
  );

  router.delete(
    "/:id",
    requireAuth,
    validate(idParam, "params"),
    asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw new HttpError(404, "Not found");
      audit(req, `${name} deleted`, { id: doc.id });
      res.status(204).end();
    })
  );

  return router;
};
