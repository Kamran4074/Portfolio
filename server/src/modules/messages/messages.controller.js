const asyncHandler = require("../../core/asyncHandler");
const { audit } = require("../../core/requestContext");
const service = require("./messages.service");

const submit = asyncHandler(async (req, res) => {
  await service.submit(req.body, { reqId: req.id });
  res.status(201).json({ success: true });
});

const inbox = asyncHandler(async (_req, res) => res.json(await service.inbox()));

const markRead = asyncHandler(async (req, res) => {
  const doc = await service.markRead(req.params.id);
  audit(req, "Message marked read", { id: doc.id });
  res.json(doc);
});

const remove = asyncHandler(async (req, res) => {
  const doc = await service.remove(req.params.id);
  audit(req, "Message deleted", { id: doc.id });
  res.status(204).end();
});

module.exports = { submit, inbox, markRead, remove };
