import express from 'express';
import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import { getGenModel, genAI } from '../config/gemini.js';

const router = express.Router();

const MOCK_INCIDENTS_FALLBACK = [
  {
    incidentId: "INC-2024-001",
    title: "Bearing failure on Main Lube Oil Pump P-101",
    date: new Date('2024-02-10'),
    equipmentTag: "P-101",
    severity: "High",
    description: "During morning shift walkdown, high squealing sound heard from P-101 bearing housing. Temperature checked at 94°C. Operators immediately shut down P-101 and lined up standby pump P-102. Vibration analysis confirmed bearing damage.",
    rootCause: "Lubricant starvation in bearing chamber due to blockage in the primary oil feed nozzle. Dust contamination clogged the flow orifice.",
    actionTaken: "Replaced defective inboard bearing. Cleaned the oil nozzle. Flushed the lube oil lines and replaced the lubricant with fresh ISO VG 46 turbine oil.",
    lessonsLearned: "Clogged lubrication lines caused dry running and bearing wear. Regular strainer cleaning and oil contamination tests should be conducted quarterly. Ensure the bearing housing breather cap has a clean filter.",
    reportedBy: "S. K. Verma (Shift Engineer)"
  },
  {
    incidentId: "INC-2024-002",
    title: "Coupling shaft misalignment damage on Standby Pump P-102",
    date: new Date('2024-08-22'),
    equipmentTag: "P-102",
    severity: "Medium",
    description: "Standby pump P-102 vibration level spiked to 8.5 mm/s RMS shortly after starting during routine rotation test. Unit tripped on high vibration. Mechanical inspection showed coupling element cracked.",
    rootCause: "Thermal growth of the motor casing during prolonged shutdown was not accounted for during cold alignment, causing angular misalignment.",
    actionTaken: "Replaced coupling element. Performed hot alignment checks and shimmed motor base to meet radial limit of 0.03 mm.",
    lessonsLearned: "Rotor-to-stator shaft alignment must undergo dynamic checks after equipment achieves thermal stabilization. Cold alignment is insufficient for high-speed standby pumps.",
    reportedBy: "Amit Patel (Maintenance Lead)"
  },
  {
    incidentId: "INC-2025-001",
    title: "Seal failure on Pump P-101 due to dry running",
    date: new Date('2025-01-15'),
    equipmentTag: "P-101",
    severity: "High",
    description: "Hydrocarbon gas leak detector FGS-02 triggered high alarm in Lube Oil skid area. Field operators confirmed liquid drip from pump shaft and black soot. Pump isolated immediately.",
    rootCause: "Pump ran dry due to operator bypassing safety low-level interlock during oil tank drainage. Dry running led to overheat of mechanical seal faces.",
    actionTaken: "Replaced mechanical seal cartridge. Restored safety interlocks. Conducted team toolbox talk on danger of bypassing safety limits.",
    lessonsLearned: "Safety interlocks must not be bypassed under any operating condition without plant manager approval. Dry running destroys mechanical seal faces in less than 3 minutes.",
    reportedBy: "Vikram Sen (Safety Specialist)"
  },
  {
    incidentId: "INC-2025-002",
    title: "Discharge valve failure on Reciprocating Compressor C-102",
    date: new Date('2024-09-02'),
    equipmentTag: "C-102",
    severity: "Critical",
    description: "First-stage discharge temperature on Cylinder-2 spiked to 128°C, exceeding safety limit of 120°C. Unit tripped automatically. Compressor isolated for internal inspect.",
    rootCause: "Cracked valve plate. Small metal fragments chipped off from the valve spring, getting caught between the plate and the seat.",
    actionTaken: "Replaced discharge valve assembly on Cylinder-2. Checked other cylinder valves for cracking. Re-started system.",
    lessonsLearned: "Reciprocating compressor valves are highly critical parts. Implement a preventative maintenance replacement policy for discharge valve springs every 8000 operating hours.",
    reportedBy: "M. D. Joseph (Mechanical Specialist)"
  },
  {
    incidentId: "INC-2025-003",
    title: "High bearing wear and vibration on Compressor C-102",
    date: new Date('2023-05-14'),
    equipmentTag: "C-102",
    severity: "High",
    description: "Main crankshaft bearings showed progressive temperature climb over 2 weeks, reaching 88°C. Vibration analysis on the compressor frame showed high horizontal vibration at 1x RPM.",
    rootCause: "Blocked lubrication strainer magnet. High concentration of ferrous particles blocked the oil flow, causing oil film breakdown and shaft wear.",
    actionTaken: "Polished crankshaft journals. Replaced main bearings. Cleaned magnetic strainer. Flushed compressor crankcase and replaced oil.",
    lessonsLearned: "Strainer magnet checking must be added to the weekly preventive checklist. Ferrous particle buildup is a clear indicator of upstream wear in the oil pump gear teeth.",
    reportedBy: "Amit Patel (Maintenance Lead)"
  },
  {
    incidentId: "INC-2025-004",
    title: "Boiler BLR-22 relief valve leak",
    date: new Date('2024-11-05'),
    equipmentTag: "BLR-22",
    severity: "High",
    description: "Hissing noise heard near steam header piping. Inspection showed steam leakage from boiler safety relief valve (SRV-201) discharge pipe at operating pressure of 14.5 bar (set pressure is 18.2 bar).",
    rootCause: "Spring relaxation and nozzle seat deposition preventing clean closure of relief valve disc.",
    actionTaken: "Boiler load reduced. Isolated relief valve for recalibration at vendor shop. Re-lapped seat, replaced spring, and re-tested set point.",
    lessonsLearned: "Safety relief valves in steam loops should undergo steam blasting/cleaning monthly to prevent hard carbonate deposition on seats.",
    reportedBy: "Rajesh Joshi (Boiler Operations)"
  },
  {
    incidentId: "INC-2026-001",
    title: "ESD valve solenoid failure on XV-302",
    date: new Date('2025-07-02'),
    equipmentTag: "ESD-01",
    severity: "High",
    description: "During quarterly emergency shut-down test, the fuel supply isolation valve XV-302 failed to close. Emergency trip initiated from control console but solenoid valve did not exhaust.",
    rootCause: "Moisture ingress in the solenoid junction box caused short circuit in the coil, burning out the coil assembly.",
    actionTaken: "Replaced solenoid assembly. Sealed the junction box with silicone gel and weather-proof conduit packing.",
    lessonsLearned: "All safety-critical solenoids and instrumentation outdoors must be IP67 rated and undergo double isolation checks for moisture during monsoon season.",
    reportedBy: "Vikram Sen (Safety Specialist)"
  },
  {
    incidentId: "INC-2026-002",
    title: "Lube oil seal leak on Compressor C-103",
    date: new Date('2025-02-18'),
    equipmentTag: "C-103",
    severity: "High",
    description: "Crankshaft oil seal showed major leakage of 12 liters/day. Sump oil level dropped below 30%. Operator shut down compressor C-103 and loaded standby C-102.",
    rootCause: "Lube oil pressure regulator malfunctioned, boosting system pressure to 5.2 bar (max design 4.0 bar). Excess pressure blew out the lip seal.",
    actionTaken: "Replaced oil seal. Serviced the oil pressure regulator valve and replaced its diaphragm. Restored oil level.",
    lessonsLearned: "Ensure pressure transmitters on lubrication lines trigger alarms at 4.2 bar. Solenoids or relief valves should open to bypass extra pressure to the sump.",
    reportedBy: "Amit Patel (Maintenance Lead)"
  },
  {
    incidentId: "INC-2026-003",
    title: "Hydrogen Gas Detector False Alarm on FGS-02",
    date: new Date('2026-01-10'),
    equipmentTag: "FGS-02",
    severity: "Medium",
    description: "Control room received 20% LEL gas alarm in Compressor bay. Safety teams dispatched to site. Field checks with portable detectors showed 0% gas level. GD-102 sensor was faulty.",
    rootCause: "Sensor element poison due to nearby painting operations. Paint solvent vapors reacted with the catalytic bead.",
    actionTaken: "Replaced detector sensor element. Calibrated GD-102. Issued safety note to cover sensors during painting.",
    lessonsLearned: "Catalytic gas sensors must be protected or bypassed when paint solvent spraying is conducted within 10 meters of the device.",
    reportedBy: "S. K. Verma (Shift Engineer)"
  }
];

