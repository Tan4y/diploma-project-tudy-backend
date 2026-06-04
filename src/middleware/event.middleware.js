// middleware/event.middleware.js

import { validateEventData } from "../validators/eventValidator.js";

export const validateEvent = (req, res, next) => {
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

  const error = validateEventData(
    title,
    description,
    date,
    startTime,
    endTime,
    type,
  );

  if (error) {
    return res.status(400).json({ message: error });
  }

  next();
};
