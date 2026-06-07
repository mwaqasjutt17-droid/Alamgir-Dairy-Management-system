const mongoose = require('mongoose');

const fleetSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  vehicle: { type: String, required: true, trim: true },
  driver: { type: String, required: true, trim: true },
  route: { type: String, required: true, trim: true },
  cargo: { type: Number, required: true, min: 0 },
  fuel: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    required: true,
    enum: ['In Transit', 'Completed', 'Delayed', 'Cancelled'],
    default: 'In Transit'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

fleetSchema.index({ vehicle: 1 });
fleetSchema.index({ status: 1 });

module.exports = mongoose.model('Fleet', fleetSchema);
