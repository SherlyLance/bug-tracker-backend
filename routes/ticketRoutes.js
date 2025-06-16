const express = require('express'); // Import Express
const router = express.Router(); // Create an Express Router instance
const {
  createTicket,
  getTicketsByProject,
  getTicketById,
  updateTicket,
  deleteTicket
} = require('../controllers/ticketController'); // Import ticket controller functions
const { protect } = require('../middleware/authMiddleware'); // Import the authentication middleware
const Ticket = require('../models/Ticket'); // Import the Ticket model
const Project = require('../models/Project'); // Import the Project model

// Define routes for tickets. All these routes will be protected.

// POST /api/tickets - Create a new ticket
router.post('/', protect, createTicket);

// GET /api/tickets/project/:projectId - Get all tickets for a specific project
router.get('/project/:projectId', protect, getTicketsByProject);

// GET /api/tickets/ticket/:id - Get a single ticket by its own ID
router.get('/ticket/:id', protect, getTicketById);

// GET /api/tickets/all - Get all tickets user has access to
router.get('/all', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.id },
        { teamMembers: req.user.id }
      ]
    });

    const projectIds = projects.map(project => project._id);

    const tickets = await Ticket.find({ project: { $in: projectIds } })
      .populate('assignee', 'name email')
      .populate('reporter', 'name email');

    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching all tickets' });
  }
});

// PUT /api/tickets/:id - Update a ticket
router.put('/:id', protect, updateTicket);

// DELETE /api/tickets/:id - Delete a ticket
router.delete('/:id', protect, deleteTicket);

module.exports = router; // Export the router
