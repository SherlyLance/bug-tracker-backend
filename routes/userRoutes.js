// In backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  getUsers,
  updateUserRole,
} = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Import authorizeRoles

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Admin-only routes
router.get('/', protect, authorizeRoles('admin'), getUsers); // Get all users, only for admin
router.put('/:id/role', protect, authorizeRoles('admin'), updateUserRole); // Update user role, only for admin

module.exports = router;