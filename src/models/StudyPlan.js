import mongoose from "mongoose";

const StudySessionSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  pagesFrom: { type: Number, required: true },
  pagesTo: { type: Number, required: true },
  note: { type: String },
});

const StudyPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
    unique: true,
  },
  eventDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  subject: { type: String },
  category: { type: String },
  sessions: { type: [StudySessionSchema], required: true },
});

export default mongoose.model("StudyPlan", StudyPlanSchema);
