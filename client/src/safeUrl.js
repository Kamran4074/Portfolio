// Links from the API are rendered only if their scheme is safe. The server already refuses
// anything else; this guards content saved before that check (and content.json edits).
// A javascript: or data: href would run code when clicked.
const SAFE = ["http:", "https:", "mailto:", "tel:"];

export function safeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const v = value.trim();
  if (/^(#[\w-]*|\/(?!\/)\S*)$/.test(v)) return v; // #section or /page on this site
  try {
    return SAFE.includes(new URL(v).protocol) ? v : undefined;
  } catch {
    return undefined;
  }
}
