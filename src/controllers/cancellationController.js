const cancellationService = require('../services/cancellationService');
const allocationService = require('../services/allocationService');

/**
 * Cancellation Controller
 * Handles token cancellations
 */

class CancellationController {
  /**
   * Check if cancellation is allowed
   */
  async checkCancellation(req, res) {
    try {
      const { tokenId } = req.params;

      const result = await cancellationService.requestCancellation(tokenId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Cancellation check failed: ${error.message}`,
      });
    }
  }

  /**
   * Cancel token
   */
  async cancelToken(req, res) {
    try {
      const { tokenId } = req.params;
      const { reason } = req.body;

      // Check if cancellation is allowed first
      await cancellationService.requestCancellation(tokenId);

      // Process cancellation
      const result = await cancellationService.processCancellation(tokenId, reason);

      // Attempt reallocation from waiting queue
      const Token = require('../models/Token');
      const token = await Token.findById(tokenId);
      await allocationService.allocateFromWaitingQueue(token.doctorId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Token cancellation failed: ${error.message}`,
      });
    }
  }

  /**
   * Bulk cancel slot
   */
  async bulkCancelSlot(req, res) {
    try {
      const { slotId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Please provide cancellation reason',
        });
      }

      const result = await cancellationService.bulkCancelSlot(slotId, reason);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Bulk cancellation failed: ${error.message}`,
      });
    }
  }

  /**
   * Get cancellation history for patient
   */
  async getCancellationHistory(req, res) {
    try {
      const result = await cancellationService.getCancellationHistory(req.userId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch cancellation history: ${error.message}`,
      });
    }
  }

  /**
   * Get cancellation statistics
   */
  async getCancellationStats(req, res) {
    try {
      const { doctorId } = req.query;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Please provide doctorId',
        });
      }

      const result = await cancellationService.getCancellationStats(doctorId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch statistics: ${error.message}`,
      });
    }
  }

  /**
   * Request refund
   */
  async requestRefund(req, res) {
    try {
      const { tokenId } = req.params;

      const result = await cancellationService.requestRefund(tokenId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Refund processing failed: ${error.message}`,
      });
    }
  }

  /**
   * Handle no-show
   */
  async handleNoShow(req, res) {
    try {
      const { tokenId } = req.params;

      const result = await allocationService.handleNoShow(tokenId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `No-show handling failed: ${error.message}`,
      });
    }
  }
}

module.exports = new CancellationController();
