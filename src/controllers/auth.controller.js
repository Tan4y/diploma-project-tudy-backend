import User from "../models/User.js";
import bcrypt from "bcrypt";
import { validateRegisterData } from "../validators/authValidator.js";

// Регистрация
export const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Валидация
    const validationError = validateRegisterData(username, password);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Проверка дали потребителят вече съществува
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Хеширане на паролата
    const hashedPassword = await bcrypt.hash(password, 10);

    // Създаване на нов потребител
    const newUser = new User({
      username,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
