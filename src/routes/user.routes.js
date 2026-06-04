import express from "express";
import { addRealStudyTime } from "../controllers/user.controller.js";
import { getUserStudyStats } from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getUserById } from "../controllers/auth.controller.js";
import { deleteUser } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/study-time", verifyToken, addRealStudyTime);
router.get("/stats", verifyToken, getUserStudyStats);
router.get("/:id", getUserById);
router.delete("/:id", deleteUser);

export default router;
