// src/routes/study.routes.js
import express from "express";
import {
  createStudyPlanForEvent,
  previewStudyPlan,
} from "../controllers/study.controller.js";

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
router.post("/preview", previewStudyPlan);

/**
 * @swagger
 * /api/study/create:
 *   post:
 *     summary: Generates a lesson plan for eventId and saves it to the database
 *     tags:
 *       - Study
 *     security:
 *       - bearerAuth: []
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
router.post("/create", createStudyPlanForEvent);

export default router;
