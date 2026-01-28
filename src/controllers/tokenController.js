const allocationService = require('../services/allocationService');
const waitingQueueService = require('../services/waitingQueueService');
const Token = require('../models/Token');
const Slot = require('../models/Slot');

/**
 * Token Controller
 * Handles token booking and management
 */

class TokenController {
  /**
   * Request new token
   */
  async requestToken(req, res) {
    try {
      const {
        doctorId,
        source,
        preferredSlotId,
        appointmentTime,
        reason,
        notes,
      } = req.body;

      // Validate input
      if (!doctorId || !source || !appointmentTime) {
        return res.status(400).json({
          success: false,
          message: 'Please provide doctorId, source, and appointmentTime',
        });
      }

      // Validate source
      const validSources = ['emergency', 'paid_priority', 'follow_up', 'online', 'walk_in'];
      if (!validSources.includes(source)) {
        return res.status(400).json({
          success: false,
          message: `Invalid source. Must be one of: ${validSources.join(', ')}`,
        });
      }

      const tokenData = {
        patientId: req.userId,
        doctorId,
        source,
        preferredSlotId,
        appointmentTime,
        reason,
        notes,
      };

      const result = await allocationService.allocateToken(tokenData);

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Token request failed: ${error.message}`,
      });
    }
  }

  /**
   * Get token details
   */
  async getToken(req, res) {
    try {
      const { tokenId } = req.params;

      const token = await Token.findById(tokenId)
        .populate('patientId', 'name email phone')
        .populate('doctorId', 'specialization')
        .populate('slotId');

      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found',
        });
      }

      res.json({
        success: true,
        token,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch token: ${error.message}`,
      });
    }
  }

  /**
   * Get all tokens for patient
   */
  async getPatientTokens(req, res) {
    try {
      const { status } = req.query;

      const filter = { patientId: req.userId };
      if (status) filter.status = status;

      const tokens = await Token.find(filter)
        .populate('doctorId', 'name specialization')
        .populate('slotId', 'startTime endTime')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: tokens.length,
        tokens,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch tokens: ${error.message}`,
      });
    }
  }

  /**
   * Update token status
   */
  async updateTokenStatus(req, res) {
    try {
      const { tokenId } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['booked', 'checked_in', 'completed', 'no_show', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      const token = await Token.findById(tokenId);

      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found',
        });
      }

      const oldStatus = token.status;
      token.status = status;

      if (status === 'checked_in') {
        token.checkedInAt = new Date();
      } else if (status === 'completed') {
        token.completedAt = new Date();
      }

      await token.save();

      res.json({
        success: true,
        message: `Token status updated from ${oldStatus} to ${status}`,
        token,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to update token status: ${error.message}`,
      });
    }
  }

  /**
   * Get slot availability
   */
  async getSlotAvailability(req, res) {
    try {
      const { doctorId, date } = req.query;

      if (!doctorId || !date) {
        return res.status(400).json({
          success: false,
          message: 'Please provide doctorId and date',
        });
      }

      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const slots = await Slot.find({
        doctorId,
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ['available', 'full'] },
      })
        .sort({ startTime: 1 })
        .populate('allocatedTokens');

      const availability = slots.map((slot) => ({
        slotId: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxCapacity: slot.maxCapacity,
        currentOccupancy: slot.currentOccupancy,
        availableSpots: Math.max(0, slot.maxCapacity - slot.currentOccupancy),
        status: slot.status,
      }));

      res.json({
        success: true,
        date,
        availableSlots: availability.filter((s) => s.availableSpots > 0).length,
        totalSlots: availability.length,
        slots: availability,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch slot availability: ${error.message}`,
      });
    }
  }

  /**
   * Get waiting queue status
   */
  async getWaitingStatus(req, res) {
    try {
      const { doctorId } = req.query;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Please provide doctorId',
        });
      }

      const result = await waitingQueueService.getQueuePosition(req.userId, doctorId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch waiting status: ${error.message}`,
      });
    }
  }

  /**
   * Check token status
   */
  async checkTokenStatus(req, res) {
    try {
      const { tokenId } = req.params;

      const token = await Token.findById(tokenId)
        .populate('doctorId', 'name specialization')
        .populate('slotId', 'startTime endTime');

      if (!token) {
        return res.status(404).json({
          success: false,
          message: 'Token not found',
        });
      }

      const now = new Date();
      const appointmentTime = new Date(token.appointmentTime);
      const timeUntilAppointment = (appointmentTime - now) / (1000 * 60); // in minutes

      res.json({
        success: true,
        token: {
          tokenNumber: token.tokenNumber,
          status: token.status,
          doctor: token.doctorId,
          appointmentTime: token.appointmentTime,
          timeUntilAppointment: Math.ceil(timeUntilAppointment),
          checkedIn: token.checkedInAt ? true : false,
          completed: token.completedAt ? true : false,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to check token status: ${error.message}`,
      });
    }
  }

  /**
   * Get tokens for slot
   */
  async getSlotTokens(req, res) {
    try {
      const { slotId } = req.params;

      const tokens = await Token.find({ slotId })
        .populate('patientId', 'name email phone')
        .sort({ priorityScore: -1, createdAt: 1 });

      const slot = await Slot.findById(slotId);

      res.json({
        success: true,
        count: tokens.length,
        slot: {
          capacity: slot.maxCapacity,
          occupancy: slot.currentOccupancy,
        },
        tokens,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch slot tokens: ${error.message}`,
      });
    }
  }
}

module.exports = new TokenController();
