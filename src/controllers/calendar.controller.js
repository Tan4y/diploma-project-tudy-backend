import Event from "../models/Event.js";
import StudyPlan from "../models/StudyPlan.js";
import { CalendarItemDTO } from "../dtos/CalendarItemDTO.js";

export const getCalendarItems = async (req, res) => {
  try {
    const userId = req.user.id;

    // Only get StudyPlans (which have sessions)
    const studyPlans = await StudyPlan.find({ userId }).populate(
      "eventId",
      "title subject category",
    );

    const calendarItems = [];

    // Only iterate through studyPlans and their sessions
    studyPlans.forEach((plan) => {
      const eventTitle = plan.eventId?.title ?? "Study Session";

      (plan.sessions || []).forEach((s, idx) => {
        if (!s?.start || !s?.end) return;

        calendarItems.push(
          new CalendarItemDTO({
            id: `${plan._id}-${idx + 1}`,
            title: eventTitle,
            date: s.start.toISOString(),
            startTime: s.start.toISOString(),
            endTime: s.end.toISOString(),
            type: "study",
            isStudySession: true,
            subject: plan.subject,
            category: plan.category,
            pagesFrom: s.pagesFrom,
            pagesTo: s.pagesTo,
          }),
        );
      });
    });

    res.json(calendarItems);
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
