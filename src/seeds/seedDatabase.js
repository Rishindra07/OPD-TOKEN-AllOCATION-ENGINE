/**
 * Database Seed Script
 * Creates sample data for testing the OPD Token Allocation Engine
 * Run: node src/seeds/seedDatabase.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Slot = require('../models/Slot');
const connectDB = require('../config/db');

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Database connected for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Slot.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@opd.com',
      password: 'admin123',
      role: 'admin',
      phone: '9876543210',
    });
    await admin.save();
    console.log('Admin user created:', admin.email);

    // Create receptionist user
    const receptionist = new User({
      name: 'Receptionist',
      email: 'receptionist@opd.com',
      password: 'receptionist123',
      role: 'receptionist',
      phone: '9876543211',
    });
    await receptionist.save();
    console.log('Receptionist user created:', receptionist.email);

    // Create 3 doctors
    const doctorUsers = [];
    const doctors = [];

    for (let i = 1; i <= 3; i++) {
      const doctorUser = new User({
        name: `Dr. Doctor ${i}`,
        email: `doctor${i}@opd.com`,
        password: 'doctor123',
        role: 'doctor',
        phone: `987654321${i}`,
      });
      await doctorUser.save();
      doctorUsers.push(doctorUser);

      const specializations = [
        'General',
        'Cardiologist',
        'Dermatologist',
      ];
      const doctor = new Doctor({
        userId: doctorUser._id,
        specialization: specializations[i - 1],
        licenseNumber: `LIC-00${i}`,
        department: 'Medical',
        qualifications: 'MBBS, MD',
        experience: 5 + i,
        averageConsultationTime: 15,
        workingDays: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
        ],
      });
      await doctor.save();
      doctors.push(doctor);
      console.log(`Doctor ${i} created: ${doctorUser.email}`);
    }

    // Create slots for each doctor
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 0; d < 7; d++) {
      const slotDate = new Date(today);
      slotDate.setDate(slotDate.getDate() + d);

      const dayName = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ][slotDate.getDay()];

      for (const doctor of doctors) {
        // Create 4 slots per doctor per day (9-10, 10-11, 11-12, 12-1)
        for (let slot = 0; slot < 4; slot++) {
          const startTime = new Date(slotDate);
          startTime.setHours(9 + slot, 0, 0, 0);

          const endTime = new Date(slotDate);
          endTime.setHours(10 + slot, 0, 0, 0);

          const newSlot = new Slot({
            doctorId: doctor._id,
            startTime,
            endTime,
            maxCapacity: 10,
            currentOccupancy: 0,
            status: 'available',
            day: dayName,
            date: slotDate,
          });

          await newSlot.save();
        }
      }
    }

    console.log('Slots created for all doctors');

    // Create sample patients
    const patients = [];
    for (let i = 1; i <= 5; i++) {
      const patient = new User({
        name: `Patient ${i}`,
        email: `patient${i}@opd.com`,
        password: 'patient123',
        role: 'patient',
        phone: `888888888${i}`,
      });
      await patient.save();
      patients.push(patient);
      console.log(`Patient ${i} created: ${patient.email}`);
    }

    console.log('\n========================================');
    console.log('Database seeding completed successfully!');
    console.log('========================================');
    console.log('\nTest Credentials:');
    console.log('Admin - admin@opd.com / admin123');
    console.log('Doctor 1 - doctor1@opd.com / doctor123');
    console.log('Doctor 2 - doctor2@opd.com / doctor123');
    console.log('Doctor 3 - doctor3@opd.com / doctor123');
    console.log('Patient 1 - patient1@opd.com / patient123');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
