import { Request, Response } from "express";
import { verifyPassword } from "../utils/passwordUtils";
import { hashPassword } from "../utils/passwordUtils";
import fs from "fs-extra"; 
import path from "path"; 
import jwt from 'jsonwebtoken';


const adminsPath = path.join(__dirname, "../data/admins.json");


export class AuthController {
  static async login(req: Request, res: Response) {
    const { username, password } = req.body;

    console.log("Looking for user in", adminsPath); 
    console.log("Admins file size:", fs.statSync(adminsPath).size);

    const admins = await fs.readJson(adminsPath); 
    const admin = admins.find((a) => a.username === username);
    if (!admin) {
      res.status(401).json({ error: "Credenciales Invalidas" });
      return;
    }

    try {
      const isValid = await verifyPassword(password, admin.password);
      if (!isValid) {
        res.status(401).json({ error: "Credenciales Invalidas" });
        return;
      }

      const token = jwt.sign(
        { username: admin.username, role: admin.role, name: admin.name },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
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
      const devPassword = req.body.password;

      const hashedPassword = await hashPassword(devPassword);

      console.log("=============================================");
      console.log("Development password hash:", hashedPassword);
      console.log("=============================================");

      res.status(200).json({
        message: "Check server logs for hashed password",
        hash: hashedPassword,
      });
    } catch (error) {
      console.error("Password hash error:", error);
      res.status(500).json({ error: "Failed to generate password hash" });
    }
  }

}