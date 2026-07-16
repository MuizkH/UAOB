import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import Entity from '../models/Entity.js';
import Relationship from '../models/Relationship.js';
import Equipment from '../models/Equipment.js';
import Incident from '../models/Incident.js';
import { connectDB } from '../config/db.js';
import { getEmbedding, getGenModel, genAI } from '../config/gemini.js';
import { extractEntitiesAndRelationships, chunkText } from './ingestion.js';

dotenv.config();

// 1. Define Synthetic Documents (Text)
const SEED_DOCUMENTS = [
  {
    originalName: "OEM Manual: Centrifugal Pump P-101 Instruction manual",
    mimeType: "text/plain",
    category: "manual",
    content: `
      OEM INSTRUCTION MANUAL FOR CENTRIFUGAL PUMP MODEL CP-300 (TAG: P-101 / P-102)
      Section 1: Operating Conditions and Safety Warnings
      The centrifugal pump is designed for transporting liquid hydrocarbons at temperatures up to 120°C.
      WARNING: Do not run the pump dry. Running dry will cause immediate mechanical seal failure [SOP-LS-01].
      The normal operating speed is 2900 RPM. Normal bearing temperature should be maintained below 70°C. 
      If bearing temperature exceeds 85°C, immediate operator action is required. Shutdown pump P-101 and engage standby pump P-102.
      
      Section 2: Lubrication Requirements
      The bearings are lubricated with ISO VG 46 turbine oil. The oil level must be checked daily.
      Oil must be replaced every 4000 operating hours or every 6 months, whichever comes first.
      Lubricant starvation is the primary cause of shaft wear and high pump vibration. 
      Always verify lubrication line pressures are above 1.8 bar prior to startup.
      
      Section 3: Maintenance and Alignment
      Shaft alignment tolerance is 0.05 mm radial and axial. Misalignment leads to coupling failure and excessive vibration.
      Vibration limits: Critical shutdown limit is 7.2 mm/s RMS. Normal vibration levels should be below 2.8 mm/s RMS.
    `
  },
  {
    originalName: "SOP-101: Emergency Shutdown of Steam Boiler BLR-22",
    mimeType: "text/plain",
    category: "procedure",
    content: `
      STANDARD OPERATING PROCEDURE: STEAM BOILER EMERGENCIES (TAG: BLR-22 / BLR-23)
      Document Number: SOP-OPS-BOILER-22. Revision: 4.
      
      Procedure 1: High Pressure Event
      In the event that steam drum pressure exceeds 18.0 bar, the high-pressure alarm will sound.
      1. Verify that the automatic blowdown valve BDV-201 is open.
      2. If pressure continues to rise and reaches 18.5 bar, immediately execute manual Emergency Shutdown (ESD) by pressing the ESD-3 trip button on Console-04.
      3. Close the fuel gas supply shutdown valve XV-302 to isolate fuel to the boiler burner.
      4. Maintain feed water pump flow to prevent boiler tubes from overheating.
      
      Procedure 2: Low Water Level Emergency
      Low steam drum water level is highly critical. If water level falls below 15% of the gauge glass:
      1. Trigger immediate manual boiler trip to prevent explosion (drum rupture).
      2. Switch the auxiliary feedwater pump P-204 to manual-maximum flow.
      3. Do NOT feed cold water if drum has gone completely dry, as this can cause thermal shock. Wait for cooldown.
    `
  },
  {
    originalName: "OISD-Standard-189: Gas Leak Safety Regulations and Detector Spacing",
    mimeType: "text/plain",
    category: "compliance",
    content: `
      OIL INDUSTRY SAFETY DIRECTORATE (OISD) - STANDARD 189
      Title: Safety in Gas Processing Plants and Hydrocarbon Storage Facilities.
      
      Section 6.2: Gas Detection and Alarm Systems
      Flammable gas detectors must be placed in all critical zones where hydrocarbon vapors might accumulate.
      Detector placement criteria:
      1. Point detectors must be installed within 0.5 meters of potential leak points, including compressor seals, valves manifolds, and pump seals.
      2. In open process areas, detectors should be spaced in a grid pattern of no more than 10 meters spacing.
      3. For hydrogen gas, detectors must be located at the highest points of enclosures due to hydrogen's buoyancy.
      
      Section 7.4: Calibration and Inspection frequency
      All combustible gas detectors must undergo calibration checks quarterly.
      Bump testing using calibration gas must be conducted once every 30 days.
      All calibration logs must be archived and available for PESO / OISD audit inspections.
    `
  },
  {
    originalName: "Factory Act 1948: Section 38 - Safety Precautions for Pressure Plants",
    mimeType: "text/plain",
    category: "compliance",
    content: `
      THE FACTORY ACT 1948 (INDIA) - SECTION 38: SAFETY OF PRESSURE VESSELS
      
      Statutory Safety Requirements for Pressure Plants:
      1. Every vessel operated at a pressure higher than atmospheric pressure must be equipped with a reliable safety valve, pressure gauge, and level gauge.
      2. All pressure vessels (such as Steam Boilers BLR-22, Separators V-101, Air Receivers) must be subjected to a thorough external examination by a competent person once every 12 months.
      3. A hydrostatic test must be conducted every 4 years to verify structural integrity.
      4. No safety relief valve shall be set at a pressure higher than the Maximum Allowable Working Pressure (MAWP) of the vessel.
      5. Records of all inspections (Form-11) must be kept on site for verification by the Inspector of Factories.
    `
  },
  {
    originalName: "OEM Manual: Reciprocating Compressor C-102 Instruction Manual",
    mimeType: "text/plain",
    category: "manual",
    content: `
      OEM OPERATING MANUAL FOR RECIPROCATING COMPRESSOR (TAG: C-102 / C-103)
      Section 1: Frame Lubrication
      Lubricating oil pressure must be maintained between 2.5 and 4.0 bar. 
      The compressor frame is equipped with a mechanical lubrication pump.
      The low oil pressure shutdown switch is calibrated to trip the motor drive at 1.8 bar.
      Use only recommended synthetic lube oil (ISO VG 100). Mineral oils are strictly prohibited.
      
      Section 2: Valve Maintenance
      Discharge valves are subject to extreme thermal stress. Inspect valves every 8000 hours of operation.
      Look for carbon buildup, spring fatigue, and cracked valve plates.
      High discharge temperature on any cylinder indicates a leaking compressor valve. 
      Normal cylinder discharge temperature is 95°C. Critical shutdown limit is 120°C.
      
      Section 3: Cylinder Seals
      Cylinder packing rings prevent process gas from leaking into the crankcase distance piece.
      A nitrogen purge system is installed to sweep away any packing leakage. 
      Ensure nitrogen flow is maintained at 2.0 Nm3/hr at all times during operation.
    `
  },
  {
    originalName: "SOP-203: Compressor Lube Oil Replacement Procedure",
    mimeType: "text/plain",
    category: "procedure",
    content: `
      STANDARD OPERATING PROCEDURE: COMPRESSOR LUBE OIL FLUSH AND REPLACE (TAG: C-102 / C-103)
      Document ID: SOP-MAINT-COMP-203.
      
      Step 1: Preparation & Isolation
      1. Switch off the compressor. Lock and tag out the main electrical breaker (LOTO rules).
      2. Close suction and discharge process valves. Depressurize the compressor block to flare.
      3. Verify nitrogen purging is active to clear toxic gases.
      
      Step 2: Draining Lube Oil
      1. Open the crankcase drain valve and collect waste oil.
      2. Replace the main lube oil filters (Cartridge filter assembly FL-202).
      3. Clean the oil strainer magnet to check for metal debris or wear particles.
      
      Step 3: Refilling Lube Oil
      1. Fill crankcase with ISO VG 100 synthetic lubricant until oil level reaches 75% on the sight glass.
      2. Verify oil heater is powered on if ambient temperature is below 15°C.
      3. Run auxiliary oil pump to prime the lubrication lines.
    `
  },
  {
    originalName: "PESO Gas Cylinder Rules 2018: Safety and Compliance Guide",
    mimeType: "text/plain",
    category: "compliance",
    content: `
      PETROLEUM AND EXPLOSIVES SAFETY ORGANISATION (PESO) - GAS CYLINDER RULES 2018
      
      Rule 18: Storage of Compressed Gas Cylinders
      1. Cylinders must be stored in a well-ventilated dry area, away from direct sunlight, open flames, and electrical switchgear.
      2. Oxygen and flammable gas cylinders (like Hydrogen or Acetylene) must be stored separately, separated by a fire-resistant wall of at least 2 hours rating or a distance of 6 meters.
      3. All cylinders in storage must be secured vertically using chains or racks to prevent falling.
      
      Rule 22: Hydrostatic Testing of Cylinders
      Every gas cylinder must be subjected to hydrostatic stretch test at a test pressure equal to 1.5 times the working pressure.
      The testing interval for toxic or corrosive gases is 3 years, and for non-toxic gases is 5 years.
    `
  },
  {
    originalName: "OEM Manual: Turbine Generator TG-501 Startup Protocol",
    mimeType: "text/plain",
    category: "manual",
    content: `
      OEM STARTUP AND TECHNICAL DATA MANUAL FOR TG-501 STEAM TURBINE
      Tag Number: TG-501. Rated Power: 15 MW.
      
      Section 1: Pre-warming Procedure
      The steam turbine casing must be gradually pre-warmed using low-pressure steam to prevent thermal rotor bowing.
      1. Start the main auxiliary lube oil pump. Verify bearing oil pressure is 2.2 bar.
      2. Engage the turning gear. The rotor must rotate at 12 RPM for at least 4 hours.
      3. Open casing drains. Introduce gland steam at 1.5 bar.
      4. Slowly open turbine bypass valve to warm casing until turbine metal temperature reaches 150°C.
      
      Section 2: Speed Acceleration Profile
      1. Accelerate from turning gear speed to 1000 RPM at 100 RPM/min. Hold for 15 minutes (soak period).
      2. Accelerate through the critical speed zone (1800 RPM - 2200 RPM) rapidly at 500 RPM/min.
      3. Hold speed at 3000 RPM. Verify generator voltage and synchronization parameters.
    `
  }
];

