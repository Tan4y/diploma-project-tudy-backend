// validators/eventValidator.js
const MIN_EVENT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const validateEventData = (
  title,
  description,
  date,
  startTime,
  endTime,
  type,
) => {
  // Validate title
  if (!title || title.trim() === "") return "Title is required";
  if (title.length < 3) return "Title must be at least 3 characters";
  if (title.length > 30) return "Title cannot exceed 30 characters";

  // Validate description
  if (description && description.length > 200)
    return "Description cannot exceed 200 characters";

  // Validate date
  if (!date) return "Date is required";
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return "Invalid date format";

  // Validate startTime
  if (!startTime) return "Start time is required";
  const parsedStartTime = new Date(startTime);
  if (isNaN(parsedStartTime.getTime())) return "Invalid start time format";

  // Validate endTime
  if (!endTime) return "End time is required";
  const parsedEndTime = new Date(endTime);
  if (isNaN(parsedEndTime.getTime())) return "Invalid end time format";

  // Validate that endTime is after startTime
  if (parsedEndTime <= parsedStartTime) {
    return "End time must be after start time";
  }

  // Validate minimum duration (15 minutes)
  const durationMs = parsedEndTime.getTime() - parsedStartTime.getTime();

  if (durationMs < MIN_EVENT_DURATION_MS) {
    return "Event duration must be at least 15 minutes";
  }

  // Validate type
  if (!type) return "Type is required";
  if (!["study", "personal"].includes(type)) {
    return "Type must be either 'study' or 'personal'";
  }

  // Validate pages for study events
  if (type === "study") {
    // pages is optional, but if provided should be a positive number
    // This validation will happen in the controller
  }

  return null;
};
