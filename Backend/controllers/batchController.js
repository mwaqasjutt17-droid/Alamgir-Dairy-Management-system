const Batch = require('../models/Batch');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc   Get all batches with search, filter, pagination
// @route  GET /api/batches
// @access Private
const getAllBatches = asyncHandler(async (req, res) => {
  const {
    search = '',
    page = 1,
    limit = 100,
    sortBy = 'createdAt',
    order = 'desc',
    pass,
    startDate,
    endDate
  } = req.query;

  const query = {};

  // Search by id or supplier
  if (search) {
    query.$or = [
      { id: { $regex: search, $options: 'i' } },
      { supplier: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by pass/fail
  if (pass !== undefined) {
    query.pass = pass === 'true';
  }

  // Filter by date range
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const total = await Batch.countDocuments(query);
  const batches = await Batch.find(query)
    .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.status(200).json(new ApiResponse(200, batches, 'Batches fetched successfully', {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit)
  }));
});

// @desc   Get analytics summary
// @route  GET /api/batches/analytics
// @access Private
const getBatchAnalytics = asyncHandler(async (req, res) => {
  const batches = await Batch.find();
  const analytics = {
    totalBatches: batches.length,
    totalVolume: batches.reduce((a, b) => a + b.qty, 0),
    totalPaid: batches.reduce((a, b) => a + b.total, 0),
    rejectedBatches: batches.filter(b => !b.pass).length,
    passedBatches: batches.filter(b => b.pass).length,
    avgFat: batches.length ? batches.reduce((a, b) => a + b.fat, 0) / batches.length : 0,
    avgSnf: batches.length ? batches.reduce((a, b) => a + b.snf, 0) / batches.length : 0,
    priceTrend: batches.slice(-15).map(b => ({ id: b.id, ppl: b.ppl })),
    fatDistribution: {
      lt25: batches.filter(b => b.fat < 2.5).length,
      r2530: batches.filter(b => b.fat >= 2.5 && b.fat < 3.0).length,
      r3035: batches.filter(b => b.fat >= 3.0 && b.fat < 3.5).length,
      r3540: batches.filter(b => b.fat >= 3.5 && b.fat < 4.0).length,
      gt40: batches.filter(b => b.fat >= 4.0).length
    }
  };
  res.status(200).json(new ApiResponse(200, analytics, 'Analytics fetched successfully'));
});

// @desc   Get single batch by ID
// @route  GET /api/batches/:id
// @access Private
const getBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({ id: req.params.id });
  if (!batch) throw new ApiError(404, `Batch with ID '${req.params.id}' not found`);
  res.status(200).json(new ApiResponse(200, batch, 'Batch fetched successfully'));
});

// @desc   Add a new batch
// @route  POST /api/batches
// @access Private
const addBatch = asyncHandler(async (req, res) => {
  if (req.user) req.body.createdBy = req.user._id;
  const batch = new Batch(req.body);
  const savedBatch = await batch.save();
  res.status(201).json(new ApiResponse(201, savedBatch, 'Batch saved successfully'));
});

// @desc   Update a batch
// @route  PUT /api/batches/:id
// @access Private
const updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOneAndUpdate({ id: req.params.id }, req.body, {
    new: true,
    runValidators: true
  });
  if (!batch) throw new ApiError(404, `Batch with ID '${req.params.id}' not found`);
  res.status(200).json(new ApiResponse(200, batch, 'Batch updated successfully'));
});

// @desc   Delete a single batch
// @route  DELETE /api/batches/:id
// @access Private
const deleteBatch = asyncHandler(async (req, res) => {
  const deleted = await Batch.findOneAndDelete({ id: req.params.id });
  if (!deleted) throw new ApiError(404, `Batch with ID '${req.params.id}' not found`);
  res.status(200).json(new ApiResponse(200, {}, 'Batch deleted successfully'));
});

// @desc   Clear all batches
// @route  DELETE /api/batches
// @access Private (Admin only)
const clearBatches = asyncHandler(async (req, res) => {
  await Batch.deleteMany({});
  res.status(200).json(new ApiResponse(200, {}, 'All batches cleared successfully'));
});

module.exports = { getAllBatches, getBatchAnalytics, getBatch, addBatch, updateBatch, deleteBatch, clearBatches };
