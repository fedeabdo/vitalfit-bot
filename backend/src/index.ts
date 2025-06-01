import dotenv from "dotenv";
dotenv.config();

import express from "express";
import routes from "./routes";
import cors from 'cors';


const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5100;

// Configure CORS
const corsOptions = {
  origin: ['http://localhost:5173',
    'http://5.161.43.130:5173',
    'http://static.130.43.161.5.clients.your-server.de:5173'
  ],
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

