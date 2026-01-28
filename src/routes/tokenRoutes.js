const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const auth = require('../middleware/auth');

/**
 * Token Routes
 */

// POST /api/tokens - Request new token
router.post('/', auth, tokenController.requestToken);

// GET /api/tokens/:tokenId - Get token details
router.get('/:tokenId', auth, tokenController.getToken);

// GET /api/tokens/patient/my-tokens - Get all patient tokens
router.get('/patient/my-tokens', auth, tokenController.getPatientTokens);

// PATCH /api/tokens/:tokenId/status - Update token status
router.patch('/:tokenId/status', auth, tokenController.updateTokenStatus);

// GET /api/tokens/check/:tokenId - Check token status
router.get('/check/:tokenId', tokenController.checkTokenStatus);

// GET /api/tokens/slot/:slotId - Get tokens for slot
router.get('/slot/:slotId', tokenController.getSlotTokens);

// GET /api/tokens/availability - Get slot availability
router.get('/availability', tokenController.getSlotAvailability);

// GET /api/tokens/waiting-status - Get waiting queue status
router.get('/waiting-status', auth, tokenController.getWaitingStatus);

module.exports = router;
