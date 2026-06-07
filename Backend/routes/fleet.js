const express = require('express');
const router = express.Router();
const {
  getAllFleet, getFleetStats, addFleet, updateFleet, deleteFleet, clearFleet
} = require('../controllers/fleetController');
const { fleetValidator } = require('../validators/validators');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Stats (before /:id to avoid conflict)
router.get('/stats', getFleetStats);

router.route('/')
  .get(getAllFleet)
  .post(fleetValidator, addFleet)
  .delete(clearFleet);

router.route('/:id')
  .put(updateFleet)
  .delete(deleteFleet);

module.exports = router;
