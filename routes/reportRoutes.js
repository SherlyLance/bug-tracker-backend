const express = require('express');
const router = express.Router();
const {
  getProjectReport,
  getUserWorkloadReport,
  exportTicketsCSV,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.get('/project/:projectId', protect, getProjectReport);
router.get('/user/:userId', protect, getUserWorkloadReport);
router.get('/export/tickets/:projectId', protect, exportTicketsCSV);

module.exports = router;