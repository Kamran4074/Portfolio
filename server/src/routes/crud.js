const express = require("express");
const { asyncHandler, validate, requireAuth, HttpError } = require("../middleware");

/**
 * Builds a REST router for an ordered collection:
 *   GET    /       public, sorted by `order`
 *   POST   /       admin
 *   PUT    /:id    admin, full replace (validated)
 *   DELETE /:id    admin
 */
module.exports = function crudRouter(Model, schema) {
  const router = express.Router();

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
      res.status(201).json(await Model.create(req.body));
    })
  );

  router.put(
    "/:id",
    requireAuth,
    validate(schema),
    asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) throw new HttpError(404, "Not found");
      res.json(doc);
    })
  );

  router.delete(
    "/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw new HttpError(404, "Not found");
      res.status(204).end();
    })
  );

  return router;
};
