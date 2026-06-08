const express = require('express');
const router  = express.Router();
const { kgToLiter, perLiterRate } = require('../controllers/calculationsController');

// POST /api/calculations/kg-to-liter
router.post('/kg-to-liter', kgToLiter);

// POST /api/calculations/per-liter-rate
router.post('/per-liter-rate', perLiterRate);

module.exports = router;
