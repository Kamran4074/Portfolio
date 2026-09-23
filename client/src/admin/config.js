// Field types:
//   text | url | textarea | number | bool
//   lines  -> string[] edited one item per line
//   tags   -> string[] edited as comma-separated values
//   pairs  -> object[] with sub-fields (e.g. socials, stats)
// To add a field: add it to the Mongoose model, the Zod schema, and here.

export const profileConfig = {
  key: "profile",
  label: "Profile",
  endpoint: "/profile",
  singleton: true,
  fields: [
    { name: "name", label: "Name" },
    { name: "title", label: "Title", hint: "Shown under your name. Text before '·' is used as the role in the terminal card." },
    { name: "tagline", label: "Tagline", type: "textarea" },
    { name: "location", label: "Location" },
    { name: "email", label: "Email" },
    { name: "phone", label: "Phone" },
    { name: "whatsapp", label: "WhatsApp number", hint: "With country code, e.g. +91 7301730616. Leave empty to hide the WhatsApp link." },
    { name: "resumeUrl", label: "Resume URL", type: "url", hint: "Google Drive or any public PDF link. Leave empty to hide the button." },
    { name: "photoUrl", label: "Photo URL", type: "url", hint: "Leave empty to use the bundled photo." },
    { name: "available", label: "Open to work", type: "bool" },
    { name: "about", label: "About paragraphs", type: "lines", hint: "One paragraph per line." },
    { name: "focus", label: "Focus areas", type: "tags" },
    { name: "socials", label: "Social links", type: "pairs", sub: [{ name: "label", label: "Label" }, { name: "url", label: "URL" }] },
    {
      name: "stats",
      label: "Stats",
      type: "pairs",
      sub: [{ name: "value", label: "Value" }, { name: "label", label: "Label" }, { name: "url", label: "Link (optional)" }],
    },
  ],
};

export const collections = [
  {
    key: "experience",
    label: "Experience",
    endpoint: "/experience",
    title: (d) => d.role,
    subtitle: (d) => `${d.company} · ${d.start || ""} → ${d.end || ""}`,
    fields: [
      { name: "role", label: "Role" },
      { name: "company", label: "Company" },
      { name: "location", label: "Location" },
      { name: "start", label: "Start", hint: "e.g. Apr 2026" },
      { name: "end", label: "End", hint: "e.g. Present" },
      { name: "points", label: "Bullet points", type: "lines", hint: "One per line. Lead with impact and numbers." },
      { name: "tech", label: "Tech", type: "tags" },
      { name: "order", label: "Order", type: "number", hint: "Lower shows first." },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    endpoint: "/projects",
    title: (d) => d.title,
    subtitle: (d) => d.subtitle,
    fields: [
      { name: "title", label: "Title" },
      { name: "subtitle", label: "Subtitle" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "highlights", label: "Highlights", type: "lines", hint: "One per line." },
      { name: "tech", label: "Tech", type: "tags" },
      { name: "demoUrl", label: "Live demo URL", type: "url" },
      { name: "githubUrl", label: "GitHub URL", type: "url" },
      { name: "featured", label: "Featured (wide card)", type: "bool" },
      { name: "order", label: "Order", type: "number" },
    ],
  },
  {
    key: "skills",
    label: "Skills",
    endpoint: "/skills",
    title: (d) => d.title,
    subtitle: (d) => d.items?.join(", "),
    fields: [
      { name: "title", label: "Group title" },
      { name: "items", label: "Skills", type: "tags" },
      { name: "order", label: "Order", type: "number" },
    ],
  },
  {
    key: "certifications",
    label: "Certifications",
    endpoint: "/certifications",
    title: (d) => d.title,
    subtitle: (d) => d.issuer,
    fields: [
      { name: "title", label: "Title" },
      { name: "issuer", label: "Issuer" },
      { name: "url", label: "Certificate URL", type: "url" },
      { name: "order", label: "Order", type: "number" },
    ],
  },
  {
    key: "achievements",
    label: "Achievements",
    endpoint: "/achievements",
    title: (d) => d.text,
    subtitle: () => "",
    fields: [
      { name: "text", label: "Achievement", type: "textarea" },
      { name: "order", label: "Order", type: "number" },
    ],
  },
];

// Convert API documents into editable form values and back.
export const toForm = (fields, doc = {}) =>
  Object.fromEntries(
    fields.map((f) => {
      const v = doc[f.name];
      if (f.type === "lines") return [f.name, (v || []).join("\n")];
      if (f.type === "tags") return [f.name, (v || []).join(", ")];
      if (f.type === "bool") return [f.name, !!v];
      if (f.type === "number") return [f.name, v ?? 0];
      if (f.type === "pairs") return [f.name, (v || []).map((row) => ({ ...row }))];
      return [f.name, v ?? ""];
    })
  );

export const fromForm = (fields, values) =>
  Object.fromEntries(
    fields.map((f) => {
      const v = values[f.name];
      if (f.type === "lines") return [f.name, v.split("\n").map((s) => s.trim()).filter(Boolean)];
      if (f.type === "tags") return [f.name, v.split(",").map((s) => s.trim()).filter(Boolean)];
      if (f.type === "number") return [f.name, Number(v) || 0];
      if (f.type === "pairs") return [f.name, v.filter((row) => Object.values(row).some((x) => String(x || "").trim()))];
      return [f.name, typeof v === "string" ? v.trim() : v];
    })
  );
