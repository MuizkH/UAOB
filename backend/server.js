import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';

// Import routes
import ingestionRouter from './routes/ingestion.js';
import queryRouter from './routes/query.js';
import assetsRouter from './routes/assets.js';
import complianceRouter from './routes/compliance.js';
import incidentsRouter from './routes/incidents.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/ingest', ingestionRouter);
app.use('/api/query', queryRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/incidents', incidentsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'online', 
    database: mongoose.connection?.readyState === 1 ? 'connected' : 'disconnected',
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing_api_key'
  });
});

// Start Server & Connect Database
const startServer = async () => {
  // Connect to database
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Unified Operations Brain Server is running on port ${PORT}`);
  });
};

startServer();
