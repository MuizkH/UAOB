import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import Entity from '../models/Entity.js';
import Relationship from '../models/Relationship.js';
import { getEmbedding, getGenModel, genAI } from '../config/gemini.js';

// Text extraction based on file type
export const extractTextFromBuffer = async (buffer, mimeType) => {
  if (mimeType === 'application/pdf') {
    const data = await pdf(buffer);
    return { text: data.text, pageCount: data.numpages || 1 };
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
    mimeType === 'application/msword'
  ) {
    const data = await mammoth.extractRawText({ buffer });
    return { text: data.value, pageCount: 1 };
  } else if (mimeType.startsWith('image/')) {
    // OCR using tesseract.js
    const result = await Tesseract.recognize(buffer, 'eng');
    return { text: result.data.text, pageCount: 1 };
  } else {
    // Fallback to text string
    return { text: buffer.toString('utf-8'), pageCount: 1 };
  }
};

// Chunk text into overlapping segments
export const chunkText = (text, size = 800, overlap = 150) => {
  const chunks = [];
  let index = 0;
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  while (index < cleanedText.length) {
    const chunk = cleanedText.slice(index, index + size);
    chunks.push(chunk);
    index += size - overlap;
  }
  return chunks;
};

// Helper to extract entities from chunk text using Gemini
export const extractEntitiesAndRelationships = async (text) => {
  if (!genAI) {
    // Mock extraction if no API key is set
    return getMockEntities(text);
  }

  try {
    const model = getGenModel('gemini-2.0-flash');
    const prompt = `
      You are an expert AI system for industrial knowledge graph operations.
      Analyze the following text chunk and extract:
      1. Equipment or components (e.g. Pump, Valve, P-101, V-102, Compressor).
      2. Regulatory clauses, standards, or procedures (e.g. OISD-189, Factory Act, SOP-22).
      3. Operational systems or environments (e.g. Lube Oil System, Steam Loop, Utility Yard).
      
      For each extracted entity, define:
      - name: Identifier or Tag (capitalize tags, e.g. "P-101")
      - type: Must be one of ['Equipment', 'Procedure', 'Regulation', 'Location', 'System', 'Parameter']
      - description: Brief description of its context
      
      Also, extract relationships between these entities. Relationships should connect two entities.
      For each relationship, define:
      - source: The name of the source entity
      - target: The name of the target entity
      - type: Must be a simple lowercase connection type (e.g., 'governs', 'part_of', 'references', 'triggers', 'installed_in')
      
      Return the output as a valid JSON object matching this schema:
      {
        "entities": [
          { "name": "P-101", "type": "Equipment", "properties": { "description": "Centrifugal pump" } }
        ],
        "relationships": [
          { "source": "P-101", "target": "SOP-12", "type": "governed_by" }
        ]
      }

      Document Text:
      "${text}"
    `;

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text }] }],
      systemInstruction: "You extract technical structures. Return JSON ONLY.",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const parsed = JSON.parse(response.response.text());
    return parsed;
  } catch (error) {
    console.error('Gemini entity extraction failed, using fallback:', error);
    return getMockEntities(text);
  }
};

// Helper for local OCR & Mock extraction fallbacks
const getMockEntities = (text) => {
  const entities = [];
  const relationships = [];
  
  // Extract tags like P-101, V-102, C-201, T-501 using regex
  const tagRegex = /\b([PVCTBDG]|BLR|COMP)-\d{3,4}\b/g;
  const matches = [...new Set(text.match(tagRegex))];
  
  matches.forEach(tag => {
    entities.push({
      name: tag,
      type: 'Equipment',
      properties: { description: `Industrial asset matching tag ${tag}` }
    });
  });

  // Extract regulations
  if (text.includes('OISD')) {
    entities.push({ name: 'OISD Standards', type: 'Regulation', properties: { description: 'Oil Industry Safety Directorate guidelines' } });
  }
  if (text.includes('Factory Act')) {
    entities.push({ name: 'Factory Act 1948', type: 'Regulation', properties: { description: 'Indian workplace safety compliance act' } });
  }

  // Generate simple relationships if we found entities
  if (matches.length > 0) {
    if (text.includes('OISD')) {
      matches.forEach(tag => {
        relationships.push({ source: tag, target: 'OISD Standards', type: 'governed_by' });
      });
    }
  }

  return { entities, relationships };
};

// Main document ingestion execution flow
export const ingestDocument = async (filename, originalName, mimeType, buffer, category = 'other') => {
  console.log(`Starting ingestion pipeline for file: ${originalName} (${mimeType})`);
  
  // 1. Create Document log in database
  const doc = new Document({
    filename,
    originalName,
    mimeType,
    size: buffer.length,
    status: 'parsing',
    category
  });
  await doc.save();

  try {
    // 2. Extract Text
    const { text, pageCount } = await extractTextFromBuffer(buffer, mimeType);
    doc.status = 'embedding';
    await doc.save();

    // 3. Chunk text
    const textChunks = chunkText(text);
    console.log(`Extracted text. Segmented into ${textChunks.length} chunks.`);

    const chunkRecords = [];
    const allTags = new Set();

    // 4. Generate Embeddings & Extract entities for each chunk
    for (let i = 0; i < textChunks.length; i++) {
      const chunkTextStr = textChunks[i];
      let embeddingVector = [];

      if (genAI) {
        try {
          embeddingVector = await getEmbedding(chunkTextStr);
        } catch (embedError) {
          console.error(`Embedding generation failed for chunk ${i}, generating mock vector:`, embedError);
          // generate pseudo random 768 float array
          embeddingVector = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
        }
      } else {
        // Mock vector for local offline debugging
        embeddingVector = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
      }

      // Extract entities per chunk
      const graphData = await extractEntitiesAndRelationships(chunkTextStr);
      const chunkTags = graphData.entities
        .filter(e => e.type === 'Equipment')
        .map(e => e.name);

      chunkTags.forEach(tag => allTags.add(tag));

      // Save entities & relationships to graph
      for (const ent of graphData.entities) {
        await Entity.findOneAndUpdate(
          { name: ent.name },
          { name: ent.name, type: ent.type, properties: ent.properties },
          { upsert: true, new: true }
        );
      }

      for (const rel of graphData.relationships) {
        try {
          await Relationship.findOneAndUpdate(
            { source: rel.source, target: rel.target, type: rel.type },
            { source: rel.source, target: rel.target, type: rel.type, properties: rel.properties || {} },
            { upsert: true, new: true }
          );
        } catch (relErr) {
          // Ignore unique index collision warnings
        }
      }

      // Save Chunk record to batch array
      chunkRecords.push({
        docId: doc._id,
        text: chunkTextStr,
        chunkIndex: i,
        embedding: embeddingVector,
        metadata: {
          pageNumber: Math.min(Math.floor(i / 2) + 1, pageCount),
          equipmentTags: chunkTags,
          documentName: originalName
        }
      });
    }

    // Save all chunks in bulk
    await Chunk.insertMany(chunkRecords);

    // 5. Update doc status to indexed
    doc.status = 'indexed';
    doc.tags = Array.from(allTags);
    await doc.save();
    console.log(`Successfully completed ingestion for ${originalName}`);
    return doc;
  } catch (error) {
    console.error(`Ingestion pipeline failed for ${originalName}:`, error);
    doc.status = 'failed';
    doc.errorMessage = error.message;
    await doc.save();
    throw error;
  }
};
