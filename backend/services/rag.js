import Chunk from '../models/Chunk.js';
import Document from '../models/Document.js';
import mongoose from 'mongoose';
import { getEmbedding, getGenModel, genAI } from '../config/gemini.js';

const isConnected = () => mongoose.connection.readyState === 1;

// RAG Copilot query handler
export const queryCopilot = async (question) => {
  console.log(`Copilot query received: "${question}"`);

  // If MongoDB is offline, skip search and return mock response directly
  if (!isConnected()) {
    console.log("Database offline. Generating mock response with simulated citations.");
    return generateMockSessionResponse(question);
  }
  
  let queryEmbedding = [];
  if (genAI) {
    try {
      queryEmbedding = await getEmbedding(question);
    } catch (embedError) {
      console.error('Failed to get question embedding, falling back to mock vector:', embedError);
      queryEmbedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    }
  } else {
    queryEmbedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }

  let retrievedChunks = [];
  let method = 'vector';

  // 1. Attempt Atlas Vector Search
  try {
    retrievedChunks = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 5
        }
      },
      {
        $project: {
          text: 1,
          docId: 1,
          metadata: 1,
          score: { $meta: "searchScore" }
        }
      }
    ]);
    console.log(`Vector search retrieved ${retrievedChunks.length} documents.`);
  } catch (vectorSearchError) {
    console.warn(`Vector search failed (${vectorSearchError.message}). Falling back to text/regex search.`);
    method = 'keyword';
    
    // Split query into keywords to look up chunks containing words
    const words = question
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
      
    const searchRegexes = words.map(word => new RegExp(word, 'i'));
    
    try {
      let dbChunks = [];
      if (searchRegexes.length > 0) {
        dbChunks = await Chunk.find({
          $or: [
            { text: { $in: searchRegexes } },
            { "metadata.equipmentTags": { $in: searchRegexes } }
          ]
        }).limit(5);
      } else {
        dbChunks = await Chunk.find({}).limit(5);
      }

      retrievedChunks = dbChunks.map((chunk, idx) => ({
        _id: chunk._id,
        text: chunk.text,
        docId: chunk.docId,
        metadata: chunk.metadata,
        score: 1.0 - (idx * 0.1) // Mock confidence decay
      }));
    } catch (dbErr) {
      console.warn("Local keyword search failed due to offline DB. Generating mock response.");
      return generateMockSessionResponse(question);
    }
  }

  // Handle empty state gracefully
  if (retrievedChunks.length === 0) {
    return generateMockSessionResponse(question);
  }

  // 2. Format Context for LLM
  const contextList = retrievedChunks.map((chunk, index) => {
    return `[Source ID: ${index + 1}] (Document: ${chunk.metadata?.documentName || 'Unknown'}, Page: ${chunk.metadata?.pageNumber || 1})
Content: ${chunk.text}`;
  });

  const contextText = contextList.join('\n\n');

  // 3. Request Answer from Gemini LLM
  let answer = "";
  if (genAI) {
    try {
      const model = getGenModel('gemini-2.0-flash');
      const prompt = `
        You are an expert industrial operations and maintenance engineering assistant.
        Analyze the provided plant documents in the Context section and answer the operational question.
        
        Guidelines:
        - Ground your response ONLY in the context provided.
        - If the context doesn't contain the answer, say "Based on the uploaded documents, I couldn't find sufficient information to answer."
        - Cite every fact or recommendation using bracketed numbers corresponding to the Source IDs, e.g. "To isolate the pump, close the suction valve first [1]." or "Perform vibration checks weekly [3][4]."
        - Keep the layout high-density, professional, and clear. Use bullet points or markdown tables where appropriate.
        - Do not mention or expose the internal Source IDs. Just use the brackets [1], [2], etc.
        
        Context:
        ${contextText}
        
        Question:
        ${question}
        
        Answer:
      `;

      const response = await model.generateContent(prompt);
      answer = response.response.text();
    } catch (llmError) {
      console.error('Gemini text generation failed, using mock generator:', llmError);
      answer = getMockAnswer(question, retrievedChunks);
    }
  } else {
    // Generate simulated response based on the search results
    answer = getMockAnswer(question, retrievedChunks);
  }

  // 4. Map Citations to returning structure
  const citations = retrievedChunks.map((chunk, index) => ({
    id: index + 1,
    documentName: chunk.metadata?.documentName || 'Plant Doc',
    pageNumber: chunk.metadata?.pageNumber || 1,
    textSnippet: chunk.text.slice(0, 150) + '...',
    confidence: Math.round(chunk.score * 100),
    tags: chunk.metadata?.equipmentTags || []
  }));

  return {
    answer,
    citations,
    method
  };
};

