import express from "express";
import {
  register,
  login,
  refreshToken,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";
import { verifyEmail } from "../controllers/auth.controller.js";
import { getAllUsers } from "../controllers/auth.controller.js";

const router = express.Router();

// Rate limiter for login route
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 attempts per window
  message: "Too many login attempts, please try again later.",
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: myuser
 *               email:
 *                 type: string
 *                 example: myemail@gmail.com
 *               password:
 *                 type: string
 *                 example: mypassword
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Username already exists
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify a user's email address
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token sent by email
 *     responses:
 *       302:
 *         description: Redirect to login on success
 *       400:
 *         description: Invalid or expired token
 */

router.get("/verify-email", verifyEmail);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: myuser
 *               password:
 *                 type: string
 *                 example: mypassword
 *     responses:
 *       200:
 *         description: Successful login returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 */

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login with rate limiter
router.post("/login", loginLimiter, login);

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       isVerified:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get("/users", verifyToken, getAllUsers);

// New refrsh route
router.post("/refresh", refreshToken);

// Protected route example
router.get("/profile", verifyToken, (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}!`, user: req.user });
});

export default router;
