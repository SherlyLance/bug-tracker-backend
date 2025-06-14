// backend/controllers/ticketController.js
const asyncHandler = require('express-async-handler');
const Ticket = require('../models/Ticket');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');

// Helper function to check if a user is a member of a project
const isProjectMember = async (projectId, userId) => {
    const project = await Project.findById(projectId);
    if (!project) return false;

    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.teamMembers.some(member => member.toString() === userId.toString());

    return isOwner || isMember;
};

// Helper function to emit socket events
const emitSocketEvent = (event, data) => {
  try {
    const io = require('../socket').getIO();
    if (io) {
      io.to(`project-${data.project}`).emit(event, data);
    }
  } catch (error) {
    console.error('Socket emission error:', error);
  }
};

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private
const createTicket = asyncHandler(async (req, res) => {
  const { project: projectId, title, description, status, priority, assignee, type, dueDate } = req.body;

  if (!projectId || !title) {
    res.status(400);
    throw new Error('Project ID and Title are required');
  }

  const projectExists = await Project.findById(projectId);
  if (!projectExists) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (!await isProjectMember(projectId, req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to create tickets in this project');
  }

  let validatedAssignee = null;
  if (assignee) {
      const assigneeUser = await User.findById(assignee);
      if (!assigneeUser) {
          res.status(400);
          throw new Error('Assignee user not found');
      }
      if (!await isProjectMember(projectId, assignee)) {
          res.status(400);
          throw new Error('Assignee is not a member of this project');
      }
      validatedAssignee = assignee;
  }

  const ticket = await Ticket.create({
    project: projectId,
    title,
    description,
    status: status || 'To Do',
    priority: priority || 'Medium',
    assignee: validatedAssignee,
    reporter: req.user._id,
    type: type || 'Bug',
    dueDate: dueDate || null,
  });

  // Create notification for assignee if assigned
  if (validatedAssignee) {
    const notification = await Notification.create({
      recipient: validatedAssignee,
      sender: req.user._id,
      type: 'TICKET_ASSIGNED',
      message: `You have been assigned to ticket: ${ticket.title}`,
      relatedTicket: ticket._id,
      relatedProject: projectId,
    });
    
    // Emit socket event for real-time notification
    emitSocketEvent('notification', {
      ...notification.toObject(),
      project: projectId
    });
  }

  // Create activity log
  await Activity.create({
    user: req.user.id,
    action: `created ticket "${ticket.title}"`,
    targetType: 'Ticket',
    targetId: ticket._id,
    targetName: ticket.title,
    project: ticket.project,
  });

  // Emit socket event for real-time ticket creation
  const populatedTicket = await Ticket.findById(ticket._id)
    .populate('assignee', 'name email')
    .populate('reporter', 'name email');
  
  emitSocketEvent('ticket-created', {
    ticket: populatedTicket,
    project: projectId
  });

  res.status(201).json(ticket);
});


// @desc    Get all tickets for a specific project (and optionally filter/search)
// @route   GET /api/tickets/:projectId
// @access  Private
const getTicketsByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, priority, assignee, search } = req.query;

  const projectExists = await Project.findById(projectId);
  if (!projectExists) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (!await isProjectMember(projectId, req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to view tickets in this project');
  }

  let query = { project: projectId };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignee) query.assignee = assignee;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const tickets = await Ticket.find(query)
    .populate('assignee', 'name email')
    .populate('reporter', 'name email');

  res.status(200).json(tickets);
});

// @desc    Get a single ticket by ID
// @route   GET /api/tickets/single/:id
// @access  Private
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('project', 'title owner teamMembers')
    .populate('assignee', 'name email')
    .populate('reporter', 'name email');

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  if (!await isProjectMember(ticket.project._id, req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to view this ticket');
  }

  res.status(200).json(ticket);
});


