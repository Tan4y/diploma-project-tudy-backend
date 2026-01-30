import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import eventRoutes from "./routes/event.routes.js";
import resetRoutes from "./routes/reset.routes.js";
import studyRoutes from "./routes/study.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import typeSubjectRoutes from "./routes/typeSubject.routes.js";
import calendarRoutes from "./routes/calendar.routes.js";
import userRoutes from "./routes/user.routes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
connectDB();

const app = express();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth-pages", express.static(path.join(__dirname, "../templates")));

app.use("/api/auth", authRoutes);
app.use("/api/auth", resetRoutes);

app.use("/api/users", userRoutes);
//app.use("/api/users", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/type-subject", typeSubjectRoutes);
app.use("/api/calendar", calendarRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
