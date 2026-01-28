const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: {
      type: String,
      unique: true,
      required: true,
    },
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
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot',
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
      // Higher score = higher priority
      // Emergency: 100, Paid Priority: 80, Follow-up: 60, Online: 40, Walk-in: 20
    },
    status: {
      type: String,
      enum: ['booked', 'checked_in', 'completed', 'no_show', 'cancelled'],
      default: 'booked',
    },
    appointmentTime: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
    isReallocation: {
      type: Boolean,
      default: false,
    },
    originalSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot',
      required: false,
    },
    cancellationReason: {
      type: String,
      required: false,
    },
    checkedInAt: {
      type: Date,
      required: false,
    },
    completedAt: {
      type: Date,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
tokenSchema.index({ patientId: 1, status: 1 });
tokenSchema.index({ doctorId: 1, appointmentTime: 1 });
tokenSchema.index({ slotId: 1 });
tokenSchema.index({ tokenNumber: 1 });
tokenSchema.index({ source: 1 });

module.exports = mongoose.model('Token', tokenSchema);
