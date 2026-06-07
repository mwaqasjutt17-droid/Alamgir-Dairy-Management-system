const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { settingsValidator } = require('../validators/validators');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getSettings);
router.put('/', protect, settingsValidator, updateSettings);

module.exports = router;
