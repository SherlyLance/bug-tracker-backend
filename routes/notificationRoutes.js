const express = require('express');
const router = express.Router();
const {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.route('/')
  .get(protect, getUserNotifications)
  .post(protect, createNotification);

router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);

module.exports = router;