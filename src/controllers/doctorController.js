const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Slot = require('../models/Slot');

/**
 * Doctor Controller
 * Handles doctor-related operations
 */

class DoctorController {
  /**
   * Register as doctor
   */
  async registerDoctor(req, res) {
    try {
      const {
        specialization,
        licenseNumber,
        department,
        qualifications,
        experience,
        workingDays,
      } = req.body;

      // Check required fields
      if (
        !specialization ||
        !licenseNumber ||
        !department ||
        !qualifications ||
        experience === undefined
      ) {
        return res
          .status(400)
          .json({ success: false, message: 'Please provide all required fields' });
      }

      // Check if user exists
      const user = await User.findById(req.userId);
      if (!user || user.role !== 'doctor') {
        return res.status(403).json({
          success: false,
          message: 'User must be registered as doctor role',
        });
      }

      // Check if doctor already registered
      const existingDoctor = await Doctor.findOne({ userId: req.userId });
      if (existingDoctor) {
        return res.status(400).json({
          success: false,
          message: 'Doctor already registered',
        });
      }

      // Check if license is unique
      const licenseExists = await Doctor.findOne({ licenseNumber });
      if (licenseExists) {
        return res.status(400).json({
          success: false,
          message: 'License number already exists',
        });
      }

      // Create doctor profile
      const doctor = new Doctor({
        userId: req.userId,
        specialization,
        licenseNumber,
        department,
        qualifications,
        experience,
        workingDays: workingDays || [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
        ],
      });

      await doctor.save();

      res.status(201).json({
        success: true,
        message: 'Doctor profile created successfully',
        doctor,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Doctor registration failed: ${error.message}`,
      });
    }
  }

  /**
   * Get doctor profile
   */
  async getDoctorProfile(req, res) {
    try {
      const doctorId = req.params.doctorId || req.userId;

      const doctor = await Doctor.findById(doctorId).populate(
        'userId',
        'name email phone'
      );

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found',
        });
      }

      res.json({
        success: true,
        doctor,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch doctor profile: ${error.message}`,
      });
    }
  }

  /**
   * Update doctor profile
   */
  async updateDoctorProfile(req, res) {
    try {
      const { qualifications, experience, workingDays, averageConsultationTime } =
        req.body;

      const doctor = await Doctor.findOne({ userId: req.userId });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor profile not found',
        });
      }

      // Update fields
      if (qualifications) doctor.qualifications = qualifications;
      if (experience !== undefined) doctor.experience = experience;
      if (workingDays) doctor.workingDays = workingDays;
      if (averageConsultationTime)
        doctor.averageConsultationTime = averageConsultationTime;

      await doctor.save();

      res.json({
        success: true,
        message: 'Doctor profile updated successfully',
        doctor,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Profile update failed: ${error.message}`,
      });
    }
  }

  /**
   * List all doctors
   */
  async listDoctors(req, res) {
    try {
      const { specialization, department, isAvailable } = req.query;

      const filter = {};
      if (specialization) filter.specialization = specialization;
      if (department) filter.department = department;
      if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';

      const doctors = await Doctor.find(filter).populate(
        'userId',
        'name email phone'
      );

      res.json({
        success: true,
        count: doctors.length,
        doctors,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to list doctors: ${error.message}`,
      });
    }
  }

  /**
   * Toggle doctor availability
   */
  async toggleAvailability(req, res) {
    try {
      const { isAvailable } = req.body;

      const doctor = await Doctor.findOne({ userId: req.userId });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor profile not found',
        });
      }

      doctor.isAvailable = isAvailable;
      await doctor.save();

      res.json({
        success: true,
        message: `Doctor availability updated to ${isAvailable}`,
        doctor,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to update availability: ${error.message}`,
      });
    }
  }

  /**
   * Get doctor's slots
   */
  async getDoctorSlots(req, res) {
    try {
      const doctorId = req.params.doctorId || req.userId;
      const { status, date } = req.query;

      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found',
        });
      }

      const filter = { doctorId };
      if (status) filter.status = status;
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date = { $gte: startOfDay, $lte: endOfDay };
      }

      const slots = await Slot.find(filter).sort({ startTime: 1 });

      res.json({
        success: true,
        count: slots.length,
        slots,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch slots: ${error.message}`,
      });
    }
  }

  /**
   * Get doctor statistics
   */
  async getDoctorStats(req, res) {
    try {
      const doctorId = req.params.doctorId || req.userId;
      const Token = require('../models/Token');

      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found',
        });
      }

      const tokens = await Token.find({ doctorId });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTokens = tokens.filter(
        (t) => new Date(t.appointmentTime) >= today
      );

      const stats = {
        totalTokens: tokens.length,
        todayTokens: todayTokens.length,
        completed: tokens.filter((t) => t.status === 'completed').length,
        cancelled: tokens.filter((t) => t.status === 'cancelled').length,
        noShow: tokens.filter((t) => t.status === 'no_show').length,
        booked: tokens.filter((t) => t.status === 'booked').length,
        cancellationRate: (
          (tokens.filter((t) => t.status === 'cancelled').length / tokens.length) *
          100
        ).toFixed(2),
      };

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch statistics: ${error.message}`,
      });
    }
  }
}

module.exports = new DoctorController();
