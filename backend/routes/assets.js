import express from 'express';
import mongoose from 'mongoose';
import Equipment from '../models/Equipment.js';
import Incident from '../models/Incident.js';
import { getGenModel, genAI } from '../config/gemini.js';

const router = express.Router();

const MOCK_EQUIPMENT_FALLBACK = [
  {
    tag: "P-101",
    name: "Main Lube Oil Pump A",
    system: "Lube Oil System",
    criticality: "High",
    installDate: new Date('2020-04-12'),
    status: "Running",
    failureHistory: [
      { date: new Date('2024-02-10'), description: "Bearing high vibration due to lubricant starvation", downtimeHours: 12, category: "Mechanical" },
      { date: new Date('2025-01-15'), description: "Mechanical seal leak due to dry running", downtimeHours: 8, category: "Mechanical" }
    ],
    workOrders: [
      { orderId: "WO-9912", date: new Date('2026-06-12'), description: "Quarterly vibration analysis and grease top-up", status: "Completed" }
    ],
    oemManualRef: "OEM CP-300 Centrifugal Pump Manual, Section 2 (Lubrication Requirements)"
  },
  {
    tag: "P-102",
    name: "Main Lube Oil Pump B (Standby)",
    system: "Lube Oil System",
    criticality: "High",
    installDate: new Date('2020-04-12'),
    status: "Standby",
    failureHistory: [
      { date: new Date('2024-08-22'), description: "Shaft misalignment and coupling wear", downtimeHours: 6, category: "Mechanical" }
    ],
    workOrders: [],
    oemManualRef: "OEM CP-300 Centrifugal Pump Manual, Section 3 (Alignment)"
  },
  {
    tag: "P-204",
    name: "Auxiliary Boiler Feedwater Pump",
    system: "Steam Loop System",
    criticality: "High",
    installDate: new Date('2019-11-05'),
    status: "Running",
    failureHistory: [
      { date: new Date('2023-11-30'), description: "Motor winding insulation damage from moisture ingress", downtimeHours: 24, category: "Mechanical" }
    ],
    workOrders: [
      { orderId: "WO-1022", date: new Date('2026-07-01'), description: "Check motor winding resistance (Megger test)", status: "Completed" }
    ],
    oemManualRef: "SOP-101: Steam Boiler Emergencies"
  },
  {
    tag: "BLR-22",
    name: "High Pressure Steam Boiler A",
    system: "Steam Loop System",
    criticality: "High",
    installDate: new Date('2018-05-18'),
    status: "Maintenance",
    failureHistory: [
      { date: new Date('2024-11-05'), description: "Safety relief valve leak causing pressure drop", downtimeHours: 18, category: "Mechanical" },
      { date: new Date('2025-05-12'), description: "Flame scanner failure leading to burner trip", downtimeHours: 4, category: "Instrumentation" }
    ],
    workOrders: [
      { orderId: "WO-1055", date: new Date('2026-07-15'), description: "Annual statutory inspection & pressure test", status: "In Progress" }
    ],
    oemManualRef: "SOP-101: Emergency Shutdown of Steam Boiler BLR-22"
  },
  {
    tag: "BLR-23",
    name: "High Pressure Steam Boiler B",
    system: "Steam Loop System",
    criticality: "High",
    installDate: new Date('2018-05-18'),
    status: "Standby",
    failureHistory: [],
    workOrders: [],
    oemManualRef: "SOP-101: Emergency Shutdown of Steam Boiler BLR-22"
  },
  {
    tag: "C-102",
    name: "Reciprocating Wet Gas Compressor A",
    system: "Gas Compressing Loop",
    criticality: "High",
    installDate: new Date('2021-09-20'),
    status: "Running",
    failureHistory: [
      { date: new Date('2023-05-14'), description: "Crankshaft bearing high temperature, line blocked", downtimeHours: 36, category: "Mechanical" },
      { date: new Date('2024-09-02'), description: "Discharge valve plate cracked on Cylinder 2", downtimeHours: 16, category: "Mechanical" },
      { date: new Date('2025-06-10'), description: "Lube oil pressure switch malfunction", downtimeHours: 3, category: "Instrumentation" }
    ],
    workOrders: [
      { orderId: "WO-2281", date: new Date('2026-07-10'), description: "Lube oil filter replacement and strainer cleanup", status: "Completed" }
    ],
    oemManualRef: "OEM C-102 Reciprocating Compressor, Section 2 (Valve Maintenance)"
  },
  {
    tag: "C-103",
    name: "Reciprocating Wet Gas Compressor B",
    system: "Gas Compressing Loop",
    criticality: "High",
    installDate: new Date('2021-09-20'),
    status: "Running",
    failureHistory: [
      { date: new Date('2025-02-18'), description: "Cylinder packing leakage exceeding safety limit", downtimeHours: 20, category: "Mechanical" }
    ],
    workOrders: [],
    oemManualRef: "OEM C-102 Reciprocating Compressor, Section 3 (Cylinder Seals)"
  },
  {
    tag: "TG-501",
    name: "Main Steam Turbine Generator",
    system: "Power Generation System",
    criticality: "High",
    installDate: new Date('2017-08-30'),
    status: "Running",
    failureHistory: [
      { date: new Date('2023-01-12'), description: "Rotor thermal bowing during warm up speed hold", downtimeHours: 72, category: "Mechanical" },
      { date: new Date('2024-12-15'), description: "Gland steam leak and casing temperature sensor fault", downtimeHours: 12, category: "Instrumentation" }
    ],
    workOrders: [
      { orderId: "WO-3301", date: new Date('2026-07-05'), description: "Turning gear inspection and speed sensor calibration", status: "Completed" }
    ],
    oemManualRef: "OEM TG-501 Steam Turbine Manual"
  },
  {
    tag: "V-101",
    name: "Primary Hydrocarbon Separator",
    system: "Gas Compressing Loop",
    criticality: "Medium",
    installDate: new Date('2018-05-18'),
    status: "Running",
    failureHistory: [
      { date: new Date('2024-04-18'), description: "High level float switch stuck, causing process upset", downtimeHours: 4, category: "Instrumentation" }
    ],
    workOrders: [],
    oemManualRef: "Factory Act 1948 Section 38"
  },
  {
    tag: "V-102",
    name: "Secondary Gas Liquid Separator",
    system: "Gas Compressing Loop",
    criticality: "Medium",
    installDate: new Date('2018-05-18'),
    status: "Running",
    failureHistory: [
      { date: new Date('2025-03-22'), description: "Internal mist eliminator pad clogged, high differential pressure", downtimeHours: 16, category: "Mechanical" }
    ],
    workOrders: [],
    oemManualRef: "Factory Act 1948 Section 38"
  },
  {
    tag: "V-103",
    name: "Lube Oil Separator Knock Out Drum",
    system: "Lube Oil System",
    criticality: "Medium",
    installDate: new Date('2020-04-12'),
    status: "Running",
    failureHistory: [],
    workOrders: [],
    oemManualRef: "Factory Act 1948 Section 38"
  },
  {
    tag: "ESD-01",
    name: "Emergency Shutdown Valve XV-302",
    system: "Safety Systems",
    criticality: "High",
    installDate: new Date('2018-05-18'),
    status: "Running",
    failureHistory: [
      { date: new Date('2025-07-02'), description: "Solenoid coil burned out, valve failed to close on demand", downtimeHours: 2, category: "Electrical" }
    ],
    workOrders: [
      { orderId: "WO-8871", date: new Date('2026-07-03'), description: "Solenoid replacement and full Stroke Test", status: "Completed" }
    ],
    oemManualRef: "SOP-101: Emergency Shutdown of Steam Boiler BLR-22"
  },
  {
    tag: "FGS-02",
    name: "Gas Detector GD-102",
    system: "Safety Systems",
    criticality: "High",
    installDate: new Date('2022-03-15'),
    status: "Running",
    failureHistory: [
      { date: new Date('2026-01-10'), description: "Sensor drift causing fake gas leak alert", downtimeHours: 1, category: "Instrumentation" }
    ],
    workOrders: [
      { orderId: "WO-9011", date: new Date('2026-06-30'), description: "Monthly sensor calibration check & bump test", status: "Completed" }
    ],
    oemManualRef: "OISD-Standard-189"
  }
];

