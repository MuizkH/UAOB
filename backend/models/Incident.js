import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, unique: true }, // e.g. "INC-2026-001"
  title: { type: String, required: true },
  date: { type: Date, required: true },
  equipmentTag: { type: String, required: true }, // e.g. "P-101"
  severity: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
  description: { type: String, required: true },
  rootCause: { type: String },
  actionTaken: { type: String },
  lessonsLearned: { type: String },
  reportedBy: { type: String }
});

export default mongoose.model('Incident', incidentSchema);
