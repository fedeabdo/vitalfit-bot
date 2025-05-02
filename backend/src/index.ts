import dotenv from "dotenv";
dotenv.config();

import express from "express";
import routes from "./routes";
import cors from 'cors';


const app = express();
const PORT = process.env.PORT || 5100;

// Configure CORS
const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// Routes
app.use("/api", routes);

app.options('*', cors(corsOptions));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});