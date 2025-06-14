const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // System notifications might not have a sender
    },
    type: {
      type: String,
      enum: ['TICKET_ASSIGNED', 'TICKET_UPDATED', 'COMMENT_ADDED', 'DUE_DATE_REMINDER', 'MENTION'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedTicket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: false, // Not all notifications might be ticket-related
    },
    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);