// 2. Mock Equipment (30-40 Assets)
const MOCK_EQUIPMENT = [
  // Pumps
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
      { date: new Date('2023-11-30'), description: "Motor winding insulation damage from moisture ingress", downtimeHours: 24, category: "Electrical" }
    ],
    workOrders: [
      { orderId: "WO-1022", date: new Date('2026-07-01'), description: "Check motor winding resistance (Megger test)", status: "Completed" }
    ],
    oemManualRef: "SOP-101: Steam Boiler Emergencies"
  },
  // Boilers
  {
    tag: "BLR-22",
    name: "High Pressure Steam Boiler A",
    system: "Steam Loop System",
    criticality: "High",
    installDate: new Date('2018-05-18'),
    status: "Running",
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
  // Compressors
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
    name: "Reciprocating Wet Gas Compressor B (Standby)",
    system: "Gas Compressing Loop",
    criticality: "High",
    installDate: new Date('2021-09-20'),
    status: "Standby",
    failureHistory: [
      { date: new Date('2025-02-18'), description: "Cylinder packing leakage exceeding safety limit", downtimeHours: 20, category: "Mechanical" }
    ],
    workOrders: [],
    oemManualRef: "OEM C-102 Reciprocating Compressor, Section 3 (Cylinder Seals)"
  },
  // Turbine Generators
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
  // Vessels
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
  // Relief valves and systems
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

