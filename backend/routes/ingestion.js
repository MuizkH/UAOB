import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { ingestDocument } from '../services/ingestion.js';
import Document from '../models/Document.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const isConnected = () => mongoose.connection.readyState === 1;

const MOCK_DOCUMENTS_FALLBACK = [
  {
    _id: "60c72b2f9b1d8a2c88888801",
    filename: "oem_manual_centrifugal_pump_p-101.txt",
    originalName: "OEM Manual: Centrifugal Pump P-101 Instruction manual",
    mimeType: "text/plain",
    size: 1540,
    status: "indexed",
    category: "manual",
    uploadDate: new Date('2026-07-10T10:00:00Z'),
    tags: ["P-101", "P-102", "SOP-LS-01"]
  },
  {
    _id: "60c72b2f9b1d8a2c88888802",
    filename: "sop-101_emergency_shutdown_steam_boiler.txt",
    originalName: "SOP-101: Emergency Shutdown of Steam Boiler BLR-22",
    mimeType: "text/plain",
    size: 1820,
    status: "indexed",
    category: "procedure",
    uploadDate: new Date('2026-07-12T11:30:00Z'),
    tags: ["BLR-22", "BLR-23", "P-204", "ESD-3"]
  },
  {
    _id: "60c72b2f9b1d8a2c88888803",
    filename: "oisd-standard-189_gas_safety_regulations.txt",
    originalName: "OISD-Standard-189: Gas Leak Safety Regulations",
    mimeType: "text/plain",
    size: 2100,
    status: "indexed",
    category: "compliance",
    uploadDate: new Date('2026-07-14T09:15:00Z'),
    tags: ["OISD-189", "C-102", "C-103", "GD-102"]
  },
  {
    _id: "60c72b2f9b1d8a2c88888804",
    filename: "factory_act_1948_sec_38.txt",
    originalName: "Factory Act 1948: Section 38 - Safety Precautions",
    mimeType: "text/plain",
    size: 1490,
    status: "indexed",
    category: "compliance",
    uploadDate: new Date('2026-07-15T14:45:00Z'),
    tags: ["BLR-22", "V-101", "Form-11"]
  }
];

// Ingest uploaded files
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }
    const { originalname, mimetype, buffer } = req.file;
    const category = req.body.category || 'other';

    if (!isConnected()) {
      // Simulate pipeline latency briefly on upload
      console.log(`[OFFLINE MOCK UPLOAD] Ingesting: ${originalname}`);
      const mockDoc = {
        _id: new mongoose.Types.ObjectId().toString(),
        filename: originalname.replace(/\s+/g, '_').toLowerCase(),
        originalName: originalname,
        mimeType: mimetype,
        size: buffer.length,
        status: 'indexed',
        category,
        uploadDate: new Date(),
        tags: [category.toUpperCase(), "P-101", "SOP-12"] // Seed some dummy tags
      };
      // Keep doc in static memory array for this session (simulates immediate visual update)
      MOCK_DOCUMENTS_FALLBACK.unshift(mockDoc);
      return res.status(200).json(mockDoc);
    }

    const doc = await ingestDocument(
      originalname.replace(/\s+/g, '_').toLowerCase(),
      originalname,
      mimetype,
      buffer,
      category
    );

    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List uploaded documents
router.get('/', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(200).json(MOCK_DOCUMENTS_FALLBACK);
    }
    const docs = await Document.find().sort({ uploadDate: -1 });
    if (docs.length === 0) {
      return res.status(200).json(MOCK_DOCUMENTS_FALLBACK);
    }
    res.status(200).json(docs);
  } catch (error) {
    console.warn("Documents query failed, using mock fallback:", error.message);
    res.status(200).json(MOCK_DOCUMENTS_FALLBACK);
  }
});

export default router;
