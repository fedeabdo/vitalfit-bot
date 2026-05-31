"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
dotenv.config();
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
const cors_1 = __importDefault(require("cors"));
console.log("📦 Importing express app...");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5100;
// Configure CORS
const corsOptions = {
    origin: ['http://localhost:5173',
        'http://5.161.43.130:5173',
        'http://static.130.43.161.5.clients.your-server.de:5173',
        'https://www.vitalfit.uy',
        'https://vitalfit.uy',
        'https://www.vitalfit.uy',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use((0, cors_1.default)(corsOptions));
// Middleware
app.use(express_1.default.json());
// Routes
app.use("/api", routes_1.default);
app.options('*', (0, cors_1.default)(corsOptions));
console.log("🌐 About to start server...");
// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
