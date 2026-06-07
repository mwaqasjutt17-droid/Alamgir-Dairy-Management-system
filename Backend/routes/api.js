const express = require('express');
const router = express.Router();

const { getAllBatches, addBatch, deleteBatch, clearBatches } = require('../controllers/batchController');
const { getAllFleet, addFleet, deleteFleet, clearFleet } = require('../controllers/fleetController');

// ===================== BATCH ROUTES =====================
router.route('/batches')
  .get(getAllBatches)
  .post(addBatch)
  .delete(clearBatches);

router.route('/batches/:id')
  .delete(deleteBatch);

// ===================== FLEET ROUTES =====================
router.route('/fleet')
  .get(getAllFleet)
  .post(addFleet)
  .delete(clearFleet);

router.route('/fleet/:id')
  .delete(deleteFleet);

module.exports = router;
