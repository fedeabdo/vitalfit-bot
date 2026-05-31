"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const passwordUtils_1 = require("../utils/passwordUtils");
const passwordUtils_2 = require("../utils/passwordUtils");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const adminsPath = path_1.default.join(__dirname, "../data/admins.json");
class AuthController {
    static async login(req, res) {
        const { username, password } = req.body;
        console.log("Looking for user in", adminsPath);
        console.log("Admins file size:", fs_extra_1.default.statSync(adminsPath).size);
        const admins = await fs_extra_1.default.readJson(adminsPath);
        const admin = admins.find((a) => a.username === username);
        if (!admin) {
            res.status(401).json({ error: "Credenciales Invalidas" });
            return;
        }
        try {
            const isValid = await (0, passwordUtils_1.verifyPassword)(password, admin.password);
            if (!isValid) {
                res.status(401).json({ error: "Credenciales Invalidas" });
                return;
            }
            const token = jsonwebtoken_1.default.sign({ username: admin.username, role: admin.role, name: admin.name }, process.env.JWT_SECRET, { expiresIn: "1h" });
            res.json({ token });
            return;
        }
        catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ error: "Error interno del servidor" });
            return;
        }
    }
    static async createPassword(req, res) {
        try {
            const devPassword = req.body.password;
            const hashedPassword = await (0, passwordUtils_2.hashPassword)(devPassword);
            console.log("=============================================");
            console.log("Development password hash:", hashedPassword);
            console.log("=============================================");
            res.status(200).json({
                message: "Check server logs for hashed password",
                hash: hashedPassword,
            });
        }
        catch (error) {
            console.error("Password hash error:", error);
            res.status(500).json({ error: "Failed to generate password hash" });
        }
    }
}
exports.AuthController = AuthController;
