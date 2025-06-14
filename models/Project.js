const mongoose = require('mongoose'); // Import Mongoose

// Define the schema for the Project model
const projectSchema = new mongoose.Schema(
  {
    // Project title (required, trimmed)
    title: {
      type: String,
      required: [true, 'Please add a project title'], // Title is mandatory
      trim: true, // Remove leading/trailing whitespace
    },
    // Project description (optional, trimmed)
    description: {
      type: String,
      trim: true,
      default: '', // Default to an empty string if not provided
    },
    // The user who created this project (references the User model)
    // This establishes a relationship between Project and User.
    owner: {
      type: mongoose.Schema.Types.ObjectId, // Data type is MongoDB ObjectId
      ref: 'User', // References the 'User' model
      required: true, // A project must have an owner
    },
    // Array of team members for this project (references User model)
    // This allows multiple users to be associated with a project.
    teamMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Optional: Project status (e.g., 'active', 'archived', 'on hold')
    status: {
      type: String,
      enum: ['active', 'on hold', 'archived', 'completed'], // Restricted set of values
      default: 'active', // Default status for new projects
    },
  },
  {
    timestamps: true, // Mongoose automatically adds `createdAt` and `updatedAt` fields
  }
);

// Create the Project model from the schema
const Project = mongoose.model('Project', projectSchema);

module.exports = Project; // Export the Project model
