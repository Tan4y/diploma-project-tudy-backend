import express from "express";
const router = express.Router();
import {
  getTypeSubjects,
  addTypeSubject,
} from "../controllers/typeSubject.controller.js";

// GET all types or subjects for a user, optionally filtered by type
router.get("/:userId", getTypeSubjects);

// POST add a new type or subject
router.post("/", addTypeSubject);

export default router;
