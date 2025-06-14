const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Your auth middleware
const Activity = require('../models/Activity'); // Your Activity model

// @desc    Get recent activities
// @route   GET /api/activities
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Find activities related to projects the user is part of, or direct user activities
    // This is a simplified approach. For complex scenarios, you might need to
    // get all projects first, then filter activities.
    // For now, let's fetch all, and ensure populates work
    const activities = await Activity.find()
      .sort({ createdAt: -1 }) // Sort by most recent
      .limit(50) // Limit to, say, 50 recent activities
      .populate('user', 'name email') // Populate user details
      .populate('project', 'title'); // Populate project title

    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching activities' });
  }
});

module.exports = router;