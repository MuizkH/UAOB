import express from 'express';
import { queryCopilot } from '../services/rag.js';

const router = express.Router();

// Query the Copilot (RAG)
router.post('/', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question parameter is required.' });
    }

    const response = await queryCopilot(question);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
