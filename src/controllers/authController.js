const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

/**
 * Auth Controller
 * Handles user authentication and authorization
 */

class AuthController {
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      const { name, email, password, role, phone } = req.body;

      // Validate input
      if (!name || !email || !password || !phone) {
        return res
          .status(400)
          .json({ success: false, message: 'Please provide all required fields' });
      }

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, message: 'Email already registered' });
      }

      // Create user
      const user = new User({
        name,
        email,
        password,
        role: role || 'patient',
        phone,
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId: user._id,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Registration failed: ${error.message}`,
      });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res
          .status(400)
          .json({ success: false, message: 'Please provide email and password' });
      }

      // Find user
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid credentials' });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid credentials' });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res
          .status(403)
          .json({ success: false, message: 'User account is inactive' });
      }

      // Generate token
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Login failed: ${error.message}`,
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: 'User not found' });
      }

      // If doctor, also fetch doctor details
      let doctorDetails = null;
      if (user.role === 'doctor') {
        doctorDetails = await Doctor.findOne({ userId: user._id });
      }

      res.json({
        success: true,
        user,
        doctorDetails,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to get profile: ${error.message}`,
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const { name, phone } = req.body;
      const userId = req.userId;

      const user = await User.findByIdAndUpdate(
        userId,
        { name, phone },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Profile update failed: ${error.message}`,
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.userId;

      if (!oldPassword || !newPassword) {
        return res
          .status(400)
          .json({ success: false, message: 'Please provide old and new password' });
      }

      const user = await User.findById(userId).select('+password');

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: 'User not found' });
      }

      // Verify old password
      const isPasswordValid = await user.comparePassword(oldPassword);
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ success: false, message: 'Old password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Password change failed: ${error.message}`,
      });
    }
  }
}

module.exports = new AuthController();
