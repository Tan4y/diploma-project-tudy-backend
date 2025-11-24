import User from "../models/User.js";

export const completeStudySession = async (req, res) => {
  try {
    const { duration } = req.body;
    const userId = req.user && req.user.id;

    if (!duration || duration <= 0) {
      return res.status(400).json({ message: "Invalid session duration" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.studySessions.push({
      duration,
      completed: true,
    });

    user.totalStudyMinutes += duration;
    user.completedStudySessions += 1;

    await user.save();

    res.status(201).json({
      message: "Study session saved successfully",
      totalStudyMinutes: user.totalStudyMinutes,
      completedStudySessions: user.completedStudySessions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
