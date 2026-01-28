const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: [true, 'Please provide specialization'],
      enum: ['General', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'Orthopedist', 'Other'],
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    department: {
      type: String,
      required: true,
    },
    averageConsultationTime: {
      type: Number,
      default: 15, // in minutes
    },
    qualifications: {
      type: String,
      required: true,
    },
    experience: {
      type: Number, // in years
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    workingDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
