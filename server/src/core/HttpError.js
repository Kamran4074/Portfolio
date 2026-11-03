// An error with an HTTP status. Services throw it; the error handler turns it into a response.
// `reason` is an optional detail for the log only (never sent to the client).
class HttpError extends Error {
  constructor(status, message, { reason } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (reason) this.reason = reason;
  }
}

module.exports = HttpError;
