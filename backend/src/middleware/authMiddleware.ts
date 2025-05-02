import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {

  if (req.originalUrl === "/api/login" || req.originalUrl === "/api/createPassword") {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    (req as any).user = decoded; // Attach the decoded token payload to the request object
    next(); // Pass control to the next middleware or route handler
  } catch (error) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};