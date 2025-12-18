import express from "express";
import {
  requestPasswordReset,
  resetPassword,
  verifyResetToken,
} from "../controllers/resetPassword.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Password Reset
 *   description: User password reset process
 */

/**
 * @swagger
 * /api/auth/request-reset:
 *   post:
 *     summary: Request password reset email
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: myuser
 *     responses:
 *       200:
 *         description: Email sent if user exists
 *       404:
 *         description: User not found
 */
router.post("/request-reset", requestPasswordReset);

/**
 * @swagger
 * /api/auth/verify-reset:
 *   get:
 *     summary: Verify reset token validity
 *     tags: [Password Reset]
 *     parameters:
 *       - name: token
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Invalid or expired token
 */
router.get("/reset-password", verifyResetToken);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using token sent by email
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "f83b2c9a4b1f..."
 *               newPassword:
 *                 type: string
 *                 example: "NewStrongPass123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", resetPassword);

export default router;
