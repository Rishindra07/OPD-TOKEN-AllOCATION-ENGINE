const mongoose = require('mongoose');

const waitingQueueSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    source: {
      type: String,
      enum: ['emergency', 'paid_priority', 'follow_up', 'online', 'walk_in'],
      required: true,
    },
    priorityScore: {
      type: Number,
      required: true,
    },
    preferredDate: {
      type: Date,
      required: false,
    },
    reason: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['waiting', 'allocated', 'cancelled', 'expired'],
      default: 'waiting',
    },
    queuePosition: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      required: false,
    },
    allocatedTokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token',
      required: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Default expiry: 7 days from creation
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
waitingQueueSchema.index({ doctorId: 1, status: 1 });
waitingQueueSchema.index({ patientId: 1 });
waitingQueueSchema.index({ status: 1 });
waitingQueueSchema.index({ queuePosition: 1 });

module.exports = mongoose.model('Waiting', waitingQueueSchema);
