// An error with an HTTP status. Services throw it; the error handler turns it into a response.
// `reason` is an optional detail for the log only (never sent to the client).
// `code` is an optional machine-readable value the client can act on (sent as `code`).
class HttpError extends Error {
  constructor(status, message, { reason, code } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (reason) this.reason = reason;
    if (code) this.code = code;
  }
}

module.exports = HttpError;
