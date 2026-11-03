const crypto = require("crypto");

// Identify the format from the first bytes, not from the Content-Type header,
// so a renamed or disguised file is rejected.
const sniff = (buf) => {
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.toString("hex", 0, 8) === "89504e470d0a1a0a") return "image/png";
  return null;
};

// Short content hash: the same bytes always get the same id, so URLs can be cached forever.
const contentHash = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);

// .lean() returns the BSON Binary wrapper; its .buffer holds exactly the image bytes.
const toBuffer = (data) => (Buffer.isBuffer(data) ? data : Buffer.from(data.buffer));

module.exports = { sniff, contentHash, toBuffer };
