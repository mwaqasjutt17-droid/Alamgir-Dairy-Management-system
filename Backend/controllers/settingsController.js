const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

// @desc   Get settings
// @route  GET /api/settings
// @access Private
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  res.status(200).json(new ApiResponse(200, settings, 'Settings fetched successfully'));
});

// @desc   Update settings
// @route  PUT /api/settings
// @access Private (Admin)
const updateSettings = asyncHandler(async (req, res) => {
  const { dairyName, defaultSupplier, currencySymbol } = req.body;
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings({});
  }
  if (dairyName !== undefined) settings.dairyName = dairyName;
  if (defaultSupplier !== undefined) settings.defaultSupplier = defaultSupplier;
  if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol;
  settings.updatedBy = req.user._id;
  await settings.save();
  res.status(200).json(new ApiResponse(200, settings, 'Settings updated successfully'));
});

module.exports = { getSettings, updateSettings };
