const Fleet = require('../models/Fleet');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// @desc   Get all fleet records with search, filter, pagination
// @route  GET /api/fleet
// @access Private
const getAllFleet = asyncHandler(async (req, res) => {
  const {
    search = '',
    page = 1,
    limit = 100,
    sortBy = 'createdAt',
    order = 'desc',
    status
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { vehicle: { $regex: search, $options: 'i' } },
      { driver: { $regex: search, $options: 'i' } },
      { route: { $regex: search, $options: 'i' } }
    ];
  }

  if (status) {
    query.status = status;
  }

  const total = await Fleet.countDocuments(query);
  const fleetLogs = await Fleet.find(query)
    .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.status(200).json(new ApiResponse(200, fleetLogs, 'Fleet logs fetched successfully', {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit)
  }));
});

// @desc   Get fleet summary stats
// @route  GET /api/fleet/stats
// @access Private
const getFleetStats = asyncHandler(async (req, res) => {
  const fleet = await Fleet.find();
  const stats = {
    total: fleet.length,
    inTransit: fleet.filter(f => f.status === 'In Transit').length,
    completed: fleet.filter(f => f.status === 'Completed').length,
    delayed: fleet.filter(f => f.status === 'Delayed').length,
    cancelled: fleet.filter(f => f.status === 'Cancelled').length,
    totalFuel: fleet.reduce((a, b) => a + b.fuel, 0),
    totalCargo: fleet.reduce((a, b) => a + b.cargo, 0)
  };
  res.status(200).json(new ApiResponse(200, stats, 'Fleet stats fetched successfully'));
});

// @desc   Add a fleet log
// @route  POST /api/fleet
// @access Private
const addFleet = asyncHandler(async (req, res) => {
  if (req.user) req.body.createdBy = req.user._id;
  const fleetLog = new Fleet(req.body);
  const savedLog = await fleetLog.save();
  res.status(201).json(new ApiResponse(201, savedLog, 'Fleet log added successfully'));
});

// @desc   Update a fleet log
// @route  PUT /api/fleet/:id
// @access Private
const updateFleet = asyncHandler(async (req, res) => {
  const fleetLog = await Fleet.findOneAndUpdate({ id: req.params.id }, req.body, {
    new: true,
    runValidators: true
  });
  if (!fleetLog) throw new ApiError(404, `Fleet record with ID '${req.params.id}' not found`);
  res.status(200).json(new ApiResponse(200, fleetLog, 'Fleet record updated successfully'));
});

// @desc   Delete a fleet log
// @route  DELETE /api/fleet/:id
// @access Private
const deleteFleet = asyncHandler(async (req, res) => {
  const deleted = await Fleet.findOneAndDelete({ id: req.params.id });
  if (!deleted) throw new ApiError(404, `Fleet record with ID '${req.params.id}' not found`);
  res.status(200).json(new ApiResponse(200, {}, 'Fleet record deleted successfully'));
});

// @desc   Clear all fleet records
// @route  DELETE /api/fleet
// @access Private (Admin only)
const clearFleet = asyncHandler(async (req, res) => {
  await Fleet.deleteMany({});
  res.status(200).json(new ApiResponse(200, {}, 'All fleet records cleared successfully'));
});

module.exports = { getAllFleet, getFleetStats, addFleet, updateFleet, deleteFleet, clearFleet };
