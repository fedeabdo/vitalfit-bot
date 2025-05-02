import { Request, Response } from "express";
import { generateToken } from "../config/jwt";
import { verifyPassword } from "../utils/passwordUtils";
import {hashPassword} from "../utils/passwordUtils";
import admins from "../data/admins.json"; // Import the stored admin credentials

export class AuthController {
  static async login(req: Request, res: Response) {
    console.log("Entro a login");
    const { username, password } = req.body;

    // Find the admin by username
    const admin = admins.find((admin) => admin.username === username);
    if (!admin) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    // Verify the password
    const isPasswordValid = await verifyPassword(password, admin.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    // Generate a JWT token
    const token = generateToken({ username }, "1h");
    res.status(200).json({ token });
    return;
  }

  static createPassword(req: Request, res: Response) {
    const { password} = req.body;

    (async () => {
        const hashedPassword = await hashPassword("your-secure-password");
        console.log(hashedPassword);
      })();
  }
}