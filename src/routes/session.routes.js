import express from "express";
import { completeStudySession } from "../controllers/session.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/sessions/finish:
 *   post:
 *     summary: Records a completed learning session for the user
 *     tags: [Study Sessions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - duration
 *             properties:
 *               duration:
 *                 type: number
 *                 example: 25
 *                 description: Duration of the study session in minutes
 *     responses:
 *       201:
 *         description: Session recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Study session saved successfully
 *                 totalStudyMinutes:
 *                   type: number
 *                   example: 150
 *                 completedStudySessions:
 *                   type: number
 *                   example: 5
 *       400:
 *         description: Invalid session duration
 *       401:
 *         description: Missing or invalid JWT token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server Error
 */
router.post("/finish", verifyToken, completeStudySession);

export default router;
