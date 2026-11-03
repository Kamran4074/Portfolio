const { sniff, contentHash, toBuffer } = require("../../src/modules/media/image.util");
const { webp, png, jpeg } = require("../helpers/fixtures");

describe("sniff", () => {
  test.each([
    ["WebP", webp(), "image/webp"],
    ["PNG", png(), "image/png"],
    ["JPEG", jpeg(), "image/jpeg"],
  ])("detects %s from its signature", (_name, buf, type) => {
    expect(sniff(buf)).toBe(type);
  });

  test("rejects text, SVG and GIF", () => {
    expect(sniff(Buffer.from("hello, this is not an image"))).toBeNull();
    expect(sniff(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniff(Buffer.from("GIF89a................"))).toBeNull();
  });

  test("rejects files too short to hold a signature", () => {
    expect(sniff(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(sniff(Buffer.alloc(0))).toBeNull();
  });

  test("a RIFF file that is not WebP (e.g. WAV) is rejected", () => {
    const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVEfmt ")]);
    expect(sniff(wav)).toBeNull();
  });
});

describe("contentHash", () => {
  test("is 12 lowercase hex characters", () => {
    expect(contentHash(webp())).toMatch(/^[a-f0-9]{12}$/);
  });

  test("same bytes give the same id, different bytes a different id", () => {
    expect(contentHash(webp("a"))).toBe(contentHash(webp("a")));
    expect(contentHash(webp("a"))).not.toBe(contentHash(webp("b")));
  });
});

describe("toBuffer", () => {
  test("returns Buffers as they are and unwraps BSON Binary", () => {
    const buf = png();
    expect(toBuffer(buf)).toBe(buf);
    expect(toBuffer({ buffer: new Uint8Array(buf) }).equals(buf)).toBe(true);
  });
});
