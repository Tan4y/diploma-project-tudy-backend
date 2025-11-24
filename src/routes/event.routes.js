import express from "express";
import {
  createEvent,
  updateEvent,
  getEvents,
  deleteEvent,
} from "../controllers/event.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateEvent } from "../middleware/event.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/events:
 *  get:
 *     summary: Get all events
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []   # Requires JWT token
 *     responses:
 *       200:
 *         description: Successful response
 */
router.get("/", verifyToken, getEvents);

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [study, personal]
 *               pages:
 *                 type: number
 *              # difficulty:
 *               #  type: string
 *               #  enum: [low, medium, high]
 *     responses:
 *       201:
 *         description: Event created successfully
 */
router.post("/", verifyToken, validateEvent, createEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   patch:
 *     summary: Update an existing event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [study, personal]
 *               pages:
 *                 type: number
 *     responses:
 *       200:
 *         description: Event updated successfully
 */
router.patch("/:id", verifyToken, validateEvent, updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 */
router.delete("/:id", verifyToken, deleteEvent);

export default router;
