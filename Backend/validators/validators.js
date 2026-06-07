const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    throw new ApiError(400, messages.join('. '), errors.array());
  }
  next();
};

// ===================== AUTH VALIDATORS =====================
const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
];

const loginValidator = [
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate
];

// ===================== BATCH VALIDATORS =====================
const batchValidator = [
  body('id').trim().notEmpty().withMessage('Container/Batch ID is required'),
  body('qty').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('fat').isFloat({ min: 0, max: 15 }).withMessage('Fat % must be between 0 and 15'),
  body('lr').isFloat({ min: 0 }).withMessage('LR (Lactometer Reading) must be a positive number'),
  body('method').optional().isIn(['ts', 'twoaxis']).withMessage('Invalid pricing method'),
  validate
];

// ===================== FLEET VALIDATORS =====================
const fleetValidator = [
  body('vehicle').trim().notEmpty().withMessage('Vehicle number is required'),
  body('driver').trim().notEmpty().withMessage('Driver name is required'),
  body('route').trim().notEmpty().withMessage('Route is required'),
  body('status').isIn(['In Transit', 'Completed', 'Delayed', 'Cancelled']).withMessage('Invalid status'),
  body('cargo').isFloat({ min: 0 }).withMessage('Cargo must be a positive number'),
  body('fuel').isFloat({ min: 0 }).withMessage('Fuel must be a positive number'),
  validate
];

// ===================== SETTINGS VALIDATORS =====================
const settingsValidator = [
  body('dairyName').optional().trim().notEmpty().withMessage('Dairy name cannot be empty'),
  body('currencySymbol').optional().trim().notEmpty().withMessage('Currency symbol cannot be empty'),
  validate
];

module.exports = {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  batchValidator,
  fleetValidator,
  settingsValidator
};
