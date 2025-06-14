// In routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Your auth middleware
const { getCommentsForTicket, addComment } = require('../controllers/commentController');

router.route('/ticket/:ticketId').get(protect, getCommentsForTicket);
router.route('/').post(protect, addComment);

module.exports = router;