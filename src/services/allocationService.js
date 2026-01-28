const { v4: uuidv4 } = require('uuid');
const Token = require('../models/Token');
const Slot = require('../models/Slot');
const Waiting = require('../models/Waiting');
const { calculatePriorityScore, sortByPriority } = require('../utils/priority');

/**
 * OPD Token Allocation Service
 * Handles the core allocation algorithm with priority-based queue management
 */

class AllocationService {
  /**
   * Allocate token to appropriate slot
   * Core algorithm: Assign to preferred slot if available, else reallocate
   */
  async allocateToken(tokenData) {
    const {
      patientId,
      doctorId,
      source,
      preferredSlotId,
      appointmentTime,
      reason,
      notes,
    } = tokenData;

    try {
      // Step 1: Calculate priority score
      const priorityScore = calculatePriorityScore(source);

      // Step 2: Check if preferred slot exists and has capacity
      let targetSlot = null;
      
      if (preferredSlotId) {
        targetSlot = await Slot.findById(preferredSlotId);
        
        // Verify slot belongs to correct doctor
        if (targetSlot && !targetSlot.doctorId.equals(doctorId)) {
          throw new Error('Slot does not belong to selected doctor');
        }

        // Check if slot has capacity
        if (targetSlot && targetSlot.currentOccupancy >= targetSlot.maxCapacity) {
          // Slot is full - try reallocation
          targetSlot = null;
        }
      }

      // Step 3: If preferred slot unavailable, find next available slot
      if (!targetSlot) {
        targetSlot = await this.findAvailableSlot(doctorId, appointmentTime, source);
      }

      // Step 4: If no slot available, add to waiting queue
      if (!targetSlot) {
        return await this.addToWaitingQueue(
          patientId,
          doctorId,
          source,
          priorityScore,
          appointmentTime,
          reason,
          notes
        );
      }

      // Step 5: Check if reallocation is needed (slot would exceed capacity with lower priority)
      if (targetSlot.currentOccupancy >= targetSlot.maxCapacity) {
        // Slot is at capacity - need to reallocate lower priority token
        const reallocated = await this.reallocateLowerPriorityToken(
          targetSlot,
          priorityScore,
          patientId,
          doctorId
        );

        if (!reallocated) {
          // Could not reallocate, add to waiting queue
          return await this.addToWaitingQueue(
            patientId,
            doctorId,
            source,
            priorityScore,
            appointmentTime,
            reason,
            notes
          );
        }
      }

      // Step 6: Create token and allocate to slot
      const tokenNumber = this.generateTokenNumber(doctorId);
      const token = new Token({
        tokenNumber,
        patientId,
        doctorId,
        slotId: targetSlot._id,
        source,
        priorityScore,
        appointmentTime,
        reason,
        notes,
        isReallocation: preferredSlotId && !preferredSlotId.equals(targetSlot._id),
        originalSlotId: preferredSlotId,
      });

      await token.save();

      // Step 7: Update slot
      targetSlot.allocatedTokens.push(token._id);
      targetSlot.currentOccupancy += 1;
      
      if (targetSlot.currentOccupancy >= targetSlot.maxCapacity) {
        targetSlot.status = 'full';
      }

      await targetSlot.save();

      return {
        success: true,
        token,
        slotId: targetSlot._id,
        message: 'Token allocated successfully',
      };
    } catch (error) {
      throw new Error(`Token allocation failed: ${error.message}`);
    }
  }

