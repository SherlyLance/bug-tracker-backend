// In controllers/commentController.js
const asyncHandler = require('express-async-handler');
const Comment = require('../models/Comment');
const Ticket = require('../models/Ticket'); // Needed for validation
const Activity = require('../models/Activity'); // For logging activity

// @desc    Get comments for a specific ticket
// @route   GET /api/comments/ticket/:ticketId
// @access  Private
const getCommentsForTicket = asyncHandler(async (req, res) => {
    const comments = await Comment.find({ ticket: req.params.ticketId })
        .populate('user', 'name email') // Populate user details
        .sort({ createdAt: 1 }); // Sort by creation date, ascending

    res.status(200).json(comments);
});

// @desc    Add a comment to a ticket
// @route   POST /api/comments
// @access  Private
const addComment = asyncHandler(async (req, res) => {
    const { ticket, text } = req.body;

    if (!ticket || !text) {
        res.status(400);
        throw new Error('Please include a ticket ID and comment text');
    }

    const ticketExists = await Ticket.findById(ticket);
    if (!ticketExists) {
        res.status(404);
        throw new Error('Ticket not found');
    }

    const comment = await Comment.create({
        ticket,
        user: req.user.id, // User ID from auth middleware
        text,
    });

    // Populate the user field for the response
    const populatedComment = await Comment.findById(comment._id).populate('user', 'name email');

    // Log activity
    await Activity.create({
        user: req.user.id,
        action: 'added a comment',
        targetType: 'Comment',
        targetId: comment._id,
        targetName: ticketExists.title, // Use ticket title as target name
        project: ticketExists.project, // Associate with the ticket's project
    });


    res.status(201).json(populatedComment);
});

module.exports = {
    getCommentsForTicket,
    addComment,
};