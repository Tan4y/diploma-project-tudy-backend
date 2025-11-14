import Event from "../models/Event.js";

// Създаване на събитие
export const createEvent = async (req, res) => {
  try {
    const { title, description, date } = req.body;
    const userId = req.user.id; // от JWT middleware

    const event = new Event({
      title,
      description,
      date,
      user: userId,
    });

    await event.save();

    res.status(201).json({ message: "Event created successfully", event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Промяна на събитието
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    // Check ownership
    if (event.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    // Update fields
    event.title = req.body.title || event.title;
    event.description = req.body.description || event.description;
    event.date = req.body.date || event.date;

    await event.save();

    res.json({ message: "Event updated successfully", event });
  } catch (error) {
    console.error(error);
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
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
