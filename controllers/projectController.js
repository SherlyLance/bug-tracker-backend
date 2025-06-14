const asyncHandler = require('express-async-handler');
const Project = require('../models/Project'); // Import the Project model
const User = require('../models/User');     // Import the User model (for team members)

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
 const createProject = asyncHandler(async (req, res) => {
  const { title, description, teamMembers } = req.body; // Get data from request body

  // Input validation
  if (!title) {
    return res.status(400).json({ message: 'Project title is required' });
  }

  try {
    // req.user._id is populated by the 'protect' middleware
    const project = await Project.create({
      title,
      description,
      owner: req.user._id, // Set the owner as the currently logged-in user
      // If teamMembers are provided, ensure they are valid User IDs
      teamMembers: teamMembers && Array.isArray(teamMembers) ? teamMembers : [],
    });

    // Add the owner to the teamMembers list if not already present
    // We'll convert owner to string for comparison as teamMembers might be strings
    if (!project.teamMembers.includes(req.user._id.toString())) {
        project.teamMembers.push(req.user._id);
        await project.save(); // Save the updated project
    }


    // Optionally, if you want to also add the project to the owner's user document
    // (though not strictly necessary for this schema, good for future expansion)
    // await User.findByIdAndUpdate(req.user._id, { $push: { projects: project._id } });

    res.status(201).json(project); // Send back the created project
  } catch (error) {
    console.error('Error creating project:', error);
    // Handle validation errors or other MongoDB errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error creating project' });
  }

 
  const project = await Project.create({
    title,
    description,
    owner: req.user.id, // User ID from auth middleware
  });

  // Log activity
  await Activity.create({
    user: req.user.id,
    action: `created project`,
    targetType: 'Project',
    targetId: project._id,
    targetName: project.title,
    project: project._id,
  });

  res.status(201).json(project);
});

// @desc    Get all projects for the authenticated user (either as owner or team member)
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    // Find projects where the current user is either the owner or a team member
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { teamMembers: req.user._id }
      ]
    })
    .populate('owner', 'name email') // Populate owner details (name, email)
    .populate('teamMembers', 'name email'); // Populate team member details (name, email)

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
};

// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('teamMembers', 'name email');

    // Check if project exists
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if the current user is authorized to view this project
    // User must be the owner or a team member
    const isOwner = project.owner._id.toString() === req.user._id.toString();
    const isTeamMember = project.teamMembers.some(member => member._id.toString() === req.user._id.toString());

    if (!isOwner && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to view this project' });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    // If the ID format is invalid
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Project not found (Invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error fetching project' });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  const { title, description, status, teamMembers } = req.body;

  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only the owner can update the project details
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    // Update fields if provided
    project.title = title || project.title;
    project.description = description || project.description;
    project.status = status || project.status;

    // Handle teamMembers update carefully:
    // If teamMembers array is explicitly provided, replace it.
    // Ensure owner is always in teamMembers.
    if (teamMembers !== undefined) {
      let updatedMembers = Array.isArray(teamMembers) ? teamMembers.map(String) : [];
      // Ensure the owner is always included in the teamMembers array
      if (!updatedMembers.includes(req.user._id.toString())) {
        updatedMembers.push(req.user._id.toString());
      }
      project.teamMembers = updatedMembers;
    } else {
        // If teamMembers is not provided in the request body,
        // ensure owner is still a member if not already
        if (!project.teamMembers.includes(req.user._id)) {
            project.teamMembers.push(req.user._id);
        }
    }


    const updatedProject = await project.save(); // Save the updated project

    res.status(200).json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Project not found (Invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error updating project' });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only the owner can delete the project
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }

    await project.deleteOne(); // Use deleteOne() for Mongoose 6+

    res.status(200).json({ message: 'Project removed' });
  } catch (error) {
    console.error('Error deleting project:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Project not found (Invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error deleting project' });
  }
};

// @desc    Add a team member to a project
// @route   PUT /api/projects/:id/add-member
// @access  Private (Owner only)
const addTeamMember = async (req, res) => {
    const { userId } = req.body; // The ID of the user to add

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required to add a member' });
    }

    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only the project owner can add members
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to add members to this project' });
        }

        // Check if the user to be added actually exists
        const userToAdd = await User.findById(userId);
        if (!userToAdd) {
            return res.status(404).json({ message: 'User to add not found' });
        }

        // Check if the user is already a team member
        if (project.teamMembers.includes(userId)) {
            return res.status(400).json({ message: 'User is already a team member' });
        }

        // Add the new member
        project.teamMembers.push(userId);
        await project.save();

        // Populate the added member's details for the response
        await project.populate('teamMembers', 'name email');

        res.status(200).json(project);
    } catch (error) {
        console.error('Error adding team member:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Project ID or User ID format' });
        }
        res.status(500).json({ message: 'Server error adding team member' });
    }
};

// @desc    Remove a team member from a project
// @route   PUT /api/projects/:id/remove-member
// @access  Private (Owner only)
const removeTeamMember = async (req, res) => {
    const { userId } = req.body; // The ID of the user to remove

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required to remove a member' });
    }

    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Only the project owner can remove members
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to remove members from this project' });
        }

        // Prevent owner from removing themselves from teamMembers (they are the owner)
        if (project.owner.toString() === userId.toString()) {
            return res.status(400).json({ message: 'Cannot remove the project owner from team members' });
        }

        // Filter out the member to be removed
        const initialLength = project.teamMembers.length;
        project.teamMembers = project.teamMembers.filter(
            (member) => member.toString() !== userId.toString()
        );

        if (project.teamMembers.length === initialLength) {
            return res.status(404).json({ message: 'User not found in team members' });
        }

        await project.save();

        // Populate the remaining members for the response
        await project.populate('teamMembers', 'name email');

        res.status(200).json(project);
    } catch (error) {
        console.error('Error removing team member:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Project ID or User ID format' });
        }
        res.status(500).json({ message: 'Server error removing team member' });
    }
};


module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember
};
