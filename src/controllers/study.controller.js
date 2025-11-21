// src/controllers/study.controller.js
import Event from "../models/Event.js";
import StudyPlan from "../models/StudyPlan.js";
import { generateAdaptiveStudyPlan } from "../services/studyScheduler.service.js";

/**
 * Създава/генерира учебен план по дадено Event (с eventId) и връща/записва плана.
 * Ако event не е тип study или няма totalPages -> отказ.
 */
export const createStudyPlanForEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user && req.user.id; // предполага се auth middleware

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.type !== "study")
      return res.status(400).json({ message: "Event is not a study event" });
    if (!event.totalPages)
      return res
        .status(400)
        .json({ message: "Study event must have totalPages" });

    const plan = await generateAdaptiveStudyPlan(event, userId);

    // запиши StudyPlan
    const saved = await StudyPlan.create({
      userId: userId,
      eventId: event._id,
      eventDate: event.date,
      sessions: plan.sessions,
    });

    return res.json({ plan: saved });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error generating study plan", detail: err.message });
  }
};

/**
 * Endpoint, който само връща (не записва) предложен план
 */
export const previewStudyPlan = async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user && req.user.id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const plan = await generateAdaptiveStudyPlan(event, userId);
    return res.json({ plan });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error generating preview", detail: err.message });
  }
};