const isConnected = () => mongoose.connection.readyState === 1;

// Get all incidents
router.get('/', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(200).json(MOCK_INCIDENTS_FALLBACK);
    }
    const list = await Incident.find().sort({ date: -1 });
    if (list.length === 0) {
      return res.status(200).json(MOCK_INCIDENTS_FALLBACK);
    }
    res.status(200).json(list);
  } catch (error) {
    console.warn("Incidents database query failed, using mock fallback:", error.message);
    res.status(200).json(MOCK_INCIDENTS_FALLBACK);
  }
});

// Analyze recurring failure patterns (Lessons Learned)
router.get('/patterns', async (req, res) => {
  try {
    let incidents = [];
    if (isConnected()) {
      incidents = await Incident.find();
    }
    
    if (incidents.length === 0) {
      incidents = MOCK_INCIDENTS_FALLBACK;
    }

    if (genAI) {
      try {
        const model = getGenModel('gemini-2.0-flash');
        const prompt = `
          Analyze the following list of plant incident reports.
          Group them into 2 or 3 "Recurring Failure Patterns" where multiple equipment tags show similar failure modes (e.g. lube oil degradation, seal leaks, sensor faults).

          Incidents List:
          ${JSON.stringify(incidents.map(inc => ({
            id: inc.incidentId,
            title: inc.title,
            tag: inc.equipmentTag,
            desc: inc.description,
            cause: inc.rootCause,
            lessons: inc.lessonsLearned
          })))}

          Provide your analysis strictly in JSON format as a list of patterns:
          [
            {
              "patternId": "PAT-001",
              "title": "Recurring Lubrication & Seal Failures",
              "affectedAssets": ["P-101", "P-102", "C-102"],
              "confidence": 95,
              "incidentCount": 3,
              "patternSummary": "Analysis of root causes reveals lube oil degradation and starvation are triggering shaft wear and mechanical seal seal blowouts.",
              "remediation": "Mandate bi-weekly lube oil level checks and implement dynamic vibration sensors.",
              "relatedIncidents": ["INC-2024-001", "INC-2025-001", "INC-2025-003"]
            }
          ]
        `;

        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });

        const patterns = JSON.parse(response.response.text());
        return res.status(200).json(patterns);
      } catch (err) {
        console.error('LLM Incident pattern analysis failed, using fallback:', err);
        return res.status(200).json(getHeuristicPatterns(incidents));
      }
    } else {
      return res.status(200).json(getHeuristicPatterns(incidents));
    }
  } catch (error) {
    res.status(5500).json({ error: error.message });
  }
});