// @desc    Update a ticket
// @route   PUT /api/tickets/:id
// @access  Private
const updateTicket = asyncHandler(async (req, res) => {
  const { title, description, status, priority, assignee, type, dueDate } = req.body;

  let ticket = await Ticket.findById(req.params.id).populate('project', 'owner teamMembers');

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  if (!await isProjectMember(ticket.project._id, req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to update this ticket');
  }

  const originalStatus = ticket.status;
  const originalAssignee = ticket.assignee ? ticket.assignee.toString() : null;

  let validatedAssignee = assignee;
  if (assignee) {
      const assigneeUser = await User.findById(assignee);
      if (!assigneeUser) {
          res.status(400);
          throw new Error('Assignee user not found');
      }
      if (!await isProjectMember(ticket.project._id, assignee)) {
          res.status(400);
          throw new Error('Assignee is not a member of this project');
      }
  } else if (assignee === null) {
      validatedAssignee = null;
  } else {
      validatedAssignee = ticket.assignee;
  }

  ticket.title = title !== undefined ? title : ticket.title;
  ticket.description = description !== undefined ? description : ticket.description;
  ticket.status = status !== undefined ? status : ticket.status;
  ticket.priority = priority !== undefined ? priority : ticket.priority;
  ticket.assignee = validatedAssignee;
  ticket.type = type !== undefined ? type : ticket.type;
  ticket.dueDate = dueDate !== undefined ? dueDate : ticket.dueDate;

  const updatedTicket = await ticket.save();

  // --- Notifications ---
  if (assignee !== undefined && originalAssignee !== validatedAssignee?.toString()) {
    if (validatedAssignee) {
      const notification = await Notification.create({
        recipient: validatedAssignee,
        sender: req.user._id,
        type: 'TICKET_ASSIGNED',
        message: `You have been assigned to ticket: ${ticket.title}`,
        relatedTicket: ticket._id,
        relatedProject: ticket.project._id,
      });
      
      // Emit socket event for real-time notification
      emitSocketEvent('notification', {
        ...notification.toObject(),
        project: ticket.project._id
      });
    }
  }

  if (status !== undefined && status !== originalStatus) {
    const project = await Project.findById(ticket.project._id);
    const membersToNotify = [project.owner, ...project.teamMembers]
      .filter(member => member.toString() !== req.user._id.toString());

    const notificationPromises = membersToNotify.map(async (member) => {
      const notification = await Notification.create({
        recipient: member,
        sender: req.user._id,
        type: 'TICKET_UPDATED',
        message: `Ticket "${ticket.title}" status changed to ${status}`,
        relatedTicket: ticket._id,
        relatedProject: ticket.project._id,
      });
      
      // Emit socket event for real-time notification
      emitSocketEvent('notification', {
        ...notification.toObject(),
        project: ticket.project._id
      });
      
      return notification;
    });
    
    await Promise.all(notificationPromises);
  }

  // --- Activity Logging ---
  let actionMessage = `updated ticket "${updatedTicket.title}"`;
  if (status && status !== originalStatus) {
      actionMessage = `changed status of ticket "${updatedTicket.title}" from "${originalStatus}" to "${status}"`;
  } else if (assignee !== undefined && originalAssignee !== validatedAssignee?.toString()) {
      const newAssigneeName = validatedAssignee ? (await User.findById(validatedAssignee))?.name : 'Unassigned';
      actionMessage = `reassigned ticket "${updatedTicket.title}" to ${newAssigneeName}`;
  }

  await Activity.create({
    user: req.user.id,
    action: actionMessage,
    targetType: 'Ticket',
    targetId: updatedTicket._id,
    targetName: updatedTicket.title,
    project: updatedTicket.project,
  });

  await updatedTicket.populate('assignee', 'name email');
  await updatedTicket.populate('reporter', 'name email');

  // Emit socket event for real-time ticket update
  emitSocketEvent('ticket-updated', {
    ticket: updatedTicket,
    project: updatedTicket.project._id
  });

  res.status(200).json(updatedTicket);
});

// @desc    Delete a ticket
// @route   DELETE /api/tickets/:id
// @access  Private (Only project owner or ticket reporter can delete)
const deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id).populate('project', 'owner');

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  const isProjectOwner = ticket.project.owner.toString() === req.user._id.toString();
  const isTicketReporter = ticket.reporter.toString() === req.user._id.toString();

  if (!isProjectOwner && !isTicketReporter) {
    res.status(403);
    throw new Error('Not authorized to delete this ticket');
  }

  const projectId = ticket.project._id;
  const ticketTitle = ticket.title;
  const ticketId = ticket._id;

  await ticket.deleteOne();

  // Emit socket event for real-time ticket deletion
  emitSocketEvent('ticket-deleted', {
    ticketId: ticketId,
    projectId: projectId
  });

  await Activity.create({
    user: req.user.id,
    action: `deleted ticket "${ticketTitle}"`,
    targetType: 'Ticket',
    targetId: ticketId,
    targetName: ticketTitle,
    project: projectId,
  });

  res.status(200).json({ message: 'Ticket removed' });
});

module.exports = {
  createTicket,
  getTicketsByProject,
  getTicketById,
  updateTicket,
  deleteTicket,
};