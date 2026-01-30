import mongoose from "mongoose";
import User from "./models/User.js";
import path from "path";
dotenv.config({ path: path.resolve("../.env") });
import dotenv from "dotenv";

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const users = await User.find();
    process.exit();
  })
  .catch((err) => console.error(err));
