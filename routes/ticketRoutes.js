const express = require('express'); // Import Express
const router = express.Router(); // Create an Express Router instance
const {
  createTicket,
  getTicketsByProject,
  getTicketById,
  updateTicket,
  deleteTicket,
} = require('../controllers/ticketController'); // Import ticket controller functions
const { protect } = require('../middleware/authMiddleware'); // Import the authentication middleware

// Define routes for tickets. All these routes will be protected.

// POST /api/tickets - Create a new ticket
router.post('/', protect, createTicket);

// GET /api/tickets/:projectId - Get all tickets for a specific project
router.get('/:projectId', protect, getTicketsByProject);

// GET /api/tickets/single/:id - Get a single ticket by its own ID
// Note: We use 'single' to differentiate from the projectId route above.
router.get('/single/:id', protect, getTicketById);

// In your ticketRoutes.js or similar file
router.get('/all', protect, async (req, res) => {
  try {
    // Find all projects where the user is an owner or team member
    const projects = await Project.find({
      $or: [
        { owner: req.user.id }, // req.user.id comes from your protect middleware
        { teamMembers: req.user.id }
      ]
    });

    // Get all ticket IDs from these projects
    const projectIds = projects.map(project => project._id);

    // Find all tickets associated with these project IDs
    const tickets = await Ticket.find({ project: { $in: projectIds } })
                                .populate('assignee', 'name email') // Populate assignee details
                                .populate('reporter', 'name email'); // Populate reporter details

    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching all tickets' });
  }
});

// PUT /api/tickets/:id - Update a ticket by ID
// DELETE /api/tickets/:id - Delete a ticket by ID
router
  .route('/:id')
  .put(protect, updateTicket)
  .delete(protect, deleteTicket);

module.exports = router; // Export the router