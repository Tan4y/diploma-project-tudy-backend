import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Формат: "Bearer TOKEN"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // добавя потребителя в заявката
    next();
  } catch (error) {
    console.error("JWT verification failed:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
