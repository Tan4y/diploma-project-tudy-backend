import express from "express";
const router = express.Router();
import {
  getTypeSubjects,
  addTypeSubject,
  deleteTypeSubject,
} from "../controllers/typeSubject.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

// GET all types or subjects for a user, optionally filtered by type
router.get("/:userId", verifyToken, getTypeSubjects);

// POST add a new type or subject
router.post("/", verifyToken, addTypeSubject);

// DELETE a type or subject by ID for a user
router.delete("/:userId/:id", verifyToken, deleteTypeSubject);

export default router;
