const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Please provide max capacity'],
      default: 10,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['available', 'full', 'closed', 'cancelled'],
      default: 'available',
    },
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    allocatedTokens: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Token',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
slotSchema.index({ doctorId: 1, date: 1 });
slotSchema.index({ status: 1 });
slotSchema.index({ date: 1 });

module.exports = mongoose.model('Slot', slotSchema);
