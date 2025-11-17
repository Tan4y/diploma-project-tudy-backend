import express from "express";
import {
  register,
  login,
  refreshToken,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiter for login route
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 attempts per window
  message: "Too many login attempts, please try again later.",
});

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login with rate limiter
router.post("/login", loginLimiter, login);

// New refrsh route
router.post("/refresh", refreshToken);

// Protected route example
router.get("/profile", verifyToken, (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}!`, user: req.user });
});

export default router;
