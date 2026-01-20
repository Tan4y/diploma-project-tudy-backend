import TypeSubject from "../models/TypeSubject.js";
import { getUpcomingTudiesCount } from "../utils/tudyHelpers.js";
import { getUpcomingTudiesCountByCategory } from "../utils/tudyHelpers.js";

// Default types and subjects
const defaultItems = [
  { name: "Assignment", iconName: "type_homework", type: "type" },
  { name: "Exam", iconName: "type_exam", type: "type" },
  { name: "Biology", iconName: "subject_biology", type: "subject" },
  { name: "Chemistry", iconName: "subject_chemistry", type: "subject" },
  {
    name: "Computer Science",
    iconName: "subject_computer_science",
    type: "subject",
  },
  { name: "English", iconName: "subject_english", type: "subject" },
  { name: "Geography", iconName: "subject_geography", type: "subject" },
  { name: "History", iconName: "subject_history", type: "subject" },
  { name: "Literature", iconName: "subject_literature", type: "subject" },
  { name: "Mathematics", iconName: "subject_mathematics", type: "subject" },
  { name: "Physics", iconName: "subject_physics", type: "subject" },
  { name: "Sport", iconName: "subject_sport", type: "subject" },
];

// Function to create defaults for a new user
export const createDefaultItemsForUser = async (userId) => {
  const itemsToInsert = defaultItems.map((item) => ({
    ...item,
    userId,
  }));
  await TypeSubject.insertMany(itemsToInsert);
};

// GET all types/subjects for a user
export const getTypeSubjects = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { userId: req.params.userId };
    if (type) query.type = type;

    let items = await TypeSubject.find(query);

    if (items.length === 0) {
      await createDefaultItemsForUser(req.params.userId);
      items = await TypeSubject.find(query);
    }

    const itemsWithCounts = await Promise.all(
      items.map(async (item) => {
        let upcomingCount = 0;
        if (item.type === "subject") {
          upcomingCount = await getUpcomingTudiesCount(
            req.params.userId,
            item.name
          );
        } else if (item.type === "type") {
          upcomingCount = await getUpcomingTudiesCountByCategory(
            req.params.userId,
            item.name
          );
        }
        return {
          ...item.toObject(),
          tudies: upcomingCount,
        };
      })
    );

    res.json(itemsWithCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST add new type or subject
export const addTypeSubject = async (req, res) => {
  try {
    const { name, iconName, userId, type } = req.body;

    if (name.length > 16) {
      return res.status(400).json({
        error: "Name must be 1-16 characters",
      });
    }

    const existing = await TypeSubject.findOne({
      name: name.trim(),
      userId,
      type,
    });
    if (existing) {
      return res.status(409).json({ error: "Item already exists" });
    }

    const newTypeSubject = new TypeSubject({
      name: name.trim(),
      iconName,
      userId,
      type,
    });
    await newTypeSubject.save();

    res.status(201).json(newTypeSubject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteTypeSubject = async (req, res) => {
  try {
    const { userId, id } = req.params;

    const item = await TypeSubject.findOne({ _id: id, userId });
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    if (item.type === "subject") {
      const upcomingCount = await getUpcomingTudiesCount(userId, item.name);
      if (upcomingCount > 0) {
        return res.status(400).json({
          error: "Cannot delete subject with upcoming studies",
        });
      }
    } else if (item.type === "type") {
      const upcomingCount = await getUpcomingTudiesCountByCategory(
        userId,
        item.name
      );
      if (upcomingCount > 0) {
        return res.status(400).json({
          error: "Cannot delete type with upcoming studies",
        });
      }
    }

    await TypeSubject.deleteOne({ _id: id, userId });

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
