import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import {
  validateRegisterData,
  validateLoginData,
} from "../validators/authValidator.js";
import { createDefaultItemsForUser } from "./typeSubject.controller.js";

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const validationError = validateRegisterData(username, email, password);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const tempToken = jwt.sign(
      { username, email, password: hashedPassword },
      process.env.TEMP_JWT_SECRET,
      { expiresIn: process.env.TEMP_TOKEN_EXPIRES_IN }
    );

    // Send verification email
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verificationLink = `${process.env.CLIENT_URL}/api/auth/verify-email?token=${tempToken}`;

    console.log("Verification link:", verificationLink);

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your email",
        html: `<p>Click this link to verify your email: <a href="${verificationLink}">Verify Email</a></p>`,
      });
    } catch (err) {
      console.error("Failed to send verification email:", err);
      return res
        .status(500)
        .json({ message: "Failed to send verification email" });
    }

    res
      .status(201)
      .json({ message: "Check your email to verify your account" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

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

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email before logging in" });
    }

    const accessToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
      }
    );

    // Успешен вход
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const refreshToken = (req, res) => {
  // Try to get token from body first (for mobile clients), then from cookies (for web clients)
  let token =
    req.body?.token || req.body?.refreshToken || req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const newAccessToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const newRefreshToken = jwt.sign(
      { id: decoded.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    // Verify the temporary token
    const payload = jwt.verify(token, process.env.TEMP_JWT_SECRET);

    // Create the actual user in MongoDB
    const newUser = new User({
      username: payload.username,
      email: payload.email,
      password: payload.password, // already hashed
      isVerified: true,
    });

    await newUser.save();

    await createDefaultItemsForUser(newUser._id);

    return res.status(200).json({
      message: "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    console.error(err);

    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid verification link" });
    }

    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Verification link has expired" });
    }

    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "This account has already been verified" });
    }

    res.status(400).json({ message: "Invalid or expired verification link" });
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