// Add dummy assets to reach ~30 records
for (let i = 4; i <= 25; i++) {
  const categories = ['P', 'V', 'C', 'HE', 'BLR', 'T'];
  const systems = ['Lube Oil System', 'Steam Loop System', 'Gas Compressing Loop', 'Water Utility Grid', 'Plant Air System'];
  const cat = categories[i % categories.length];
  const tag = `${cat}-${100 + i}`;
  const sys = systems[i % systems.length];
  MOCK_EQUIPMENT.push({
    tag,
    name: `Auxiliary Support unit ${cat} ${i}`,
    system: sys,
    criticality: i % 3 === 0 ? 'High' : (i % 3 === 1 ? 'Medium' : 'Low'),
    installDate: new Date(`2021-0${(i % 9) + 1}-15`),
    status: i % 7 === 0 ? 'Maintenance' : 'Running',
    failureHistory: i % 5 === 0 ? [
      { date: new Date(`2025-0${(i % 9) + 1}-10`), description: "Minor seal leak detected during walkdown", downtimeHours: 2, category: "Mechanical" }
    ] : [],
    workOrders: [],
    oemManualRef: ""
  });
}

// 3. Mock Incidents (10-15 reports with overlaps)
const MOCK_INCIDENTS = [
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

// Seeding Execution
const runSeed = async () => {
  console.log('--- STARTING DATABASE SEED SCRIPT ---');
  const conn = await connectDB();
  
  if (!conn) {
    console.error('Failed to establish database connection. Exiting.');
    process.exit(1);
  }

  try {
    // 1. Clear existing collections
    console.log('Clearing existing data...');
    await Document.deleteMany({});
    await Chunk.deleteMany({});
    await Entity.deleteMany({});
    await Relationship.deleteMany({});
    await Equipment.deleteMany({});
    await Incident.deleteMany({});
    console.log('Collections cleared.');

    // 2. Ingest Synthetic Documents
    console.log('Seeding synthetic plant documents...');
    for (const item of SEED_DOCUMENTS) {
      const buffer = Buffer.from(item.content, 'utf-8');
      
      // Let's directly call the ingestion flow logic
      // Note: We bypass upload file path for seed, passing content directly
      const filename = `${item.originalName.replace(/\s+/g, '_').toLowerCase()}.txt`;
      await ingestDocument(filename, item.originalName, item.mimeType, buffer, item.category);
    }
    console.log('Plant documents indexed.');

    // 3. Seed Equipment Records
    console.log(`Seeding ${MOCK_EQUIPMENT.length} equipment records...`);
    await Equipment.insertMany(MOCK_EQUIPMENT);

    // 4. Seed Incident Records
    console.log(`Seeding ${MOCK_INCIDENTS.length} incident records...`);
    await Incident.insertMany(MOCK_INCIDENTS);

    console.log('--- SEEDING COMPLETE ---');
    console.log('Success: All documents, chunks, equipment records, and incident histories seeded successfully.');
    
    if (!genAI) {
      console.log('\n[NOTICE] Seeding executed in offline mock mode (no GEMINI_API_KEY detected).');
      console.log('Visual elements and search queries will function correctly via fallback keyword algorithms.');
    } else {
      console.log('\n[NOTICE] Seeding completed using active Gemini APIs for Embeddings and Graph Node Generation.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding process failed with exception:', error);
    process.exit(1);
  }
};

runSeed();
