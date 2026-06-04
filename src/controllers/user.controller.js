import User from "../models/User.js";

export const addRealStudyTime = async (req, res) => {
  try {
    const { minutes, date } = req.body;
    const userId = req.user.id;

    if (!minutes || minutes <= 0 || !date) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.realStudyLogs.push({ minutes, date });
    user.totalRealStudyMinutes += minutes;

    await user.save();

    res.status(200).json({
      message: "Real study time saved",
      totalRealStudyMinutes: user.totalRealStudyMinutes,
    });
  } catch (err) {
    console.error("addRealStudyTime error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserStudyStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "realStudyLogs totalRealStudyMinutes",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const studyMinutesPerDay = {};

    user.realStudyLogs.forEach((log) => {
      if (!studyMinutesPerDay[log.date]) {
        studyMinutesPerDay[log.date] = 0;
      }
      studyMinutesPerDay[log.date] += log.minutes;
    });

    res.status(200).json({
      totalRealStudyMinutes: user.totalRealStudyMinutes,
      studyMinutesPerDay,
    });
  } catch (err) {
    console.error("getUserStudyStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
