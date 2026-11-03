const { ZodError } = require("zod");

// Zod validation for any part of the request: validate(schema) checks the body,
// validate(schema, "params") / validate(schema, "query") check the URL.
// The parsed (trimmed, defaulted, coerced) result replaces the original.
module.exports = (schema, source = "body") => (req, _res, next) => {
  try {
    const parsed = schema.parse(req[source] ?? {});
    // Express 5 makes req.query a getter; defineProperty works on both 4 and 5.
    Object.defineProperty(req, source, { value: parsed, writable: true, configurable: true, enumerable: true });
    next();
  } catch (err) {
    if (err instanceof ZodError) err.source = source;
    next(err);
  }
};
