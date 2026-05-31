"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = void 0;
const jwt_1 = require("../config/jwt");
const authenticateJWT = (req, res, next) => {
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
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = decoded; // Attach the decoded token payload to the request object
        next(); // Pass control to the next middleware or route handler
    }
    catch (error) {
        res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }
};
exports.authenticateJWT = authenticateJWT;
