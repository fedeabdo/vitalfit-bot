import express from "express";
import cors from "cors";
import dataRoutes from './routes';

import { config } from './config/env';

const app = express();

app.use(express.json())
app.use(cors())

const PORT = config.PORT || 3000;

app.use('/data', express.static('src/data'));

// API routes
app.use('/api', dataRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});