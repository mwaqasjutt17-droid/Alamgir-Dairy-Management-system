// ============================================================
// calculationsController.js
// Handles milk unit conversion and rate calculations
// ============================================================

// POST /api/calculations/kg-to-liter
// Body: { kg: Number, density: Number }
const kgToLiter = (req, res) => {
  const { kg, density } = req.body;

  // ── Validation ──────────────────────────────────────────────
  if (kg === undefined || density === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Both "kg" and "density" fields are required.'
    });
  }

  const kgNum      = parseFloat(kg);
  const densityNum = parseFloat(density);

  if (isNaN(kgNum) || kgNum <= 0) {
    return res.status(400).json({
      success: false,
      message: '"kg" must be a positive number.'
    });
  }

  if (isNaN(densityNum) || densityNum <= 0) {
    return res.status(400).json({
      success: false,
      message: '"density" must be a positive number.'
    });
  }

  // ── Calculation: Liter = KG / Density ──────────────────────
  const liter = parseFloat((kgNum / densityNum).toFixed(4));

  return res.status(200).json({
    success : true,
    kg      : kgNum,
    density : densityNum,
    liter   : parseFloat(liter.toFixed(2))
  });
};

// POST /api/calculations/per-liter-rate
// Body: { ts: Number, baseRate: Number }
const perLiterRate = (req, res) => {
  const { ts, baseRate } = req.body;

  // ── Validation ──────────────────────────────────────────────
  if (ts === undefined || baseRate === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Both "ts" and "baseRate" fields are required.'
    });
  }

  const tsNum       = parseFloat(ts);
  const baseRateNum = parseFloat(baseRate);

  if (isNaN(tsNum) || tsNum <= 0) {
    return res.status(400).json({
      success: false,
      message: '"ts" must be a positive number.'
    });
  }

  if (isNaN(baseRateNum) || baseRateNum <= 0) {
    return res.status(400).json({
      success: false,
      message: '"baseRate" must be a positive number.'
    });
  }

  // ── Calculation: Per Liter Rate = (TS × Base Rate) / 13 ───
  const rate = parseFloat(((tsNum * baseRateNum) / 13).toFixed(2));

  return res.status(200).json({
    success      : true,
    ts           : tsNum,
    baseRate     : baseRateNum,
    divisor      : 13,
    perLiterRate : rate
  });
};

module.exports = { kgToLiter, perLiterRate };