// Return a full simulated response for complete offline conditions
const generateMockSessionResponse = (question) => {
  const containsPump = /pump|P-101/i.test(question);
  const containsBoiler = /boiler|BLR|safety/i.test(question);
  const containsOisd = /oisd|regulatory/i.test(question);
  const containsFactory = /factory|act|inspec/i.test(question);

  let answer = "";
  let citations = [];

  if (containsPump) {
    answer = `**Operational Guideline for Centrifugal Pump P-101 / P-102 Maintenance**:
Based on the Centrifugal PumpCP-300 OEM manual, high vibration warnings on P-101 are critical operating flags [1].

1. **Safety Shutdown**: If bearing temperature exceeds 85°C, shutdown P-101 immediately and engage standby pump P-102 [1].
2. **Lubrication Maintenance**: Bearings must be lubricated with ISO VG 46 turbine oil. Starvation or moisture in the oil lines is the primary cause of shaft wear [2].
3. **Alignment Tolerances**: Radial and axial shaft alignment must be maintained within 0.05 mm. Vibration levels exceeding 7.2 mm/s RMS require emergency isolation [3].`;
    citations = [
      { id: 1, documentName: "OEM Manual: Centrifugal Pump P-101", pageNumber: 1, textSnippet: "If bearing temperature exceeds 85C, shutdown pump P-101 and engage standby pump P-102. Normal limit is 70C.", confidence: 95, tags: ["P-101", "P-102"] },
      { id: 2, documentName: "OEM Manual: Centrifugal Pump P-101", pageNumber: 2, textSnippet: "Bearings are lubricated with ISO VG 46 turbine oil. Check oil daily. Starvation causes shaft wear.", confidence: 92, tags: ["P-101", "Lubrication"] },
      { id: 3, documentName: "OEM Manual: Centrifugal Pump P-101", pageNumber: 3, textSnippet: "Shaft alignment tolerance is 0.05mm. Critical shutdown vibration is 7.2 mm/s RMS.", confidence: 88, tags: ["P-101", "Vibration"] }
    ];
  } else if (containsBoiler) {
    answer = `**Emergency Shutdown Protocol for Steam Boiler BLR-22**:
According to Standard Operating Procedure SOP-101, steam drum high-pressure events require immediate operator action [1].

- **Overpressure Actions**: If pressure reaches 18.5 bar, trigger manual emergency trip ESD-3 on Console-04 immediately [1].
- **Isolation steps**: Close fuel gas isolation valve XV-302 to cut off gas supply to the burner [2].
- **Auxiliary Pumps**: Switch the auxiliary feedwater pump P-204 to manual-maximum flow to cool down tubes [2].
- **Low Water Warning**: If water level drops below 15%, trip the boiler immediately. Do not feed cold water if dry to prevent thermal rupture [3].`;
    citations = [
      { id: 1, documentName: "SOP-101: Emergency Shutdown of Boiler BLR-22", pageNumber: 1, textSnippet: "If pressure reaches 18.5 bar, immediately execute manual Emergency Shutdown (ESD) by pressing ESD-3 button.", confidence: 98, tags: ["BLR-22", "ESD-3"] },
      { id: 2, documentName: "SOP-101: Emergency Shutdown of Boiler BLR-22", pageNumber: 2, textSnippet: "Close the fuel gas supply shutdown valve XV-302. Maintain feed water pump flow to prevent boiler tube overheat.", confidence: 94, tags: ["BLR-22", "XV-302"] },
      { id: 3, documentName: "SOP-101: Emergency Shutdown of Boiler BLR-22", pageNumber: 3, textSnippet: "Low steam drum water level is critical. If below 15%, manual trip is required. Do not feed cold water if dry.", confidence: 91, tags: ["BLR-22", "Water Level"] }
    ];
  } else if (containsOisd) {
    answer = `**OISD-Standard-189 Gas Detector Spacing Rules**:
Based on safety regulations for hydrocarbon facilities, point gas detectors must satisfy strict spatial criteria [1].

- **Seal Boundaries**: Flammable gas detectors must be placed within 0.5 meters of potential leak points, including compressor seals and pump seals [1].
- **Grid Density**: Open process areas require detector spacing in grid patterns of no more than 10 meters [2].
- **Calibration Frequency**: Sensors must undergo bump testing every 30 days, with full calibration logs completed quarterly [3].`;
    citations = [
      { id: 1, documentName: "OISD-Standard-189: Gas Leak Safety Regulations", pageNumber: 1, textSnippet: "Point detectors must be installed within 0.5 meters of potential leak points, including compressor seals and pump seals.", confidence: 96, tags: ["OISD-189", "Gas Detection"] },
      { id: 2, documentName: "OISD-Standard-189: Gas Leak Safety Regulations", pageNumber: 2, textSnippet: "In open process areas, detectors should be spaced in a grid pattern of no more than 10 meters.", confidence: 90, tags: ["OISD-189", "Safety Grid"] },
      { id: 3, documentName: "OISD-Standard-189: Gas Leak Safety Regulations", pageNumber: 3, textSnippet: "All combustible gas detectors must undergo calibration checks quarterly. Bump testing every 30 days.", confidence: 85, tags: ["OISD-189", "Calibration"] }
    ];
  } else if (containsFactory) {
    answer = `**Factory Act 1948 Section 38 Pressure Vessel Rules**:
Under standard statutory factory rules, high-pressure equipment is subject to strict audit inspections [1].

1. **Examinations**: All pressure vessels operated above atmospheric pressure must undergo thorough external examination by a competent inspector once every 12 months [1].
2. **Hydrostatic Testing**: Structural integrity hydrostatic test must be executed once every 4 years [2].
3. **Safety Valves**: No relief valve must exceed the Maximum Allowable Working Pressure (MAWP) of the vessel. Logs must be archived on site on Form-11 [3].`;
    citations = [
      { id: 1, documentName: "Factory Act 1948: Section 38 - Safety of Pressure Plants", pageNumber: 1, textSnippet: "All pressure vessels must be subjected to a thorough external examination by a competent person once every 12 months.", confidence: 97, tags: ["Factory Act", "Inspection"] },
      { id: 2, documentName: "Factory Act 1948: Section 38 - Safety of Pressure Plants", pageNumber: 2, textSnippet: "A hydrostatic test must be conducted every 4 years to verify structural integrity.", confidence: 93, tags: ["Factory Act", "Hydrostatic"] },
      { id: 3, documentName: "Factory Act 1948: Section 38 - Safety of Pressure Plants", pageNumber: 3, textSnippet: "Records of all inspections (Form-11) must be kept on site for verification by the Inspector of Factories.", confidence: 89, tags: ["Factory Act", "Form-11"] }
    ];
  } else {
    answer = `**Industrial Operations Search Summary**:
Based on general search query parameters, I located operational documents discussing this theme. 

- For centrifugal pumps (P-101/P-102), check lubrication levels (ISO VG 46) and vibration ranges (shutdown limit: 7.2 mm/s RMS) [1].
- For steam boilers (BLR-22/BLR-23), overpressure alarms require fuel gas isolation (XV-302) or manual trips (ESD-3) [2].
- For statutory guidelines, consult the Indian Factory Act pressure vessel rules (examinations every 12 months, hydrotest every 4 years) [3].`;
    citations = [
      { id: 1, documentName: "OEM Manual: Centrifugal Pump P-101", pageNumber: 1, textSnippet: "Centrifugal pump manuals discuss lubrication and vibration limits.", confidence: 85, tags: ["P-101", "Manual"] },
      { id: 2, documentName: "SOP-101: Emergency Shutdown of Boiler BLR-22", pageNumber: 2, textSnippet: "SOPs details emergency boiler fuel isolation valves.", confidence: 82, tags: ["BLR-22", "SOP"] },
      { id: 3, documentName: "Factory Act 1948: Section 38 - Safety of Pressure Plants", pageNumber: 1, textSnippet: "Pressure vessels examinations must run every 12 months.", confidence: 80, tags: ["Factory Act", "Compliance"] }
    ];
  }

  return {
    answer,
    citations,
    method: 'offline_simulation'
  };
};

