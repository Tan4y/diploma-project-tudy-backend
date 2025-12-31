import Event from "../models/Event.js";
import StudyPlan from "../models/StudyPlan.js";
import { generateAdaptiveStudyPlan } from "../services/studyScheduler.service.js";

// Създаване на събитие
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      type,
      category,
      subject,
      pages,
    } = req.body;
    const userId = req.user.id; // от JWT middleware

    const event = new Event({
      title,
      description,
      date,
      startTime,
      endTime,
      type, // "study" или "personal"
      category: type === "study" ? category : undefined,
      subject: type === "study" ? subject : undefined,
      totalPages: pages, // само за учебни събития
      user: userId,
    });

    await event.save();

    // Ако събитието е учебно, генерираме автоматичен план
    if (type === "study" && pages > 0) {
      let studyPlanData = await generateAdaptiveStudyPlan({
        userId,
        eventId: event._id,
        pages,
        eventDate: date,
        userSettings: req.user.settings, // start/end time, preferences
      });

      // Make sure required fields exist
      const safeStudyPlanData = {
        userId,
        eventId: event._id,
        eventDate: date,
        sessions: Array.isArray(studyPlanData.sessions)
          ? studyPlanData.sessions
          : [],
      };

      // Only create StudyPlan if sessions exist
      if (safeStudyPlanData.sessions.length > 0) {
        await StudyPlan.create(safeStudyPlanData);
      }
    }

    res.status(201).json({ message: "Event created successfully", event });
  } catch (error) {
    console.error("CreateEvent error:", error);
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

// Промяна на събитието
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    // Проверка за собственост
    if (event.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    // Обновяване на полетата
    event.title = req.body.title || event.title;
    event.description = req.body.description ?? event.description;
    event.date = req.body.date || event.date;
    event.type = req.body.type || event.type;
    event.totalPages = req.body.pages ?? event.totalPages;
    event.startTime = req.body.startTime || event.startTime;
    event.endTime = req.body.endTime || event.endTime;

    if (event.type === "study") {
      event.category = req.body.category || event.category;
      event.subject = req.body.subject || event.subject;
    } else {
      event.category = undefined;
      event.subject = undefined;
    }

    await event.save();

    // Ако е учебно събитие, обновяваме StudyPlan
    if (event.type === "study" && event.totalPages > 0) {
      // Изтриваме стария план и създаваме нов
      await StudyPlan.deleteMany({ eventId: event._id });
      const studyPlanData = await generateAdaptiveStudyPlan(event, req.user.id);
      if (studyPlanData.sessions && studyPlanData.sessions.length > 0) {
        await StudyPlan.create(studyPlanData);
      }
    }

    res.json({ message: "Event updated successfully", event });
  } catch (error) {
    console.error("UPDATE EVENT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Вземане на всички събития на потребителя
export const getEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const events = await Event.find({ user: userId }).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Изтриване на събитие
export const deleteEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const event = await Event.findOne({ _id: eventId, user: userId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await event.deleteOne();

    // Ако е учебно, изтриваме свързания план
    if (event.type === "study") {
      await StudyPlan.deleteMany({ eventId: event._id });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
