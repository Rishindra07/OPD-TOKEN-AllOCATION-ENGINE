const Token = require('../models/Token');
const Slot = require('../models/Slot');

/**
 * Emergency Service
 * Handles emergency patient allocations and priority overrides
 */

class EmergencyService {
  /**
   * Request emergency token
   */
  async requestEmergency(emergencyData) {
    try {
      const { patientId, doctorId, severity, reason, notes } = emergencyData;

      // Validate severity level
      const validSeverities = ['critical', 'high', 'medium'];
      if (!validSeverities.includes(severity)) {
        throw new Error('Invalid severity level');
      }

      return {
        success: true,
        emergency: {
          patientId,
          doctorId,
          severity,
          reason,
          notes,
          priorityScore: 100,
          status: 'pending',
        },
        message: `Emergency request received. Severity: ${severity}`,
      };
    } catch (error) {
      throw new Error(`Emergency request failed: ${error.message}`);
    }
  }

  /**
   * Get current slot for emergency allocation
   */
  async getCurrentSlot(doctorId) {
    try {
      const now = new Date();

      const currentSlot = await Slot.findOne({
        doctorId,
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: { $in: ['available', 'full'] },
      }).populate('allocatedTokens');

      if (!currentSlot) {
        return {
          success: false,
          message: 'No active slot for this doctor',
        };
      }

      return {
        success: true,
        slot: currentSlot,
        capacityInfo: {
          current: currentSlot.currentOccupancy,
          max: currentSlot.maxCapacity,
          isFull: currentSlot.currentOccupancy >= currentSlot.maxCapacity,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get current slot: ${error.message}`);
    }
  }

  /**
   * Handle emergency reallocation
   * Moves lowest priority patient if slot is full
   */
  async handleEmergencyReallocation(slotId, newPatientPriority) {
    try {
      const slot = await Slot.findById(slotId).populate('allocatedTokens');

      if (!slot) {
        throw new Error('Slot not found');
      }

      if (slot.currentOccupancy < slot.maxCapacity) {
        return {
          success: true,
          reallocationNeeded: false,
          message: 'Slot has available capacity',
        };
      }

      // Find lowest priority token
      const tokens = await Token.find({ slotId });
      if (tokens.length === 0) {
        return {
          success: true,
          reallocationNeeded: false,
          message: 'No tokens to reallocate',
        };
      }

      const sortedTokens = tokens.sort(
        (a, b) => a.priorityScore - b.priorityScore
      );
      const lowestPriorityToken = sortedTokens[0];

      // Only reallocate if new patient has higher priority
      if (lowestPriorityToken.priorityScore >= newPatientPriority) {
        return {
          success: false,
          reallocationNeeded: false,
          message: 'Emergency patient does not have higher priority',
        };
      }

      // Find next available slot
      const nextSlot = await Slot.findOne({
        doctorId: slot.doctorId,
        date: { $gt: slot.date },
        status: 'available',
        currentOccupancy: { $lt: '$maxCapacity' },
      }).sort({ date: 1, startTime: 1 });

      if (!nextSlot) {
        return {
          success: false,
          reallocationNeeded: false,
          message: 'No alternative slot available for reallocation',
        };
      }

      // Reallocate token
      lowestPriorityToken.slotId = nextSlot._id;
      lowestPriorityToken.appointmentTime = nextSlot.startTime;
      lowestPriorityToken.isReallocation = true;
      lowestPriorityToken.originalSlotId = slot._id;
      await lowestPriorityToken.save();

      // Update current slot
      slot.allocatedTokens = slot.allocatedTokens.filter(
        (id) => !id.equals(lowestPriorityToken._id)
      );
      slot.currentOccupancy -= 1;
      await slot.save();

      // Update next slot
      nextSlot.allocatedTokens.push(lowestPriorityToken._id);
      nextSlot.currentOccupancy += 1;
      if (nextSlot.currentOccupancy >= nextSlot.maxCapacity) {
        nextSlot.status = 'full';
      }
      await nextSlot.save();

      return {
        success: true,
        reallocationNeeded: true,
        reallocatedToken: {
          tokenId: lowestPriorityToken._id,
          source: lowestPriorityToken.source,
          priorityScore: lowestPriorityToken.priorityScore,
          newSlotTime: nextSlot.startTime,
        },
        message: 'Patient reallocated to alternative slot',
      };
    } catch (error) {
      throw new Error(`Emergency reallocation failed: ${error.message}`);
    }
  }

  /**
   * Fast-track emergency patient
   */
  async fastTrackEmergency(emergencyTokenData) {
    try {
      const { patientId, doctorId, reason, notes } = emergencyTokenData;

      // Get current slot
      const now = new Date();
      const currentSlot = await Slot.findOne({
        doctorId,
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: { $in: ['available', 'full'] },
      });

      if (!currentSlot) {
        throw new Error('No active slot available');
      }

      // Create emergency token with highest priority
      const { v4: uuidv4 } = require('uuid');
      const tokenNumber = `EMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const emergencyToken = new Token({
        tokenNumber,
        patientId,
        doctorId,
        slotId: currentSlot._id,
        source: 'emergency',
        priorityScore: 100,
        appointmentTime: new Date(),
        reason,
        notes,
        status: 'booked',
      });

      await emergencyToken.save();

      // Handle slot capacity
      if (currentSlot.currentOccupancy >= currentSlot.maxCapacity) {
        // Reallocate lowest priority
        const tokens = await Token.find({
          slotId: currentSlot._id,
          status: { $in: ['booked', 'checked_in'] },
        });

        if (tokens.length > 0) {
          const sortedTokens = tokens.sort(
            (a, b) => a.priorityScore - b.priorityScore
          );
          const lowestPriority = sortedTokens[0];

          // Find next slot
          const nextSlot = await Slot.findOne({
            doctorId,
            date: { $gt: currentSlot.date },
            status: 'available',
          }).sort({ date: 1, startTime: 1 });

          if (nextSlot) {
            lowestPriority.slotId = nextSlot._id;
            lowestPriority.appointmentTime = nextSlot.startTime;
            lowestPriority.isReallocation = true;
            await lowestPriority.save();

            nextSlot.allocatedTokens.push(lowestPriority._id);
            nextSlot.currentOccupancy += 1;
            await nextSlot.save();

            currentSlot.allocatedTokens = currentSlot.allocatedTokens.filter(
              (id) => !id.equals(lowestPriority._id)
            );
            currentSlot.currentOccupancy -= 1;
          }
        }
      }

      currentSlot.allocatedTokens.push(emergencyToken._id);
      currentSlot.currentOccupancy += 1;
      if (currentSlot.currentOccupancy >= currentSlot.maxCapacity) {
        currentSlot.status = 'full';
      }
      await currentSlot.save();

      return {
        success: true,
        token: emergencyToken,
        message: 'Emergency token allocated and fast-tracked',
      };
    } catch (error) {
      throw new Error(`Fast-track failed: ${error.message}`);
    }
  }

  /**
   * Get emergency statistics
   */
  async getEmergencyStats(doctorId) {
    try {
      const emergencyTokens = await Token.find({
        doctorId,
        source: 'emergency',
      });

      const avgWaitTime = await this.calculateAvgWaitTime(emergencyTokens);
      const todayEmergencies = emergencyTokens.filter(
        (t) =>
          new Date(t.appointmentTime).toDateString() === new Date().toDateString()
      );

      return {
        success: true,
        stats: {
          totalEmergencies: emergencyTokens.length,
          todayEmergencies: todayEmergencies.length,
          avgWaitTime,
          completionRate: emergencyTokens.filter(
            (t) => t.status === 'completed'
          ).length,
          noShowRate: emergencyTokens.filter((t) => t.status === 'no_show').length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get emergency stats: ${error.message}`);
    }
  }

  /**
   * Calculate average wait time
   */
  async calculateAvgWaitTime(tokens) {
    if (tokens.length === 0) return 0;

    const completedTokens = tokens.filter((t) => t.completedAt && t.checkedInAt);
    if (completedTokens.length === 0) return 0;

    const totalWaitTime = completedTokens.reduce((sum, token) => {
      return sum + (token.completedAt - token.checkedInAt);
    }, 0);

    return Math.floor(totalWaitTime / completedTokens.length / 60000); // in minutes
  }

  /**
   * Override slot rules for emergency
   */
  async overrideSlotRules(slotId, emergencyLevel) {
    try {
      const slot = await Slot.findById(slotId);

      if (!slot) {
        throw new Error('Slot not found');
      }

      // Increase capacity temporarily for emergencies
      const originalCapacity = slot.maxCapacity;
      if (emergencyLevel === 'critical') {
        slot.maxCapacity = Math.ceil(slot.maxCapacity * 1.5); // Increase by 50%
      } else if (emergencyLevel === 'high') {
        slot.maxCapacity = Math.ceil(slot.maxCapacity * 1.25); // Increase by 25%
      }

      await slot.save();

      return {
        success: true,
        message: `Slot capacity updated from ${originalCapacity} to ${slot.maxCapacity}`,
        originalCapacity,
        newCapacity: slot.maxCapacity,
      };
    } catch (error) {
      throw new Error(`Failed to override slot rules: ${error.message}`);
    }
  }
}

module.exports = new EmergencyService();
