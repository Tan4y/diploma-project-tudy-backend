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

// Всички тези изискват токен
router.post("/", verifyToken, validateEvent, createEvent);
router.patch("/:id", verifyToken, validateEvent, updateEvent);
router.get("/", verifyToken, getEvents);
router.delete("/:id", verifyToken, deleteEvent);

export default router;
