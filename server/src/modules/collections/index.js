// REST routes for every ordered collection:
//   GET    /api/<name>       public, sorted by `order`
//   POST   /api/<name>       admin
//   PUT    /api/<name>/:id   admin, full replace (validated)
//   DELETE /api/<name>/:id   admin
const express = require("express");
const { validate, requireAuth } = require("../../middleware");
const { idParam } = require("../../validators/common");
const { Experience, Education, Project, SkillGroup, Certification, Achievement } = require("../../models");
const schemas = require("./collections.schema");
const createRepository = require("./collection.repository");
const createService = require("./collection.service");
const createController = require("./collection.controller");
const screenshotService = require("../media/screenshot.service");

const definitions = [
  { path: "/experience", Model: Experience, schema: schemas.experience },
  { path: "/education", Model: Education, schema: schemas.education },
  { path: "/projects", Model: Project, schema: schemas.project, afterWrite: screenshotService.prune },
  { path: "/skills", Model: SkillGroup, schema: schemas.skillGroup },
  { path: "/certifications", Model: Certification, schema: schemas.certification },
  { path: "/achievements", Model: Achievement, schema: schemas.achievement },
];

function collectionRouter({ Model, schema, afterWrite }) {
  const service = createService(createRepository(Model), { afterWrite });
  const controller = createController(service, Model.modelName);
  const router = express.Router();
  router.get("/", controller.list);
  router.post("/", requireAuth, validate(schema), controller.create);
  router.put("/:id", requireAuth, validate(idParam, "params"), validate(schema), controller.update);
  router.delete("/:id", requireAuth, validate(idParam, "params"), controller.remove);
  return router;
}

const router = express.Router();
for (const def of definitions) router.use(def.path, collectionRouter(def));

module.exports = router;
