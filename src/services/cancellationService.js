const Token = require('../models/Token');
const Slot = require('../models/Slot');

/**
 * Cancellation Service
 * Handles token cancellations and slot management
 */

class CancellationService {
  /**
   * Request token cancellation
   */
  async requestCancellation(tokenId, cancellationReason) {
    try {
      const token = await Token.findById(tokenId).populate('slotId');

      if (!token) {
        throw new Error('Token not found');
      }

      if (['completed', 'cancelled', 'no_show'].includes(token.status)) {
        throw new Error('Cannot cancel a token that is already completed, cancelled, or no-show');
      }

      // Check if within cancellation window (24 hours before appointment)
      const appointmentTime = new Date(token.appointmentTime);
      const now = new Date();
      const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 0) {
        throw new Error('Cannot cancel appointment that has already started');
      }

      return {
        success: true,
        canCancel: hoursUntilAppointment > 0.5,
        hoursUntilAppointment,
        message: hoursUntilAppointment < 24
          ? 'Cancellation allowed but late fee may apply'
          : 'Cancellation allowed without penalty',
      };
    } catch (error) {
      throw new Error(`Cancellation check failed: ${error.message}`);
    }
  }

  /**
   * Process cancellation
   */
  async processCancellation(tokenId, cancellationReason) {
    try {
      const token = await Token.findById(tokenId);

      if (!token) {
        throw new Error('Token not found');
      }

      // Update token
      token.status = 'cancelled';
      token.cancellationReason = cancellationReason;
      await token.save();

      // Free up slot
      const slot = await Slot.findById(token.slotId);
      if (slot) {
        slot.allocatedTokens = slot.allocatedTokens.filter(
          (id) => !id.equals(token._id)
        );
        slot.currentOccupancy -= 1;

        if (slot.status === 'full' && slot.currentOccupancy < slot.maxCapacity) {
          slot.status = 'available';
        }

        await slot.save();
      }

      return {
        success: true,
        message: 'Token cancelled successfully',
        freedSlot: {
          slotId: token.slotId,
          appointmentTime: token.appointmentTime,
        },
      };
    } catch (error) {
      throw new Error(`Cancellation processing failed: ${error.message}`);
    }
  }

  /**
   * Bulk cancellation for a slot (in case of doctor unavailability)
   */
  async bulkCancelSlot(slotId, reason) {
    try {
      const slot = await Slot.findById(slotId).populate('allocatedTokens');

      if (!slot) {
        throw new Error('Slot not found');
      }

      const cancelledTokenIds = [];

      // Cancel all tokens in the slot
      for (const tokenId of slot.allocatedTokens) {
        const token = await Token.findById(tokenId);
        if (token && !['completed', 'cancelled'].includes(token.status)) {
          token.status = 'cancelled';
          token.cancellationReason = reason;
          await token.save();
          cancelledTokenIds.push(tokenId);
        }
      }

      // Mark slot as cancelled
      slot.status = 'cancelled';
      slot.allocatedTokens = [];
      slot.currentOccupancy = 0;
      await slot.save();

      return {
        success: true,
        slotId,
        cancelledTokenCount: cancelledTokenIds.length,
        message: `Slot cancelled. ${cancelledTokenIds.length} tokens cancelled`,
      };
    } catch (error) {
      throw new Error(`Bulk cancellation failed: ${error.message}`);
    }
  }

  /**
   * Get cancellation history for a patient
   */
  async getCancellationHistory(patientId) {
    try {
      const cancellations = await Token.find({
        patientId,
        status: 'cancelled',
      })
        .populate('doctorId', 'name specialization')
        .populate('slotId', 'startTime endTime')
        .sort({ cancelledAt: -1 });

      return {
        success: true,
        count: cancellations.length,
        data: cancellations,
      };
    } catch (error) {
      throw new Error(`Failed to get cancellation history: ${error.message}`);
    }
  }

  /**
   * Get cancellation statistics
   */
  async getCancellationStats(doctorId) {
    try {
      const stats = await Token.aggregate([
        {
          $match: { doctorId: require('mongoose').Types.ObjectId(doctorId) },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const cancellationRate =
        (stats.find((s) => s._id === 'cancelled')?.count || 0) /
        stats.reduce((sum, s) => sum + s.count, 0);

      return {
        success: true,
        totalTokens: stats.reduce((sum, s) => sum + s.count, 0),
        byStatus: stats,
        cancellationRate: (cancellationRate * 100).toFixed(2) + '%',
      };
    } catch (error) {
      throw new Error(`Failed to get cancellation stats: ${error.message}`);
    }
  }

  /**
   * Refund cancellation fee
   */
  async requestRefund(tokenId) {
    try {
      const token = await Token.findById(tokenId);

      if (!token) {
        throw new Error('Token not found');
      }

      if (token.status !== 'cancelled') {
        throw new Error('Only cancelled tokens can request refunds');
      }

      // Check cancellation reason and time
      const appointmentTime = new Date(token.appointmentTime);
      const cancellationTime = token.updatedAt;
      const hoursBeforeAppointment = (appointmentTime - cancellationTime) / (1000 * 60 * 60);

      let refundPercentage = 0;
      if (hoursBeforeAppointment >= 24) {
        refundPercentage = 100; // Full refund
      } else if (hoursBeforeAppointment >= 12) {
        refundPercentage = 75; // 75% refund
      } else if (hoursBeforeAppointment >= 6) {
        refundPercentage = 50; // 50% refund
      }

      return {
        success: true,
        refundPercentage,
        message:
          refundPercentage > 0
            ? `Refund approved: ${refundPercentage}%`
            : 'No refund applicable',
      };
    } catch (error) {
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }
}

module.exports = new CancellationService();