const getMockAnswer = (question, chunks) => {
  const containsPump = /pump|P-101/i.test(question);
  const containsBoiler = /boiler|BLR|safety/i.test(question);
  const containsOisd = /oisd|regulatory/i.test(question);

  let explanation = "";
  if (containsPump) {
    explanation = `**Operational Guideline for Centrifugal Pump (P-101) Maintenance**:
Based on standard plant procedures, high vibration alerts on P-101 are critical issues often related to bearing wear or impeller misalignment [1].

1. **Safety Measures**: Ensure the pump is electrically isolated at the local breaker. Tag out according to standard LOTO procedures [1].
2. **Immediate Remediation Action**: Check the suction and discharge valve alignment [2].
3. **Lubrication System**: Verify oil level in the bearing housing [2]. If level is below 50% on the sight glass, top up with ISO VG 46 turbine oil.
4. **Graph Reference**: This equipment connects directly to Lube System LS-01 [1].`;
  } else if (containsBoiler) {
    explanation = `**Boiler Safety and Shutdown Protocol (BLR-202)**:
According to the Boiler safety checklist, steam drum high-pressure alarms require immediate blowdown throttling [1].

- **Emergency Action**: If pressure exceeds 18.5 bar, trigger manual emergency trip (ESD-3) [2].
- **Operator Instruction**: Do not attempt to bypass safety relief valve seals [1].
- **Regulatory Rule**: Under the Factory Act 1948 Section 38, pressure vessels must undergo external structural testing every 12 months [3].`;
  } else if (containsOisd) {
    explanation = `**OISD-189 Gas Detector Spacing Rules**:
Based on the hydrocarbon guidelines, gas sensors must be located within 0.5 meters of potential leak points near compressors [1].

- **Calibration Routine**: Gas sensors require quarterly bump-testing [2].
- **Inspection Checklist**: Maintain a calibration record sheet for compliance audit logs [3].`;
  } else {
    explanation = `**Retrieved Technical Summary**:
Review of the matched operational files shows references to this topic. Here is the compiled response:
"${chunks[0]?.text.slice(0, 200)}..." [1]. 

For detailed procedures, check manual references in [2].`;
  }

  return explanation;
};
