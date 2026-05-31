"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
// Validate and export
exports.config = {
    PORT: Number(process.env.PORT) || 5100,
    NODE_ENV: process.env.NODE_ENV || 'development',
    IS_PRODUCTION: (process.env.NODE_ENV === 'production'),
    JWT_SECRET: process.env.JWT_SECRET
};
