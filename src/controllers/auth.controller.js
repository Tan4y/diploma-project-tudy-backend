import User from "../models/User.js";
import bcrypt from "bcrypt";

// Регистрация
export const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Проверка на празни полета
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Проверка на минимална дължина на паролата
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    // Проверка на username (примерно само букви и цифри)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res
        .status(400)
        .json({
          message:
            "Username can only contain letters, numbers, and underscores",
        });
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
