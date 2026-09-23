const mongoose = require("mongoose");

const { Schema } = mongoose;
const opts = { timestamps: true, versionKey: false };

const linkSchema = new Schema({ label: String, url: String }, { _id: false });
const statSchema = new Schema({ value: String, label: String, url: String }, { _id: false });

// Singleton document: there is only ever one profile.
const Profile = mongoose.model(
  "Profile",
  new Schema(
    {
      name: String,
      title: String,
      tagline: String,
      location: String,
      email: String,
      phone: String,
      resumeUrl: String,
      photoUrl: String,
      available: { type: Boolean, default: true },
      about: [String],
      socials: [linkSchema],
      stats: [statSchema],
      focus: [String],
    },
    opts
  )
);

const Experience = mongoose.model(
  "Experience",
  new Schema(
    {
      company: { type: String, required: true },
      role: { type: String, required: true },
      location: String,
      start: String,
      end: String,
      points: [String],
      tech: [String],
      order: { type: Number, default: 0, index: true },
    },
    opts
  )
);

const Project = mongoose.model(
  "Project",
  new Schema(
    {
      title: { type: String, required: true },
      subtitle: String,
      description: String,
      highlights: [String],
      tech: [String],
      demoUrl: String,
      githubUrl: String,
      featured: { type: Boolean, default: false },
      order: { type: Number, default: 0, index: true },
    },
    opts
  )
);

const SkillGroup = mongoose.model(
  "SkillGroup",
  new Schema(
    {
      title: { type: String, required: true },
      items: [String],
      order: { type: Number, default: 0, index: true },
    },
    opts
  )
);

const Certification = mongoose.model(
  "Certification",
  new Schema(
    {
      title: { type: String, required: true },
      issuer: String,
      url: String,
      order: { type: Number, default: 0, index: true },
    },
    opts
  )
);

const Achievement = mongoose.model(
  "Achievement",
  new Schema(
    {
      text: { type: String, required: true },
      order: { type: Number, default: 0, index: true },
    },
    opts
  )
);

const Message = mongoose.model(
  "Message",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      message: { type: String, required: true, trim: true },
      read: { type: Boolean, default: false },
    },
    opts
  ),
  "contacts" // keep the existing collection so old messages are not lost
);

// Singleton document holding the settings-page password (bcrypt hash).
// tokenVersion is bumped on password change so older login tokens stop working.
const Setting = mongoose.model(
  "Setting",
  new Schema(
    {
      passwordHash: { type: String, required: true },
      tokenVersion: { type: Number, default: 0 },
    },
    opts
  )
);

module.exports = { Setting, Profile, Experience, Project, SkillGroup, Certification, Achievement, Message };
