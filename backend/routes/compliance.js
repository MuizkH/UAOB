import express from 'express';

const router = express.Router();

// Mock Regulatory Compliance Dataset
const COMPLIANCE_ITEMS = [
  {
    id: "REG-001",
    authority: "OISD",
    clause: "OISD-189 Clause 6.2",
    requirement: "Flammable gas detectors must be placed within 0.5 meters of potential leak points, including compressor and pump seals.",
    procedureRef: "SOP-402 (Fire and Gas System Test)",
    status: "Compliant",
    severity: "Critical",
    gapSummary: "None. Detectors mounted at C-102 and C-103 seals conform to the 0.5m envelope.",
    lastAudited: "2026-06-15"
  },
  {
    id: "REG-002",
    authority: "OISD",
    clause: "OISD-189 Clause 7.4",
    requirement: "Conduct monthly sensor bump-testing and quarterly full calibration for all combustible gas detectors.",
    procedureRef: "Monthly calibration check sheet",
    status: "Partial",
    severity: "High",
    gapSummary: "Bump testing on GD-102 was delayed by 12 days in Q2 due to painter operations bypass. GD-103 is compliant.",
    lastAudited: "2026-06-30"
  },
  {
    id: "REG-003",
    authority: "Factory Act",
    clause: "Factory Act 1948 Sec 38",
    requirement: "Thorough external examination of all pressure vessels by a competent person once every 12 months.",
    procedureRef: "WO-1055 (Annual pressure plant checks)",
    status: "Compliant",
    severity: "Critical",
    gapSummary: "Boiler BLR-22 inspection completed on schedule. BLR-23 inspection currently active under work order.",
    lastAudited: "2026-07-15"
  },
  {
    id: "REG-004",
    authority: "Factory Act",
    clause: "Factory Act 1948 Sec 38(3)",
    requirement: "Conduct hydrostatic structural integrity tests for high-pressure boilers and vessels every 4 years.",
    procedureRef: "Static pressure vessel hydrostatic logbook",
    status: "Compliant",
    severity: "Critical",
    gapSummary: "Last hydro test executed in October 2023. Next hydrostatic inspection scheduled for October 2027.",
    lastAudited: "2023-10-10"
  },
  {
    id: "REG-005",
    authority: "PESO",
    clause: "PESO Cylinder Rules 18",
    requirement: "Separate storage of oxygen cylinders and flammable gas cylinders by 6m distance or a 2-hour rated fire wall.",
    procedureRef: "Yard Storage Guideline YD-04",
    status: "Non-Compliant",
    severity: "High",
    gapSummary: "Audit walkdown flagged 4 oxygen cylinders stored in close proximity to Hydrogen supply skid without partition walls.",
    lastAudited: "2026-07-08"
  },
  {
    id: "REG-006",
    authority: "PESO",
    clause: "PESO Cylinder Rules 22",
    requirement: "Hydrostatic stretch testing of toxic/corrosive gas cylinder units every 3 years.",
    procedureRef: "SOP-CYL-TEST-02",
    status: "Compliant",
    severity: "Medium",
    gapSummary: "All chemical cylinders stamped with valid test markings. Next batch inspection in Dec 2027.",
    lastAudited: "2024-12-05"
  }
];

// Get regulatory checks
router.get('/', (req, res) => {
  res.status(200).json(COMPLIANCE_ITEMS);
});

// Export Audit Evidence Package
router.post('/export', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    
    // Generate text document layout
    let doc = `========================================================================
AUDIT COMPLIANCE EVIDENCE PACKAGE — INDUSTRIAL OPERATIONS BRAIN
EXPORTED ON: ${timestamp}
COMPLIANCE COVERAGE: OISD / FACTORY ACT 1948 / PESO REGULATIONS
========================================================================

SUMMARY OF RESULTS:
------------------
Total Regulatory Clauses Checked : ${COMPLIANCE_ITEMS.length}
Fully Compliant Clauses          : ${COMPLIANCE_ITEMS.filter(c => c.status === 'Compliant').length}
Partial Gaps Spotted             : ${COMPLIANCE_ITEMS.filter(c => c.status === 'Partial').length}
Critical Breaches / Non-Compliant : ${COMPLIANCE_ITEMS.filter(c => c.status === 'Non-Compliant').length}
Current Safety Index             : ${Math.round((COMPLIANCE_ITEMS.filter(c => c.status === 'Compliant').length / COMPLIANCE_ITEMS.length) * 100)}%

------------------------------------------------------------------------
DETAILED REGULATORY MATRIX EVALUATION:
------------------------------------------------------------------------
`;

    COMPLIANCE_ITEMS.forEach((item, index) => {
      doc += `
[${index + 1}] REGULATION ID: ${item.id} (${item.authority})
    Clause Reference : ${item.clause}
    Severity Rating  : ${item.severity}
    Status           : ${item.status.toUpperCase()}
    Requirement      : ${item.requirement}
    Plant SOP Link   : ${item.procedureRef}
    Audit Findings   : ${item.gapSummary}
    Last Inspected   : ${item.lastAudited}
------------------------------------------------------------------------`;
    });

    doc += `\n\n========================= END OF COMPLIANCE REPORT =========================`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_compliance_report.txt');
    return res.status(200).send(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
