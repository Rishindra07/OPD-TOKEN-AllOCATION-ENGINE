const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

/**
 * Doctor Routes
 */

// POST /api/doctors/register - Register as doctor
router.post('/register', auth, role('doctor'), doctorController.registerDoctor);

// GET /api/doctors/:doctorId - Get doctor profile
router.get('/:doctorId?', doctorController.getDoctorProfile);

// PUT /api/doctors/profile - Update doctor profile
router.put('/profile', auth, role('doctor'), doctorController.updateDoctorProfile);

// GET /api/doctors - List all doctors
router.get('/', doctorController.listDoctors);

// PATCH /api/doctors/availability - Toggle availability
router.patch('/availability', auth, role('doctor'), doctorController.toggleAvailability);

// GET /api/doctors/:doctorId/slots - Get doctor's slots
router.get('/:doctorId/slots', doctorController.getDoctorSlots);

// GET /api/doctors/:doctorId/stats - Get doctor statistics
router.get('/:doctorId/stats', doctorController.getDoctorStats);

module.exports = router;
