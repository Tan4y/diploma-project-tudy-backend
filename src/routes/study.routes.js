// src/routes/study.routes.js
import express from "express";
import {
  createStudyPlanForEvent,
  previewStudyPlan,
  getAllStudyPlans,
} from "../controllers/study.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/study/preview:
 *   post:
 *     summary: Preview of a proposed curriculum for a given eventId (does not save to DB)
 *     tags:
 *       - Study
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *             properties:
 *               eventId:
 *                 type: string
 *                 example: "64af...1"
 *     responses:
 *       200:
 *         description: Returns a draft curriculum (preview)
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server Error
 */
router.post("/preview", verifyToken, previewStudyPlan);

/**
 * @swagger
 * /api/study/create:
 *   post:
 *     summary: Generates a lesson plan for eventId and saves it to the database
 *     tags:
 *       - Study
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *             properties:
 *               eventId:
 *                 type: string
 *                 example: "64af...1"
 *     responses:
 *       200:
 *         description: Successfully created curriculum and saved to DB
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error
 */
router.post("/create", verifyToken, createStudyPlanForEvent);

/**
 * @swagger
 * /api/study/study-plans:
 *   get:
 *     tags:
 *       - Study Plans
 *     summary: Get all study plans for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of study plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   eventId:
 *                     type: string
 *                   sessions:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         sessionNumber:
 *                           type: number
 *                         startTime:
 *                           type: string
 *                           format: date-time
 *                         endTime:
 *                           type: string
 *                           format: date-time
 *                         pages:
 *                           type: number
 *                   eventDate:
 *                     type: string
 *                     format: date
 *       401:
 *         description: Missing or invalid token
 *       500:
 *         description: Server error
 */

router.get("/study-plans", verifyToken, getAllStudyPlans);

export default router;
