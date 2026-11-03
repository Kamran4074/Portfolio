// Shared upload rules: the body must be a real WebP, JPEG or PNG within the size limit.
const express = require("express");
const HttpError = require("../../core/HttpError");
const { MAX_UPLOAD_BYTES } = require("./media.constants");
const { sniff } = require("./image.util");

// Raw image bytes as the request body (Content-Type image/*).
const rawImageBody = express.raw({ type: "image/*", limit: MAX_UPLOAD_BYTES });

// Returns the detected content type, or throws a 400/415.
function assertImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    throw new HttpError(400, "Send the image as the request body with an image/* Content-Type");
  }
  const contentType = sniff(buf);
  if (!contentType) throw new HttpError(415, "Only WebP, JPEG or PNG images are allowed");
  return contentType;
}

module.exports = { rawImageBody, assertImage };
