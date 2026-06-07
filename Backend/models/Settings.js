const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  dairyName: { type: String, default: 'Alamgir Dairy Management System' },
  defaultSupplier: { type: String, default: '' },
  currencySymbol: { type: String, default: 'Rs.' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
