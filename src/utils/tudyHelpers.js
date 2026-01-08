import Event from "../models/Event.js";

export const getUpcomingTudiesCount = async (userId, subjectName) => {
  const count = await Event.countDocuments({
    user: userId,
    type: "study",
    subject: subjectName,
    date: { $gte: new Date() },
  });
  return count;
};

export const getUpcomingTudiesCountByCategory = async (
  userId,
  categoryName
) => {
  const count = await Event.countDocuments({
    user: userId,
    type: "study",
    category: categoryName,
    date: { $gte: new Date() },
  });
  return count;
};
