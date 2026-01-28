const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

/**
 * Emergency Routes
 */

// POST /api/emergency/request - Request emergency token
router.post('/request', auth, emergencyController.requestEmergency);

// POST /api/emergency/fast-track - Fast-track emergency patient
router.post('/fast-track', auth, emergencyController.fastTrackEmergency);

// GET /api/emergency/current-slot - Get current slot for emergency
router.get('/current-slot', emergencyController.getCurrentSlot);

// GET /api/emergency/stats - Get emergency statistics
router.get('/stats', emergencyController.getEmergencyStats);

// PATCH /api/emergency/override/:slotId - Override slot rules
router.patch('/override/:slotId', auth, role('doctor', 'admin'), emergencyController.overrideSlotRules);

// POST /api/emergency/allocate - Allocate emergency token
router.post('/allocate', auth, emergencyController.allocateEmergency);

module.exports = router;
