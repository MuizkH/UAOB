import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY is not defined. AI functionality will be mock-only until provided.');
}

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Helper to get embedding for text chunk
export const getEmbedding = async (text) => {
  if (!genAI) {
    throw new Error('Gemini API client not initialized. Check GEMINI_API_KEY.');
  }
  
  // Use text-embedding-004
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
};

// Helper for general generation model
export const getGenModel = (modelName = 'gemini-2.0-flash') => {
  if (!genAI) {
    throw new Error('Gemini API client not initialized. Check GEMINI_API_KEY.');
  }
  return genAI.getGenerativeModel({ model: modelName });
};
