// Four suites, run together by `npm test` or one at a time (npm run test:unit, ...):
//   unit         one module at a time, collaborators mocked, no database
//   integration  real HTTP (supertest) against the real app and an in-memory MongoDB
//   regression   one test per bug that was fixed, so it cannot come back
//   qa           non-functional checks: security headers, CORS, rate limits, error shape, speed
const suite = (name) => ({
  displayName: name,
  testEnvironment: "node",
  testMatch: [`<rootDir>/tests/${name}/**/*.test.js`],
  setupFiles: ["<rootDir>/tests/setup/env.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/timeout.js"],
});

module.exports = {
  projects: ["unit", "integration", "regression", "qa"].map(suite),
  collectCoverageFrom: ["src/**/*.js", "!src/utils/processHandlers.js"],
  coverageReporters: ["text-summary", "lcov"],
};
