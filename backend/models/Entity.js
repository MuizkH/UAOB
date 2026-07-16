import mongoose from 'mongoose';

const entitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "Compressor P-101"
  type: { 
    type: String, 
    required: true,
    enum: ['Equipment', 'Procedure', 'Regulation', 'Location', 'System', 'Parameter'] 
  },
  properties: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
});

export default mongoose.model('Entity', entitySchema);
