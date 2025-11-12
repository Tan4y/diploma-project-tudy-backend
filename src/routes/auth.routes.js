import express from "express";
import { register, login } from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// Protected route example
router.get("/profile", verifyToken, (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}!`, user: req.user });
});

export default router;
