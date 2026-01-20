import Event from "../models/Event.js";
import StudyPlan from "../models/StudyPlan.js";
import { generateAdaptiveStudyPlan } from "../services/studyScheduler.service.js";
import TypeSubject from "../models/TypeSubject.js";

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

    const existingEvent = await Event.findOne({
      user: userId,
      title: title.trim(),
      date: date,
      type: type,
      subject: type === "study" ? subject : undefined,
      category: type === "study" ? category : undefined,
    });

    if (existingEvent) {
      return res.status(400).json({
        message: "Event with this title already exists on this date",
        event: existingEvent,
      });
    }

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
      const studyPlanData = await generateAdaptiveStudyPlan(event, userId);

      const sessionsForDB = (studyPlanData.sessions || []).map((s) => ({
        start: s.start,
        end: s.end,
        pagesFrom: s.pagesFrom,
        pagesTo: s.pagesTo,
        note: s.note || "Initial study",
      }));

      if (sessionsForDB.length > 0) {
        await StudyPlan.findOneAndUpdate(
          { eventId: event._id },
          {
            userId: req.user.id,
            eventId: event._id,
            eventDate: event.date,
            subject: event.subject,
            category: event.category,
            sessions: sessionsForDB,
          },
          { upsert: true, new: true }
        );
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
    const oldCategory = event.category;
    const oldSubject = event.subject;
    const oldType = event.type;

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
    if (oldType === "study" && event.type !== "study") {
      // study → personal
      if (oldCategory) {
        await TypeSubject.findOneAndUpdate(
          { userId: req.user.id, name: oldCategory, type: "type" },
          { $inc: { tudies: -1 } }
        );
      }
      if (oldSubject) {
        await TypeSubject.findOneAndUpdate(
          { userId: req.user.id, name: oldSubject, type: "subject" },
          { $inc: { tudies: -1 } }
        );
      }
    }

    if (oldType !== "study" && event.type === "study") {
      // personal → study
      if (event.category) {
        await TypeSubject.findOneAndUpdate(
          { userId: req.user.id, name: event.category, type: "type" },
          { $inc: { tudies: 1 } }
        );
      }
      if (event.subject) {
        await TypeSubject.findOneAndUpdate(
          { userId: req.user.id, name: event.subject, type: "subject" },
          { $inc: { tudies: 1 } }
        );
      }
    }

    // study updated & changed category/subject
    if (oldType === "study" && event.type === "study") {
      if (oldCategory !== event.category) {
        if (oldCategory)
          await TypeSubject.findOneAndUpdate(
            { userId: req.user.id, name: oldCategory, type: "type" },
            { $inc: { tudies: -1 } }
          );

        if (event.category)
          await TypeSubject.findOneAndUpdate(
            { userId: req.user.id, name: event.category, type: "type" },
            { $inc: { tudies: 1 } }
          );
      }

      if (oldSubject !== event.subject) {
        if (oldSubject)
          await TypeSubject.findOneAndUpdate(
            { userId: req.user.id, name: oldSubject, type: "subject" },
            { $inc: { tudies: -1 } }
          );

        if (event.subject)
          await TypeSubject.findOneAndUpdate(
            { userId: req.user.id, name: event.subject, type: "subject" },
            { $inc: { tudies: 1 } }
          );
      }
    }

    // Ако е учебно събитие, обновяваме StudyPlan
    if (event.type === "study" && event.totalPages > 0) {
      const studyPlanData = await generateAdaptiveStudyPlan(event, req.user.id);

      const sessionsForDB = (studyPlanData.sessions || []).map((s) => ({
        start: s.start,
        end: s.end,
        pagesFrom: s.pagesFrom,
        pagesTo: s.pagesTo,
        note: s.note || "Updated study",
      }));

      await StudyPlan.findOneAndUpdate(
        { eventId: event._id },
        {
          userId: req.user.id,
          eventId: event._id,
          eventDate: event.date,
          subject: event.subject,
          category: event.category,
          sessions: sessionsForDB,
        },
        { upsert: true, new: true }
      );
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
      if (event.category) {
        await TypeSubject.findOneAndUpdate(
          { userId, name: event.category, type: "type" },
          { $inc: { tudies: -1 } }
        );
      }

      if (event.subject) {
        await TypeSubject.findOneAndUpdate(
          { userId, name: event.subject, type: "subject" },
          { $inc: { tudies: -1 } }
        );
      }

      await StudyPlan.deleteMany({ eventId: event._id });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
