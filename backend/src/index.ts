import dotenv from "dotenv";
dotenv.config();

import express from "express";
import routes from "./routes";


const app = express();
const PORT = process.env.PORT || 5100;

// Middleware
app.use(express.json());

// Routes
app.use("/api", routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});