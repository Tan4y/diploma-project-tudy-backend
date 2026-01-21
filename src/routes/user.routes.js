import express from "express";
import { addRealStudyTime } from "../controllers/user.controller.js";
import { getUserStudyStats } from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/study-time", verifyToken, addRealStudyTime);
router.get("/stats", verifyToken, getUserStudyStats);

export default router;
