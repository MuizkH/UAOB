import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  status: { type: String, enum: ['parsing', 'embedding', 'indexed', 'failed'], default: 'parsing' },
  errorMessage: { type: String },
  uploadDate: { type: Date, default: Date.now },
  tags: [{ type: String }], // extracted keywords, systems, or equipment tags
  category: { type: String, enum: ['manual', 'procedure', 'incident', 'compliance', 'other'], default: 'other' }
});

export default mongoose.model('Document', documentSchema);
