import Event from "../models/Event.js";
import StudyPlan from "../models/StudyPlan.js";
import { generateAdaptiveStudyPlan } from "../services/studyScheduler.service.js";
import TypeSubject from "../models/TypeSubject.js";

const timeToMinutes = (time) => {
  if (!time) throw new Error("Time is missing");

  if (time instanceof Date) {
    return time.getUTCHours() * 60 + time.getUTCMinutes();
  }

  if (typeof time === "string") {
    if (time.includes("T")) {
      const date = new Date(time);
      if (isNaN(date)) throw new Error("Invalid ISO time");
      return date.getUTCHours() * 60 + date.getUTCMinutes();
    }

    const [hours, minutes] = time.split(":").map(Number);
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    )
      throw new Error("Invalid time format");

    return hours * 60 + minutes;
  }

  throw new Error("Unsupported time type");
};

function parseISODate(isoString) {
  if (!isoString) return null;
  if (isoString instanceof Date) return new Date(isoString);

  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${isoString}`);
  }

  return date;
}

async function regenerateAllStudyPlans(userId) {
  try {
    const studyEvents = await Event.find({
      user: userId,
      type: "study",
    });

    for (const studyEvent of studyEvents) {
      const studyPlanData = await generateAdaptiveStudyPlan(studyEvent, userId);

      const sessionsForDB = (studyPlanData.sessions || []).map((s) => ({
        start: s.start,
        end: s.end,
        pagesFrom: s.pagesFrom,
        pagesTo: s.pagesTo,
        note: s.note || "Rescheduled",
      }));

      if (sessionsForDB.length > 0) {
        await StudyPlan.findOneAndUpdate(
          { eventId: studyEvent._id },
          {
            userId: userId,
            eventId: studyEvent._id,
            eventDate: studyEvent.date,
            subject: studyEvent.subject,
            category: studyEvent.category,
            sessions: sessionsForDB,
          },
          { upsert: true, new: true },
        );
      }
    }
  } catch (error) {
    console.error("Error regenerating study plans:", error);
  }
}

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
    const userId = req.user.id;

    let parsedDate, parsedStartTime, parsedEndTime;
    try {
      parsedDate = parseISODate(date);
      parsedStartTime = parseISODate(startTime);
      parsedEndTime = parseISODate(endTime);
    } catch (e) {
      console.error("Date parsing error:", e.message);
      return res
        .status(400)
        .json({ message: "Invalid date format", error: e.message });
    }

    const existingEvent = await Event.findOne({
      user: userId,
      title: title.trim(),
      date: parsedDate,
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
      date: parsedDate,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      type,
      category: type === "study" ? category : undefined,
      subject: type === "study" ? subject : undefined,
      totalPages: pages,
      user: userId,
    });

    const eventsOnDate = await Event.find({
      user: userId,
      date: parsedDate,
    });

    const newStart = timeToMinutes(parsedStartTime);
    const newEnd = timeToMinutes(parsedEndTime);

    const hasOverlap = eventsOnDate.some((e) => {
      const existingStart = timeToMinutes(e.startTime);
      const existingEnd = timeToMinutes(e.endTime);
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasOverlap) {
      return res.status(400).json({
        message: "Event overlaps with an existing event",
      });
    }

    await event.save();

    await regenerateAllStudyPlans(userId);

    res.status(201).json({ message: "Event created successfully", event });
  } catch (error) {
    console.error("CreateEvent error:", error);
    res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const oldCategory = event.category;
    const oldSubject = event.subject;
    const oldType = event.type;
    const oldDate = new Date(event.date);
    const oldStartTime = event.startTime;
    const oldEndTime = event.endTime;

    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    let parsedDate = event.date;
    let parsedStartTime = event.startTime;
    let parsedEndTime = event.endTime;

    if (req.body.date) {
      parsedDate = parseISODate(req.body.date);
    }
    if (req.body.startTime) {
      parsedStartTime = parseISODate(req.body.startTime);
    }
    if (req.body.endTime) {
      parsedEndTime = parseISODate(req.body.endTime);
    }

    event.title = req.body.title || event.title;
    event.description = req.body.description ?? event.description;
    event.date = parsedDate;
    event.type = req.body.type || event.type;
    event.totalPages = req.body.pages ?? event.totalPages;
    event.startTime = parsedStartTime;
    event.endTime = parsedEndTime;

    if (event.type === "study") {
      event.category = req.body.category || event.category;
      event.subject = req.body.subject || event.subject;
    } else {
      event.category = undefined;
      event.subject = undefined;
    }

    const eventsOnDate = await Event.find({
      user: req.user.id,
      date: parsedDate,
      _id: { $ne: event._id },
    });

    const newStart = timeToMinutes(parsedStartTime);
    const newEnd = timeToMinutes(parsedEndTime);

    const hasOverlap = eventsOnDate.some((e) => {
      const existingStart = timeToMinutes(e.startTime);
      const existingEnd = timeToMinutes(e.endTime);
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasOverlap) {
      return res.status(400).json({
        message: "Updated event overlaps with an existing event",
      });
    }

    await event.save();

    if (oldType === "study" && event.type !== "study") {
      if (oldCategory) {
        await TypeSubject.findOneAndUpdate(
          { userId: req.user.id, name: oldCategory, type: "type" },
          { $inc: { tudies: -1 } },
        );
      }
      if (oldSubject) {
        await TypeSubject.findOneAndUpdate(
          { userId: req.user.id, name: oldSubject, type: "subject" },
          { $inc: { tudies: -1 } },
        );
      }
    }

    if (oldType !== "study" && event.type === "study") {
      if (event.category) {
        await TypeSubject.findOneAndUpdate(
          { userId: req.user.id, name: event.category, type: "type" },
          { $inc: { tudies: 1 } },
        );
      }
      if (event.subject) {
        await TypeSubject.findOneAndUpdate(
          { userId: req.user.id, name: event.subject, type: "subject" },
          { $inc: { tudies: 1 } },
        );
      }
    }

    if (oldType === "study" && event.type === "study") {
      if (oldCategory !== event.category) {
        if (oldCategory)
          await TypeSubject.findOneAndUpdate(
            { userId: req.user.id, name: oldCategory, type: "type" },
            { $inc: { tudies: -1 } },
          );

        if (event.category)
          await TypeSubject.findOneAndUpdate(
            { userId: req.user.id, name: event.category, type: "type" },
            { $inc: { tudies: 1 } },
          );
      }

      if (oldSubject !== event.subject) {
        if (oldSubject)
          await TypeSubject.findOneAndUpdate(
            { userId: req.user.id, name: oldSubject, type: "subject" },
            { $inc: { tudies: -1 } },
          );

        if (event.subject)
          await TypeSubject.findOneAndUpdate(
            { userId: req.user.id, name: event.subject, type: "subject" },
            { $inc: { tudies: 1 } },
          );
      }
    }

    if (
      oldDate.getTime() !== event.date.getTime() ||
      oldStartTime.toString() !== event.startTime.toString() ||
      oldEndTime.toString() !== event.endTime.toString()
    ) {
      await regenerateAllStudyPlans(req.user.id);
    }

    res.json({ message: "Event updated successfully", event });
  } catch (error) {
    console.error("UPDATE EVENT ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

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

export const deleteEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const event = await Event.findOne({ _id: eventId, user: userId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await event.deleteOne();

    if (event.type === "study") {
      if (event.category) {
        await TypeSubject.findOneAndUpdate(
          { userId, name: event.category, type: "type" },
          { $inc: { tudies: -1 } },
        );
      }

      if (event.subject) {
        await TypeSubject.findOneAndUpdate(
          { userId, name: event.subject, type: "subject" },
          { $inc: { tudies: -1 } },
        );
      }

      await StudyPlan.deleteMany({ eventId: event._id });
    }

    await regenerateAllStudyPlans(userId);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
