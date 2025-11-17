export const validateEventData = (title, description, date) => {
  if (!title || title.trim() === "") return "Title is required";
  if (title.length < 3) return "Title must be at least 3 characters";
  if (title.length > 30) return "Title cannot exceed 30 characters";

  if (description && description.length > 200)
    return "Description cannot exceed 200 characters";

  if (!date) return "Date is required";

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return "Invalid date format";

  return null;
};
