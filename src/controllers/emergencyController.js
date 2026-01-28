const emergencyService = require('../services/emergencyService');
const allocationService = require('../services/allocationService');

/**
 * Emergency Controller
 * Handles emergency patient requests
 */

class EmergencyController {
  /**
   * Request emergency token
   */
  async requestEmergency(req, res) {
    try {
      const { doctorId, severity, reason, notes } = req.body;

      if (!doctorId || !severity || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Please provide doctorId, severity, and reason',
        });
      }

      const emergencyData = {
        patientId: req.userId,
        doctorId,
        severity,
        reason,
        notes,
      };

      const result = await emergencyService.requestEmergency(emergencyData);

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Emergency request failed: ${error.message}`,
      });
    }
  }

  /**
   * Fast-track emergency patient
   */
  async fastTrackEmergency(req, res) {
    try {
      const { doctorId, reason, notes } = req.body;

      if (!doctorId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Please provide doctorId and reason',
        });
      }

      const emergencyTokenData = {
        patientId: req.userId,
        doctorId,
        reason,
        notes,
      };

      const result = await emergencyService.fastTrackEmergency(emergencyTokenData);

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Fast-track failed: ${error.message}`,
      });
    }
  }

  /**
   * Get current slot
   */
  async getCurrentSlot(req, res) {
    try {
      const { doctorId } = req.query;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Please provide doctorId',
        });
      }

      const result = await emergencyService.getCurrentSlot(doctorId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to get current slot: ${error.message}`,
      });
    }
  }

  /**
   * Get emergency statistics
   */
  async getEmergencyStats(req, res) {
    try {
      const { doctorId } = req.query;

      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Please provide doctorId',
        });
      }

      const result = await emergencyService.getEmergencyStats(doctorId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to get statistics: ${error.message}`,
      });
    }
  }

  /**
   * Override slot rules for emergency
   */
  async overrideSlotRules(req, res) {
    try {
      const { slotId } = req.params;
      const { emergencyLevel } = req.body;

      if (!emergencyLevel) {
        return res.status(400).json({
          success: false,
          message: 'Please provide emergencyLevel (critical, high, medium)',
        });
      }

      const result = await emergencyService.overrideSlotRules(slotId, emergencyLevel);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to override slot rules: ${error.message}`,
      });
    }
  }

  /**
   * Allocate emergency and reallocate if needed
   */
  async allocateEmergency(req, res) {
    try {
      const { doctorId, reason, notes } = req.body;

      if (!doctorId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Please provide doctorId and reason',
        });
      }

      const emergencyTokenData = {
        patientId: req.userId,
        doctorId,
        reason,
        notes,
      };

      const result = await emergencyService.fastTrackEmergency(emergencyTokenData);

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Emergency allocation failed: ${error.message}`,
      });
    }
  }
}

module.exports = new EmergencyController();
