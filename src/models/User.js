import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema({
  duration: { type: Number, required: true }, // минути
  completed: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  wakeTime: { type: String, default: "07:00" },
  sleepTime: { type: String, default: "23:00" },
  studyWindowStart: { type: String, default: "08:00" },
  studyWindowEnd: { type: String, default: "22:00" },
  preferredMinSessionMinutes: { type: Number, default: 30 },
  preferredMaxSessionMinutes: { type: Number, default: 120 },

  studySessions: [studySessionSchema],
  totalStudyMinutes: { type: Number, default: 0 },
  completedStudySessions: { type: Number, default: 0 },
});

export default mongoose.model("User", userSchema);