// Heuristics clustering fallback
const getHeuristicPatterns = (incidents) => {
  const patterns = [];
  
  // Group 1: Lubrication & Seal Failures
  const lubeRelated = incidents.filter(inc => 
    /lube|oil|seal|bearing/i.test(inc.description) || 
    /lube|oil|seal|bearing/i.test(inc.rootCause)
  );

  if (lubeRelated.length >= 2) {
    patterns.push({
      patternId: "PAT-LUBE-01",
      title: "Recurring Shaft Lubrication & Seal Failures",
      affectedAssets: [...new Set(lubeRelated.map(i => i.equipmentTag))],
      confidence: 88,
      incidentCount: lubeRelated.length,
      patternSummary: "Algorithmic analysis flags multiple incidents relating to lubricant starvation, bearing high temperature, and dry-running seal blowouts. Shaft tolerances and lubricating lines are critical vectors.",
      remediation: "Verify lube oil filter replacement records. Enforce safety lockouts blocking bypasses on low tank level indicators.",
      relatedIncidents: lubeRelated.map(i => i.incidentId)
    });
  }

  // Group 2: Sensor drift / instrumentation faults
  const sensorRelated = incidents.filter(inc =>
    /sensor|detector|drift|switch|alarm/i.test(inc.description) ||
    /sensor|detector|drift|switch|alarm/i.test(inc.rootCause)
  );

  if (sensorRelated.length >= 2) {
    patterns.push({
      patternId: "PAT-SENS-02",
      title: "Control System & Sensor Calibration Drift",
      affectedAssets: [...new Set(sensorRelated.map(i => i.equipmentTag))],
      confidence: 82,
      incidentCount: sensorRelated.length,
      patternSummary: "Instrumentation failure pattern identified. Multiple alarms triggered by sensor drifts, moisture in junction conduits, or particulate poisoning on sensor beads.",
      remediation: "Reschedule gas detector bump tests to 30-day intervals. Deploy weatherproof IP67 hoods on outdoor transmitter housing.",
      relatedIncidents: sensorRelated.map(i => i.incidentId)
    });
  }

  // Group 3: Pressure / Steam containment leaks
  const pressureRelated = incidents.filter(inc =>
    /steam|boiler|relief|pressure|leak/i.test(inc.description)
  );

  if (pressureRelated.length >= 2) {
    patterns.push({
      patternId: "PAT-PRES-03",
      title: "Steam Flange & Pressure Relief Valve Degradation",
      affectedAssets: [...new Set(pressureRelated.map(i => i.equipmentTag))],
      confidence: 76,
      incidentCount: pressureRelated.length,
      patternSummary: "Steam loop integrity alert. Reports indicate repeating thermal leakage on flange seals and early safety relief valve spring relaxation.",
      remediation: "Integrate carbon deposit blowout sweeps in boiler checklist routines. Perform statutory hydrostatic pressure examinations.",
      relatedIncidents: pressureRelated.map(i => i.incidentId)
    });
  }

  return patterns;
};

export default router;
