// generateStudyPlan.js
import mongoose from "mongoose";
import Event from "./src/models/Event.js";
import StudyPlan from "./src/models/StudyPlan.js";
import { generateAdaptiveStudyPlan } from "./src/services/studyScheduler.service.js";

async function run() {
  try {
    await mongoose.connect("mongodb://localhost:27017/tudy");
    console.log("Connected to MongoDB");

    const eventId = "6961867fef7b802756c68822"; // your event ID
    const event = await Event.findById(eventId);

    if (!event) {
      console.log("Event not found");
      return;
    }

    const plan = await generateAdaptiveStudyPlan(event, event.user);

    if (plan.sessions.length === 0) {
      console.log("No sessions generated for this event");
      return;
    }

    const saved = await StudyPlan.create({
      userId: new mongoose.Types.ObjectId(event.user),
      eventId: event._id,
      eventDate: event.date,
      sessions: plan.sessions.map((s) => ({
        start: s.start,
        end: s.end,
        pagesFrom: s.pagesFrom,
        pagesTo: s.pagesTo,
        note: s.note,
      })),
    });

    console.log("Saved study plan:", saved);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
