import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getCalendarItems } from "../controllers/calendar.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/calendar:
 *   get:
 *     summary: Get unified calendar items (events + study sessions)
 *     tags: [Calendar]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar items
 */
router.get("/", verifyToken, getCalendarItems);

export default router;
