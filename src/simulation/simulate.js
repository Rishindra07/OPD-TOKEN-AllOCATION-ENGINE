/**
 * Simulation Script
 * Tests the token allocation algorithm with various scenarios
 * Run: node src/simulation/simulate.js
 */

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Slot = require('../models/Slot');
const Token = require('../models/Token');
const Waiting = require('../models/Waiting');
const allocationService = require('../services/allocationService');

let simulationStats = {
  tokensAllocated: 0,
  waitingQueueAdded: 0,
  reallocationsPerformed: 0,
  emergeniesHandled: 0,
};

const runSimulation = async () => {
  try {
    await connectDB();
    console.log('Connected to database for simulation\n');

    // Fetch test data
    const doctors = await Doctor.find().limit(3);
    const patients = await User.find({ role: 'patient' }).limit(5);

    if (doctors.length === 0 || patients.length === 0) {
      console.log('No seed data found. Run: node src/seeds/seedDatabase.js');
      process.exit(1);
    }

    console.log('========================================');
    console.log('OPD TOKEN ALLOCATION SIMULATION');
    console.log('========================================\n');

    const doctor = doctors[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get first slot of the day
    const slots = await Slot.find({
      doctorId: doctor._id,
      date: today,
      status: 'available',
    }).sort({ startTime: 1 });

    if (slots.length === 0) {
      console.log('No slots available for simulation');
      process.exit(1);
    }

    const slot = slots[0];

    console.log(`Doctor: Dr. ${doctor.userId}`);
    console.log(`Slot: ${slot.startTime.toLocaleTimeString()} - ${slot.endTime.toLocaleTimeString()}`);
    console.log(`Max Capacity: ${slot.maxCapacity}\n`);

    // Scenario 1: Fill slot with online bookings
    console.log('--- SCENARIO 1: Fill Slot with Online Bookings ---');
    for (let i = 0; i < 10; i++) {
      const patient = patients[i % patients.length];
      const tokenData = {
        patientId: patient._id,
        doctorId: doctor._id,
        source: 'online',
        preferredSlotId: slot._id,
        appointmentTime: slot.startTime,
        reason: `Online booking ${i + 1}`,
      };

      const result = await allocationService.allocateToken(tokenData);
      if (result.success) {
        simulationStats.tokensAllocated++;
        console.log(`✓ Token ${result.token.tokenNumber} allocated`);
      } else {
        simulationStats.waitingQueueAdded++;
        console.log(
          `✓ Patient added to waiting queue: ${result.waiting.queuePosition}`
        );
      }
    }

    const updatedSlot = await Slot.findById(slot._id);
    console.log(
      `\nSlot Status: ${updatedSlot.status} (${updatedSlot.currentOccupancy}/${updatedSlot.maxCapacity})\n`
    );

    // Scenario 2: Add paid priority patient (should reallocate)
    console.log('--- SCENARIO 2: Add Paid Priority Patient ---');
    const paidPatient = patients[2];
    const paidTokenData = {
      patientId: paidPatient._id,
      doctorId: doctor._id,
      source: 'paid_priority',
      preferredSlotId: slot._id,
      appointmentTime: slot.startTime,
      reason: 'Paid priority booking',
    };

    const paidResult = await allocationService.allocateToken(paidTokenData);
    if (paidResult.success && paidResult.token) {
      simulationStats.tokensAllocated++;
      simulationStats.reallocationsPerformed++;
      console.log(
        `✓ Paid priority token allocated (reallocated lower priority patient)`
      );
      console.log(`  Token: ${paidResult.token.tokenNumber}`);
    }

    // Scenario 3: Add emergency patient
    console.log('\n--- SCENARIO 3: Add Emergency Patient ---');
    const emergencyPatient = patients[3];
    const emergencyData = {
      patientId: emergencyPatient._id,
      doctorId: doctor._id,
      severity: 'critical',
      reason: 'Chest pain',
      notes: 'Critical condition',
    };

    const emergencyResult = await emergencyService.fastTrackEmergency(emergencyData);
    if (emergencyResult.success) {
      simulationStats.emergeniesHandled++;
      console.log(`✓ Emergency token allocated`);
      console.log(`  Token: ${emergencyResult.token.tokenNumber}`);
      console.log(`  Priority Score: ${emergencyResult.token.priorityScore}`);
    }

    // Scenario 4: Cancel a token
    console.log('\n--- SCENARIO 4: Cancel Token and Reallocate ---');
    const tokensInSlot = await Token.find({ slotId: slot._id }).sort({
      createdAt: 1,
    });

    if (tokensInSlot.length > 0) {
      const tokenToCancel = tokensInSlot[0];
      console.log(`Cancelling token: ${tokenToCancel.tokenNumber}`);

      const cancelResult = await allocationService.handleCancellation(
        tokenToCancel._id,
        'Patient requested cancellation'
      );

      if (cancelResult.success) {
        console.log(
          `✓ Token cancelled and slot freed`
        );

        // Check if waiting patient was allocated
        const waitingAfterCancel = await Waiting.findOne({
          doctorId: doctor._id,
          status: 'allocated',
        });

        if (waitingAfterCancel) {
          console.log(
            `✓ Waiting patient automatically allocated to freed slot`
          );
        }
      }
    }

    // Final Statistics
    console.log('\n========================================');
    console.log('SIMULATION STATISTICS');
    console.log('========================================');
    console.log(`Tokens Allocated: ${simulationStats.tokensAllocated}`);
    console.log(`Added to Waiting Queue: ${simulationStats.waitingQueueAdded}`);
    console.log(
      `Reallocations Performed: ${simulationStats.reallocationsPerformed}`
    );
    console.log(`Emergencies Handled: ${simulationStats.emergeniesHandled}`);

    // Final slot state
    const finalSlot = await Slot.findById(slot._id);
    console.log(`\nFinal Slot State:`);
    console.log(`  Status: ${finalSlot.status}`);
    console.log(`  Occupancy: ${finalSlot.currentOccupancy}/${finalSlot.maxCapacity}`);

    const finalWaiting = await Waiting.countDocuments({
      doctorId: doctor._id,
      status: 'waiting',
    });
    console.log(`  Waiting Queue: ${finalWaiting} patients`);

    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Simulation error:', error.message);
    process.exit(1);
  }
};

// Import emergency service for testing
const emergencyService = require('../services/emergencyService');

runSimulation();
