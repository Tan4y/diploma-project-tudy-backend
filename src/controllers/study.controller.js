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
    const userId = req.user && req.user.id;

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
      subject: event.subject,
      category: event.category,
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

export const getAllStudyPlans = async (req, res) => {
  try {
    const userId = req.user.id;

    const studyPlans = await StudyPlan.find({ userId })
      .sort({ eventDate: 1 })
      .populate({
        path: "eventId",
        select: "title subject type date",
      });

    const serialized = studyPlans.map((plan) => {
      const event = plan.eventId;

      return {
        _id: plan._id.toString(),
        userId: plan.userId.toString(),
        eventDate: plan.eventDate.toISOString(),

        event: event
          ? {
              id: event._id.toString(),
              title: event.title,
              subject:
                typeof event.subject === "string"
                  ? event.subject
                  : (event.subject?.name ?? null),
              type: event.type,
              date: event.date?.toISOString(),
            }
          : null,

        sessions: (plan.sessions || []).map((s, idx) => ({
          sessionNumber: idx + 1,
          startTime: s.start.toISOString(),
          endTime: s.end.toISOString(),
          pages: s.pagesTo - s.pagesFrom + 1,
        })),
      };
    });

    res.json(serialized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
