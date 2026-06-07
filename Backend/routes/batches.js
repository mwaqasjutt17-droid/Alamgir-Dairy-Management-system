const express = require('express');
const router = express.Router();
const {
  getAllBatches, getBatchAnalytics, getBatch, addBatch, updateBatch, deleteBatch, clearBatches
} = require('../controllers/batchController');
const { batchValidator } = require('../validators/validators');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Analytics (before /:id to avoid conflict)
router.get('/analytics', getBatchAnalytics);

router.route('/')
  .get(getAllBatches)
  .post(batchValidator, addBatch)
  .delete(clearBatches);

router.route('/:id')
  .get(getBatch)
  .put(updateBatch)
  .delete(deleteBatch);

module.exports = router;
