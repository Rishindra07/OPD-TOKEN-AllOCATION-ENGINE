const express = require('express');
const router = express.Router();
const cancellationController = require('../controllers/cancellationController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

/**
 * Cancellation Routes
 */

// GET /api/cancellations/check/:tokenId - Check if cancellation is allowed
router.get('/check/:tokenId', cancellationController.checkCancellation);

// DELETE /api/cancellations/:tokenId - Cancel token
router.delete('/:tokenId', auth, cancellationController.cancelToken);

// POST /api/cancellations/bulk/:slotId - Bulk cancel slot
router.post('/bulk/:slotId', auth, role('doctor', 'admin'), cancellationController.bulkCancelSlot);

// GET /api/cancellations/history - Get cancellation history
router.get('/history', auth, cancellationController.getCancellationHistory);

// GET /api/cancellations/stats - Get cancellation statistics
router.get('/stats', cancellationController.getCancellationStats);

// POST /api/cancellations/refund/:tokenId - Request refund
router.post('/refund/:tokenId', auth, cancellationController.requestRefund);

// POST /api/cancellations/no-show/:tokenId - Handle no-show
router.post('/no-show/:tokenId', auth, role('doctor', 'admin'), cancellationController.handleNoShow);

module.exports = router;
