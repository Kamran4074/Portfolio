// Data access for contact-form messages.
const { Message } = require("../../models");

const INBOX_LIMIT = 200;

const create = (data) => Message.create(data);
const listLatest = () => Message.find().sort({ createdAt: -1 }).limit(INBOX_LIMIT).lean();
const markRead = (id) => Message.findByIdAndUpdate(id, { read: true }, { new: true });
const remove = (id) => Message.findByIdAndDelete(id);

module.exports = { create, listLatest, markRead, remove };
