jest.mock("../../src/modules/messages/messages.repository");

const repo = require("../../src/modules/messages/messages.repository");
const mailer = require("../../src/modules/messages/mailer");
const service = require("../../src/modules/messages/messages.service");
const escapeHtml = require("../../src/utils/escapeHtml");
const { contact } = require("../helpers/fixtures");

beforeEach(() => {
  jest.restoreAllMocks();
  repo.create.mockResolvedValue({ id: "m1" });
});

describe("messages service", () => {
  test("saves the message even when mail is not configured", async () => {
    jest.spyOn(mailer, "enabled").mockReturnValue(false);
    const result = await service.submit(contact());
    expect(repo.create).toHaveBeenCalledWith(contact());
    expect(result).toEqual({ saved: { id: "m1" }, mailed: false });
  });

  test("a mail failure is swallowed: the message is already stored", async () => {
    jest.spyOn(mailer, "enabled").mockReturnValue(true);
    jest.spyOn(mailer, "sendContactMail").mockRejectedValue(Object.assign(new Error("SMTP down"), { code: "ECONNECTION" }));
    await expect(service.submit(contact())).resolves.toMatchObject({ mailed: false });
  });

  test("reports a sent mail", async () => {
    jest.spyOn(mailer, "enabled").mockReturnValue(true);
    jest.spyOn(mailer, "sendContactMail").mockResolvedValue({});
    await expect(service.submit(contact())).resolves.toMatchObject({ mailed: true });
  });

  test("markRead and remove of a missing message are 404", async () => {
    repo.markRead.mockResolvedValue(null);
    repo.remove.mockResolvedValue(null);
    await expect(service.markRead("x")).rejects.toMatchObject({ status: 404 });
    await expect(service.remove("x")).rejects.toMatchObject({ status: 404 });
  });
});

describe("contact mail", () => {
  test("escapes every user value in the HTML", () => {
    const mail = mailer.contactMail(contact({ name: "<b>Eve</b>", message: '<script>alert("x")</script>\nline 2' }));
    expect(mail.html).not.toMatch(/<script>|<b>Eve/);
    expect(mail.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;<br/>line 2");
  });

  test("strips line breaks from the subject (no header injection)", () => {
    const mail = mailer.contactMail(contact({ name: "Eve\r\nBcc: victim@example.com" }));
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  test("replies go to the visitor", () => {
    expect(mailer.contactMail(contact()).replyTo).toBe("visitor@example.com");
  });
});

describe("escapeHtml", () => {
  test("escapes the five HTML special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  test("handles non-strings", () => {
    expect(escapeHtml(42)).toBe("42");
    expect(escapeHtml()).toBe("");
  });
});
