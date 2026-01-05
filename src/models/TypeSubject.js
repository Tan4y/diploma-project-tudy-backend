import mongoose from "mongoose";

const TypeSubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tudies: { type: Number, default: 0 },
  iconRes: { type: Number, required: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TypeSubjects",
    required: true,
  },
  type: { type: String, enum: ["type", "subject"], required: true },
});

TypeSubjectSchema.index({ name: 1, userId: 1, type: 1 }, { unique: true });

export default mongoose.model("TypeSubject", TypeSubjectSchema);