  /**
   * Find next available slot for a doctor starting from preferred date/time
   */
  async findAvailableSlot(doctorId, preferredTime, source) {
    try {
      const minPriorityForReallocation = this.getMinPriorityForReallocation(source);

      // First: Try to find slot with actual capacity
      let slot = await Slot.findOne({
        doctorId,
        date: { $gte: new Date(preferredTime) },
        status: { $in: ['available', 'full'] },
        currentOccupancy: { $lt: '$maxCapacity' },
      }).sort({ date: 1, startTime: 1 });

      if (slot) {
        return slot;
      }

      // Second: Try to find full slot where reallocation is possible
      slot = await Slot.findOne({
        doctorId,
        date: { $gte: new Date(preferredTime) },
        status: 'full',
        currentOccupancy: { $gte: '$maxCapacity' },
      })
        .sort({ date: 1, startTime: 1 })
        .populate('allocatedTokens');

      if (slot && slot.allocatedTokens.length > 0) {
        // Check if we can reallocate from this slot
        const lowestPriorityToken = sortByPriority(slot.allocatedTokens)[
          slot.allocatedTokens.length - 1
        ];

        if (lowestPriorityToken.priorityScore < minPriorityForReallocation) {
          return slot;
        }
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to find available slot: ${error.message}`);
    }
  }

  /**
   * Reallocate lower priority token to next available slot
   */
  async reallocateLowerPriorityToken(slot, newTokenPriority, newPatientId, doctorId) {
    try {
      const tokens = await Token.find({
        slotId: slot._id,
        status: { $in: ['booked', 'checked_in'] },
      });

      if (tokens.length === 0) {
        return false;
      }

      // Sort by priority and find the lowest priority token
      const sortedTokens = sortByPriority(tokens);
      const lowestPriorityToken = sortedTokens[sortedTokens.length - 1];

      // Only reallocate if new token has higher priority
      if (lowestPriorityToken.priorityScore >= newTokenPriority) {
        return false;
      }

      // Find next available slot for the displaced token
      const nextSlot = await this.findNextAvailableSlotAfter(
        slot.date,
        doctorId
      );

      if (!nextSlot) {
        return false;
      }

      // Reallocate the token
      lowestPriorityToken.slotId = nextSlot._id;
      lowestPriorityToken.appointmentTime = nextSlot.startTime;
      lowestPriorityToken.isReallocation = true;
      lowestPriorityToken.originalSlotId = slot._id;

      await lowestPriorityToken.save();

      // Update slots
      slot.allocatedTokens = slot.allocatedTokens.filter(
        (id) => !id.equals(lowestPriorityToken._id)
      );
      slot.currentOccupancy -= 1;
      if (slot.status === 'full' && slot.currentOccupancy < slot.maxCapacity) {
        slot.status = 'available';
      }
      await slot.save();

      nextSlot.allocatedTokens.push(lowestPriorityToken._id);
      nextSlot.currentOccupancy += 1;
      if (nextSlot.currentOccupancy >= nextSlot.maxCapacity) {
        nextSlot.status = 'full';
      }
      await nextSlot.save();

      return true;
    } catch (error) {
      console.error('Reallocation error:', error.message);
      return false;
    }
  }

  /**
   * Find next available slot after a given date
   */
  async findNextAvailableSlotAfter(date, doctorId) {
    return await Slot.findOne({
      doctorId,
      date: { $gt: new Date(date) },
      status: { $in: ['available'] },
      currentOccupancy: { $lt: '$maxCapacity' },
    }).sort({ date: 1, startTime: 1 });
  }

  /**
   * Add patient to waiting queue if no slot available
   */
  async addToWaitingQueue(
    patientId,
    doctorId,
    source,
    priorityScore,
    preferredDate,
    reason,
    notes
  ) {
    try {
      // Get current queue position
      const queueCount = await Waiting.countDocuments({
        doctorId,
        status: 'waiting',
      });

      const waiting = new Waiting({
        patientId,
        doctorId,
        source,
        priorityScore,
        preferredDate,
        reason,
        notes,
        queuePosition: queueCount + 1,
        status: 'waiting',
      });

      await waiting.save();

      return {
        success: true,
        waiting,
        message: `No slot available. Added to waiting queue at position ${queueCount + 1}`,
      };
    } catch (error) {
      throw new Error(`Failed to add to waiting queue: ${error.message}`);
    }
  }

  /**
   * Handle cancellation and reallocate slots
   */
  async handleCancellation(tokenId, cancellationReason) {
    try {
      const token = await Token.findById(tokenId);

      if (!token) {
        throw new Error('Token not found');
      }

      if (['completed', 'cancelled', 'no_show'].includes(token.status)) {
        throw new Error('Cannot cancel a completed, already cancelled, or no-show token');
      }

      // Update token status
      token.status = 'cancelled';
      token.cancellationReason = cancellationReason;
      await token.save();

      // Free up the slot
      const slot = await Slot.findById(token.slotId);
      if (slot) {
        slot.allocatedTokens = slot.allocatedTokens.filter(
          (id) => !id.equals(token._id)
        );
        slot.currentOccupancy -= 1;
        if (slot.status === 'full') {
          slot.status = 'available';
        }
        await slot.save();
      }

      // Try to allocate from waiting queue
      await this.allocateFromWaitingQueue(token.doctorId);

      return {
        success: true,
        message: 'Token cancelled and slot reallocated',
      };
    } catch (error) {
      throw new Error(`Cancellation handling failed: ${error.message}`);
    }
  }

  /**
   * Allocate tokens from waiting queue to newly available slots
   */
  async allocateFromWaitingQueue(doctorId) {
    try {
      const waitingPatients = await Waiting.find({
        doctorId,
        status: 'waiting',
      }).sort({ priorityScore: -1, queuePosition: 1 });

      for (const waiting of waitingPatients) {
        const slot = await this.findAvailableSlot(
          doctorId,
          waiting.preferredDate || new Date(),
          waiting.source
        );

        if (!slot) {
          break; // No more available slots
        }

        // Allocate token
        const tokenNumber = this.generateTokenNumber(doctorId);
        const token = new Token({
          tokenNumber,
          patientId: waiting.patientId,
          doctorId,
          slotId: slot._id,
          source: waiting.source,
          priorityScore: waiting.priorityScore,
          appointmentTime: slot.startTime,
          reason: waiting.reason,
          notes: waiting.notes,
        });

        await token.save();

        // Update slot
        slot.allocatedTokens.push(token._id);
        slot.currentOccupancy += 1;
        if (slot.currentOccupancy >= slot.maxCapacity) {
          slot.status = 'full';
        }
        await slot.save();

        // Update waiting record
        waiting.status = 'allocated';
        waiting.allocatedTokenId = token._id;
        await waiting.save();

        // Update queue positions for remaining patients
        await this.updateQueuePositions(doctorId);
      }
    } catch (error) {
      console.error('Failed to allocate from waiting queue:', error.message);
    }
  }

  /**
   * Update queue positions after allocation or cancellation
   */
  async updateQueuePositions(doctorId) {
    const waitingPatients = await Waiting.find({
      doctorId,
      status: 'waiting',
    }).sort({ queuePosition: 1 });

    for (let i = 0; i < waitingPatients.length; i++) {
      waitingPatients[i].queuePosition = i + 1;
      await waitingPatients[i].save();
    }
  }

  /**
   * Handle no-show
   */
  async handleNoShow(tokenId) {
    try {
      const token = await Token.findById(tokenId);

      if (!token) {
        throw new Error('Token not found');
      }

      // Mark as no-show
      token.status = 'no_show';
      await token.save();

      // Free up the slot
      const slot = await Slot.findById(token.slotId);
      if (slot) {
        slot.allocatedTokens = slot.allocatedTokens.filter(
          (id) => !id.equals(token._id)
        );
        slot.currentOccupancy -= 1;
        if (slot.status === 'full') {
          slot.status = 'available';
        }
        await slot.save();
      }

      // Allocate from waiting queue
      await this.allocateFromWaitingQueue(token.doctorId);

      return {
        success: true,
        message: 'Marked as no-show and slot reallocated',
      };
    } catch (error) {
      throw new Error(`No-show handling failed: ${error.message}`);
    }
  }

  /**
   * Handle emergency token
   */
  async handleEmergency(emergencyTokenData) {
    try {
      const { patientId, doctorId, reason, notes } = emergencyTokenData;

      // Get current slot or create emergency allocation
      const now = new Date();
      const currentSlot = await Slot.findOne({
        doctorId,
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: { $in: ['available', 'full'] },
      });

      if (!currentSlot) {
        throw new Error('No active slot for emergency');
      }

      const priorityScore = calculatePriorityScore('emergency');

      // If slot is full, reallocate the lowest priority patient
      if (currentSlot.currentOccupancy >= currentSlot.maxCapacity) {
        const reallocated = await this.reallocateLowerPriorityToken(
          currentSlot,
          priorityScore,
          patientId,
          doctorId
        );

        if (!reallocated) {
          throw new Error('Cannot accommodate emergency - unable to reallocate');
        }
      }

      // Create emergency token
      const tokenNumber = this.generateTokenNumber(doctorId, 'EMG');
      const token = new Token({
        tokenNumber,
        patientId,
        doctorId,
        slotId: currentSlot._id,
        source: 'emergency',
        priorityScore,
        appointmentTime: new Date(),
        reason,
        notes,
      });

      await token.save();

      currentSlot.allocatedTokens.push(token._id);
      currentSlot.currentOccupancy += 1;
      if (currentSlot.currentOccupancy >= currentSlot.maxCapacity) {
        currentSlot.status = 'full';
      }
      await currentSlot.save();

      return {
        success: true,
        token,
        message: 'Emergency token allocated',
      };
    } catch (error) {
      throw new Error(`Emergency handling failed: ${error.message}`);
    }
  }

  /**
   * Get minimum priority for allowing reallocation
   */
  getMinPriorityForReallocation(source) {
    const priorityMap = {
      emergency: 90,
      paid_priority: 70,
      follow_up: 50,
      online: 30,
      walk_in: 10,
    };
    return priorityMap[source] || 0;
  }

  /**
   * Generate unique token number
   */
  generateTokenNumber(doctorId, prefix = 'TKN') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}`;
  }
}

module.exports = new AllocationService();
