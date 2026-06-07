const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  supplier: { type: String, trim: true, default: '—' },
  date: { type: String },
  qty: { type: Number, required: true, min: 0 },
  fat: { type: Number, required: true, min: 0 },
  lr: { type: Number, required: true, min: 0 },
  snf: { type: Number },
  ts: { type: Number },
  ppl: { type: Number },
  total: { type: Number },
  pass: { type: Boolean, default: false },
  waterFlag: { type: Boolean, default: false },
  protein: { type: Number, default: null },
  lactose: { type: Number, default: null },
  temp: { type: Number, default: null },
  method: { type: String, enum: ['ts', 'twoaxis'], default: 'ts' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Index for fast search
batchSchema.index({ id: 1 });
batchSchema.index({ supplier: 1 });
batchSchema.index({ date: -1 });
batchSchema.index({ pass: 1 });

module.exports = mongoose.model('Batch', batchSchema);
