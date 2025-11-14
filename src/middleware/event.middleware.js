import { validateEventData } from "../validators/eventValidator.js";

export const validateEvent = (req, res, next) => {
  const { title, description, date } = req.body;

  const error = validateEventData(title, description, date);
  if (error) {
    return res.status(400).json({ message: error });
  }

  next();
};
