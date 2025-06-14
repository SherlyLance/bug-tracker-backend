const mongoose = require('mongoose'); // Import Mongoose

// Define the schema for the Ticket model
const ticketSchema = new mongoose.Schema(
  {
    // The project this ticket belongs to
    project: {
      type: mongoose.Schema.Types.ObjectId, // References the Project model
      ref: 'Project',
      required: true, // Every ticket must belong to a project
    },
    // Title/Summary of the ticket (e.g., "Login button not working")
    title: {
      type: String,
      required: [true, 'Please add a ticket title'],
      trim: true,
    },
    // Detailed description of the bug/feature request
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Current status of the ticket in the Kanban board
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Done', 'Blocked'], // Define possible statuses
      default: 'To Do', // New tickets start as 'To Do'
    },
    // Priority level of the ticket
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'], // Define possible priorities
      default: 'Medium', // Default priority
    },
    // User assigned to resolve this ticket (references the User model)
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // A ticket might not have an assignee initially
    },
    // User who reported/created this ticket (references the User model)
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Every ticket must have a reporter
    },
    // Type of ticket (e.g., 'Bug', 'Feature', 'Task')
    type: {
      type: String,
      enum: ['Bug', 'Feature', 'Task'],
      default: 'Bug',
    },
    // Optional: Due date for the ticket
    dueDate: {
      type: Date,
      default: null,
    },
    // Optional: Attachments (e.g., screenshots, logs - we'll keep this simple for now,
    // later this might be an array of image URLs if Multer is used)
    attachments: [
      {
        url: String,
        filename: String,
      },
    ],
  },
  {
    timestamps: true, // Mongoose automatically adds `createdAt` and `updatedAt` fields
  }
);

// Create the Ticket model from the schema
const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket; // Export the Ticket model
