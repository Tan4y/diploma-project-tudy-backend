import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  validateRegisterData,
  validateLoginData,
} from "../validators/authValidator.js";

// Регистрация
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Валидация
    const validationError = validateRegisterData(username, email, password);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Проверка дали потребителят вече съществува
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Хеширане на паролата
    const hashedPassword = await bcrypt.hash(password, 10);

    // Създаване на нов потребител
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Вход
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Валидация чрез validator
    const validationError = validateLoginData(username, password);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Проверка дали потребителят съществува
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Проверка на паролата
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Access токен
    const accessToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    // Refresh токен
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" }
    );

    // Успешен вход
    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: { id: user._id, username: user.username },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password"); // exclude passwords
    res.status(200).json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const refreshToken = (req, res) => {
  const { token } = req.body;
  if (!token)
    return res.status(401).json({ message: "No refresh token provided" });

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const newAccessToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};
