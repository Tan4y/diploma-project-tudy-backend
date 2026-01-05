import TypeSubject from "../models/TypeSubject.js";

// Default types and subjects
const defaultItems = [
  { name: "Assignment", iconRes: 2130968643, type: "type" },
  { name: "Exam", iconRes: 2130968642, type: "type" },
  { name: "Biology", iconRes: 2130968619, type: "subject" },
  { name: "Chemistry", iconRes: 2130968620, type: "subject" },
  { name: "Computer Science", iconRes: 2130968621, type: "subject" },
  { name: "English", iconRes: 2130968624, type: "subject" },
  { name: "Geography", iconRes: 2130968627, type: "subject" },
  { name: "History", iconRes: 2130968629, type: "subject" },
  { name: "Literature", iconRes: 2130968633, type: "subject" },
  { name: "Mathematics", iconRes: 2130968634, type: "subject" },
  { name: "Physics", iconRes: 2130968636, type: "subject" },
  { name: "Sport", iconRes: 2130968639, type: "subject" },
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

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST add new type or subject
export const addTypeSubject = async (req, res) => {
  try {
    const { name, iconRes, userId, type } = req.body;

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
      iconRes,
      userId,
      type,
    });
    await newTypeSubject.save();

    res.status(201).json(newTypeSubject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
