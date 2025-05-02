import { Request, Response } from "express";
import { generateToken } from "../config/jwt";
import { verifyPassword } from "../utils/passwordUtils";
import {hashPassword} from "../utils/passwordUtils";
import admins from "../data/admins.json"; // Import the stored admin credentials

export class AuthController {
  static async login(req: Request, res: Response) {
    const { username, password } = req.body;
  
    // Find admin by username
    const admin = admins.find(a => a.username === username);
    if (!admin) {
      res.status(401).json({ error: "Credenciales Invalidas" });
      return;
    }
  
    // Verify password using bcrypt.compare
    try {
      const isValid = await verifyPassword(password, admin.password);
      if (!isValid) {
        res.status(401).json({ error: "Credenciales Invalidas" });
        return;
      }
  
      // Generate JWT token
      const token = generateToken({ username }, "1h");
      res.json({ token });
      return;
  
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
      return;
    }
  }

  static async createPassword(req: Request, res: Response) {
    try {
      // Hardcode a development password (change this for real use)
      const devPassword = req.body.password;
      
      // Hash the password
      const hashedPassword = await hashPassword(devPassword);
      
      // Log to console for development purposes
      console.log("=============================================");
      console.log("Development password hash:", hashedPassword);
      console.log("=============================================");
      
      // Response with hash (optional)
      res.status(200).json({ 
        message: "Check server logs for hashed password",
        hash: hashedPassword 
      });

    } catch (error) {
      console.error("Password hash error:", error);
      res.status(500).json({ error: "Failed to generate password hash" });
    }
  }
}