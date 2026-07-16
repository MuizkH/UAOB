import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
  docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  text: { type: String, required: true },
  chunkIndex: { type: Number, required: true },
  embedding: { type: [Number], required: true }, // 768-dimension vector
  metadata: {
    pageNumber: { type: Number, default: 1 },
    equipmentTags: [{ type: String }],
    documentName: { type: String }
  }
});

// Note: An Atlas Vector Search index 'vector_index' should be configured on this collection
export default mongoose.model('Chunk', chunkSchema);
