const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

/**
 * Auth Routes
 */

// POST /api/auth/register - Register new user
router.post('/register', authController.register);

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// GET /api/auth/profile - Get current user profile
router.get('/profile', auth, authController.getProfile);

// PUT /api/auth/profile - Update user profile
router.put('/profile', auth, authController.updateProfile);

// POST /api/auth/change-password - Change password
router.post('/change-password', auth, authController.changePassword);

module.exports = router;