// Add helper to verify DB status
const isConnected = () => mongoose.connection.readyState === 1;

// List all equipment
router.get('/', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(200).json(MOCK_EQUIPMENT_FALLBACK);
    }
    const assets = await Equipment.find().sort({ tag: 1 });
    if (assets.length === 0) {
      return res.status(200).json(MOCK_EQUIPMENT_FALLBACK);
    }
    res.status(200).json(assets);
  } catch (error) {
    console.warn("Assets database query failed, using mock fallback:", error.message);
    res.status(200).json(MOCK_EQUIPMENT_FALLBACK);
  }
});

// Get equipment by tag
router.get('/:tag', async (req, res) => {
  try {
    const tag = req.params.tag.toUpperCase();
    if (!isConnected()) {
      const mockAsset = MOCK_EQUIPMENT_FALLBACK.find(a => a.tag === tag);
      if (!mockAsset) return res.status(404).json({ error: `Asset ${tag} not found.` });
      return res.status(200).json(mockAsset);
    }
    const asset = await Equipment.findOne({ tag });
    if (!asset) {
      const mockAsset = MOCK_EQUIPMENT_FALLBACK.find(a => a.tag === tag);
      if (mockAsset) return res.status(200).json(mockAsset);
      return res.status(404).json({ error: `Asset with tag ${tag} not found.` });
    }
    res.status(200).json(asset);
  } catch (error) {
    const tag = req.params.tag.toUpperCase();
    const mockAsset = MOCK_EQUIPMENT_FALLBACK.find(a => a.tag === tag);
    if (mockAsset) return res.status(200).json(mockAsset);
    res.status(500).json({ error: error.message });
  }
});

