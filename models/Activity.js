const mongoose = require('mongoose');

const activitySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    targetType: {
      type: String, // e.g., 'Project', 'Ticket', 'User'
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // Potentially add ref for specific models if needed, e.g., refPath: 'targetType'
    },
    targetName: {
      type: String, // Store name for display without extra lookup
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: false, // Not all activities might be project-specific
    },
  },
  {
    timestamps: true, // This automatically adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('Activity', activitySchema);