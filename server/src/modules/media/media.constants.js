module.exports = {
  PHOTO_ID: "profile-photo",
  SCREENSHOT_PREFIX: "shot-",
  // Screenshot ids are the first 12 hex chars of the file's SHA-256.
  SCREENSHOT_ID: /^[a-f0-9]{12}$/,
  MAX_SCREENSHOTS: 10,
  // Upload limits. The browser shrinks files first: a photo is ~20-40 KB, a screenshot ~80-250 KB.
  MAX_UPLOAD_BYTES: 1024 * 1024,
  // An unused screenshot is kept this long, so a form that is still open (uploaded but
  // not saved yet) never loses its images.
  SCREENSHOT_GRACE_MS: 60 * 60 * 1000,
};