// Generate dynamic RCA & Predictive Maintenance Heuristics
router.get('/:tag/rca', async (req, res) => {
  try {
    const tag = req.params.tag.toUpperCase();
    let asset = null;

    if (isConnected()) {
      asset = await Equipment.findOne({ tag });
    }
    
    if (!asset) {
      asset = MOCK_EQUIPMENT_FALLBACK.find(a => a.tag === tag);
    }

    if (!asset) {
      return res.status(404).json({ error: `Asset with tag ${tag} not found.` });
    }

    let incidents = [];
    if (isConnected()) {
      incidents = await Incident.find({ equipmentTag: tag });
    }

    // Heuristics Score calculation (Out of 100)
    let healthScore = 100;
    let maintenanceAlert = 'Normal';
    let ruleReason = "All parameters operating within nominal threshold boundaries.";

    const failureCount = asset.failureHistory?.length || 0;
    const totalDowntime = asset.failureHistory?.reduce((sum, item) => sum + item.downtimeHours, 0) || 0;
    const activeWorkOrdersCount = asset.workOrders?.filter(w => w.status !== 'Completed').length || 0;

    // Deduct points based on metrics
    healthScore -= failureCount * 15;
    healthScore -= activeWorkOrdersCount * 8;
    if (totalDowntime > 24) {
      healthScore -= 10;
    }
    healthScore = Math.max(12, healthScore); // Lower bound

    if (healthScore < 60) {
      maintenanceAlert = 'Critical';
      ruleReason = `ALERT: Critical failure count (${failureCount}) and downtime (${totalDowntime}h) exceeds baseline safety margins. High risk of immediate trip.`;
    } else if (healthScore < 85) {
      maintenanceAlert = 'Warning';
      ruleReason = `WARNING: Minor maintenance fatigue detected. Active work orders: ${activeWorkOrdersCount}. Schedule visual alignment checks.`;
    }

    let rcaSummary = "";
    let recommendations = [];

    if (genAI) {
      try {
        const model = getGenModel('gemini-2.0-flash');
        const prompt = `
          You are a reliability engineer conducting a Root Cause Analysis (RCA) for equipment tag ${tag} (${asset.name}) on system ${asset.system}.
          Here is its context:
          - Failure logs: ${JSON.stringify(asset.failureHistory)}
          - Process incident history: ${JSON.stringify(incidents)}
          - Outstanding Work Orders: ${JSON.stringify(asset.workOrders)}

          Perform a concise structural RCA. Diagnose potential root causes and write actionable preventive recommendations.
          Provide response strictly in JSON format as:
          {
            "rcaSummary": "Deep technical analysis summarizing why failures are recurring (connect the logs if possible). Use markdown inline style.",
            "recommendations": [
              "Action 1 (Specific fix or check)",
              "Action 2 (SOP or PM frequency adjust)",
              "Action 3 (Operator checks or monitoring)"
            ]
          }
        `;

        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });

        const parsed = JSON.parse(response.response.text());
        rcaSummary = parsed.rcaSummary;
        recommendations = parsed.recommendations;
      } catch (llmError) {
        console.error('LLM RCA generation failed, falling back to heuristics:', llmError);
        const fallback = getHeuristicRCA(tag, asset);
        rcaSummary = fallback.rcaSummary;
        recommendations = fallback.recommendations;
      }
    } else {
      const fallback = getHeuristicRCA(tag, asset);
      rcaSummary = fallback.rcaSummary;
      recommendations = fallback.recommendations;
    }

    res.status(200).json({
      tag,
      name: asset.name,
      system: asset.system,
      healthScore,
      maintenanceAlert,
      ruleReason,
      rcaSummary,
      recommendations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback logic
const getHeuristicRCA = (tag, asset) => {
  const failureCount = asset.failureHistory?.length || 0;
  if (failureCount === 0) {
    return {
      rcaSummary: `Asset **${tag}** has a clean operating sheet with 0 logged downtime incidents. Standard thermal, vibrational, and wear parameters remain inside normal design parameters.`,
      recommendations: [
        "Continue with standard quarterly preventive checks (vibration level monitoring, seal oil tests).",
        "Ensure operating logs are kept current for regular audit checkpoints."
      ]
    };
  }

  // Get most common category
  const categories = asset.failureHistory.map(f => f.category || 'Mechanical');
  const counts = {};
  categories.forEach(c => counts[c] = (counts[c] || 0) + 1);
  const primaryCat = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'Mechanical');

  let rcaSummary = "";
  let recommendations = [];

  if (primaryCat === 'Mechanical') {
    rcaSummary = `**Root Cause Diagnostics**: Technical evaluation of the failure records for **${tag}** indicates recurring mechanical failures. The logs trace coupling, seal, and bearing stress. These conditions point to **shaft misalignment** and **lubrication supply breakdown**. Starvation or thermal expansions during rotation shifts likely caused coupling element cracking.`;
    recommendations = [
      "Conduct dial gauge or laser alignment checks on the motor-pump shaft interface. Tolerance limit: 0.04 mm.",
      "Verify oil quality (sample for copper/iron metal wear particles) and ensure filter FL-202 is flushed clean.",
      "Establish vibration amplitude alarms on shift checklists (trigger threshold set at 4.5 mm/s RMS)."
    ];
  } else if (primaryCat === 'Instrumentation') {
    rcaSummary = `**Root Cause Diagnostics**: Failure vectors on **${tag}** concentrate on instrumentation and control loops. Historical sensor drift on level, temperature, or pressure switches triggered false system trips. Moisture accumulation or dust seal erosion on junction box IP protection limits appears to be the core cause.`;
    recommendations = [
      "Dismantle transmitters, perform calibration dry-runs, and replace damaged seal diaphragms.",
      "Re-pack outdoor electrical conduit couplings with weather-resistant insulation gel.",
      "Adjust logic trip delays (debounce timer) in the PLC configuration to suppress 1-second transient spikes."
    ];
  } else {
    rcaSummary = `**Root Cause Diagnostics**: Diagnostics on **${tag}** show electrical loop insulation or solenoid winding damage. Overheating under peak auxiliary grid loads, or corrosion from proximity steam leaks, has degraded internal winding resistance, reducing electrical coil lifespan.`;
    recommendations = [
      "Execute insulation resistance (Megger) checks at 500V during the next scheduled LOTO isolation.",
      "Verify solenoid valve ventilation spacing and check housing temperature using thermal scans.",
      "Verify auxiliary starter relay contacts are free of pitting or carbon deposition."
    ];
  }

  return { rcaSummary, recommendations };
};

export default router;
