import mongoose from 'mongoose';

const relationshipSchema = new mongoose.Schema({
  source: { type: String, required: true }, // Name of source entity
  target: { type: String, required: true }, // Name of target entity
  type: { type: String, required: true },   // e.g. 'governed_by', 'part_of', 'triggers', 'located_in'
  properties: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
});

// Compound index to prevent duplicate relationships
relationshipSchema.index({ source: 1, target: 1, type: 1 }, { unique: true });

export default mongoose.model('Relationship', relationshipSchema);
