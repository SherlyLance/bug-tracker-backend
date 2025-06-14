const express = require('express'); // Import Express
const router = express.Router(); // Create an Express Router instance
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember
} = require('../controllers/projectController'); // Import project controller functions
const { protect } = require('../middleware/authMiddleware'); // Import the authentication middleware

// Define routes for projects. All these routes will be protected.

// POST /api/projects - Create a new project
// GET /api/projects - Get all projects for the authenticated user
router.route('/').post(protect, createProject).get(protect, getProjects);

// GET /api/projects/:id - Get a single project by ID
// PUT /api/projects/:id - Update a project by ID
// DELETE /api/projects/:id - Delete a project by ID
router
  .route('/:id')
  .get(protect, getProjectById)
  .put(protect, updateProject)
  .delete(protect, deleteProject); // Requires project owner role

// PUT /api/projects/:id/add-member - Add a team member to a project
router.route('/:id/add-member').put(protect, addTeamMember);

// PUT /api/projects/:id/remove-member - Remove a team member from a project
router.route('/:id/remove-member').put(protect, removeTeamMember);


module.exports = router; // Export the router
