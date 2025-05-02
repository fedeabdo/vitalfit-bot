import jwt from "jsonwebtoken";

// Hardcoded secret key for demonstration purposes
const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  throw new Error("JWT_SECRET is not defined in the environment variables");
}

export const generateToken = (payload: object, expiresIn: string | number = "1h"): string => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] });
};

export const verifyToken = (token: string): object | string => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};