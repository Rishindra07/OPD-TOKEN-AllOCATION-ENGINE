const Waiting = require('../models/Waiting');

/**
 * Waiting Queue Service
 * Manages waiting queue operations and allocations
 */

class WaitingQueueService {
  /**
   * Get waiting queue for a doctor
   */
  async getWaitingQueue(doctorId) {
    try {
      const waitingList = await Waiting.find({
        doctorId,
        status: 'waiting',
      })
        .populate('patientId', 'name email phone')
        .sort({ queuePosition: 1 });

      return {
        success: true,
        count: waitingList.length,
        data: waitingList,
      };
    } catch (error) {
      throw new Error(`Failed to get waiting queue: ${error.message}`);
    }
  }

  /**
   * Get patient position in queue
   */
  async getQueuePosition(patientId, doctorId) {
    try {
      const waiting = await Waiting.findOne({
        patientId,
        doctorId,
        status: 'waiting',
      });

      if (!waiting) {
        return {
          success: false,
          message: 'Patient not in waiting queue',
        };
      }

      return {
        success: true,
        queuePosition: waiting.queuePosition,
        estimatedWaitTime: this.estimateWaitTime(waiting.queuePosition),
      };
    } catch (error) {
      throw new Error(`Failed to get queue position: ${error.message}`);
    }
  }

  /**
   * Estimate wait time based on queue position
   * Assuming average 15 minutes per patient
   */
  estimateWaitTime(queuePosition) {
    const avgTimePerPatient = 15; // in minutes
    return (queuePosition - 1) * avgTimePerPatient;
  }

  /**
   * Cancel waiting entry
   */
  async cancelWaiting(waitingId, reason) {
    try {
      const waiting = await Waiting.findByIdAndUpdate(
        waitingId,
        {
          status: 'cancelled',
          cancellationReason: reason,
        },
        { new: true }
      );

      if (!waiting) {
        throw new Error('Waiting entry not found');
      }

      // Update queue positions
      await this.updateQueuePositions(waiting.doctorId);

      return {
        success: true,
        message: 'Waiting entry cancelled',
      };
    } catch (error) {
      throw new Error(`Failed to cancel waiting: ${error.message}`);
    }
  }

  /**
   * Move waiting patient to specific position
   */
  async movePatientInQueue(waitingId, newPosition) {
    try {
      const waiting = await Waiting.findById(waitingId);

      if (!waiting) {
        throw new Error('Waiting entry not found');
      }

      const oldPosition = waiting.queuePosition;
      waiting.queuePosition = newPosition;
      await waiting.save();

      // Update queue positions for affected patients
      const affectedWaiting = await Waiting.find({
        doctorId: waiting.doctorId,
        status: 'waiting',
        queuePosition: {
          $gte: Math.min(oldPosition, newPosition),
          $lte: Math.max(oldPosition, newPosition),
        },
        _id: { $ne: waitingId },
      });

      if (oldPosition < newPosition) {
        // Moving down in queue - shift others up
        for (const w of affectedWaiting) {
          w.queuePosition -= 1;
          await w.save();
        }
      } else {
        // Moving up in queue - shift others down
        for (const w of affectedWaiting) {
          w.queuePosition += 1;
          await w.save();
        }
      }

      return {
        success: true,
        message: `Patient moved to position ${newPosition}`,
      };
    } catch (error) {
      throw new Error(`Failed to move patient in queue: ${error.message}`);
    }
  }

  /**
   * Update queue positions after changes
   */
  async updateQueuePositions(doctorId) {
    try {
      const waitingList = await Waiting.find({
        doctorId,
        status: 'waiting',
      }).sort({ queuePosition: 1 });

      for (let i = 0; i < waitingList.length; i++) {
        waitingList[i].queuePosition = i + 1;
        await waitingList[i].save();
      }
    } catch (error) {
      console.error('Failed to update queue positions:', error.message);
    }
  }

  /**
   * Clean expired waiting entries
   */
  async cleanExpiredEntries() {
    try {
      const now = new Date();
      const result = await Waiting.updateMany(
        {
          status: 'waiting',
          expiresAt: { $lt: now },
        },
        { status: 'expired' }
      );

      return {
        success: true,
        expiredCount: result.modifiedCount,
      };
    } catch (error) {
      throw new Error(`Failed to clean expired entries: ${error.message}`);
    }
  }

  /**
   * Get waiting queue statistics
   */
  async getQueueStats(doctorId) {
    try {
      const stats = await Waiting.aggregate([
        {
          $match: { doctorId, status: 'waiting' },
        },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            avgPriority: { $avg: '$priorityScore' },
          },
        },
      ]);

      return {
        success: true,
        totalWaiting: await Waiting.countDocuments({
          doctorId,
          status: 'waiting',
        }),
        bySource: stats,
      };
    } catch (error) {
      throw new Error(`Failed to get queue statistics: ${error.message}`);
    }
  }
}

module.exports = new WaitingQueueService();
