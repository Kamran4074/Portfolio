// In-memory MongoDB for integration tests: one server per test file, emptied after each test.
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;

async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function clear() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

async function close() {
  await mongoose.disconnect();
  await mongod?.stop();
}

// Call at the top of a test file.
function useTestDb() {
  beforeAll(connect);
  afterEach(clear);
  afterAll(close);
}

module.exports = { useTestDb, connect, clear, close };
