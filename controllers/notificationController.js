const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc    Create a notification
// @route   POST /api/notifications
// @access  Private
const createNotification = asyncHandler(async (req, res) => {
  const { recipient, sender, type, message, relatedTicket, relatedProject } = req.body;

  if (!recipient || !type || !message) {
    return res.status(400).json({ message: 'Recipient, type, and message are required' });
  }

  const notification = await Notification.create({
    recipient,
    sender: sender || req.user._id,
    type,
    message,
    relatedTicket,
    relatedProject,
  });

  res.status(201).json(notification);
});

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .populate('sender', 'name email')
    .populate('relatedTicket', 'title')
    .populate('relatedProject', 'title');

  res.status(200).json(notifications);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  // Ensure the user can only mark their own notifications as read
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json(notification);
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({ message: 'All notifications marked as read' });
});

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};