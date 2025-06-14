const asyncHandler = require('express-async-handler');
const Ticket = require('../models/Ticket');
const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Generate project statistics report
// @route   GET /api/reports/project/:projectId
// @access  Private
const getProjectReport = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  
  // Check if user is a member of the project
  const isOwner = project.owner.toString() === req.user._id.toString();
  const isMember = project.teamMembers.some(member => member.toString() === req.user._id.toString());
  
  if (!isOwner && !isMember) {
    return res.status(403).json({ message: 'Not authorized to access this project' });
  }
  
  // Get all tickets for the project
  const tickets = await Ticket.find({ project: projectId });
  
  // Calculate statistics
  const totalTickets = tickets.length;
  
  // Status breakdown
  const statusCounts = {};
  tickets.forEach(ticket => {
    statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
  });
  
  // Priority breakdown
  const priorityCounts = {};
  tickets.forEach(ticket => {
    priorityCounts[ticket.priority] = (priorityCounts[ticket.priority] || 0) + 1;
  });
  
  // Type breakdown
  const typeCounts = {};
  tickets.forEach(ticket => {
    typeCounts[ticket.type] = (typeCounts[ticket.type] || 0) + 1;
  });
  
  // Assignee breakdown
  const assigneeCounts = {};
  for (const ticket of tickets) {
    if (ticket.assignee) {
      const assigneeId = ticket.assignee.toString();
      assigneeCounts[assigneeId] = (assigneeCounts[assigneeId] || 0) + 1;
    }
  }
  
  // Get assignee names
  const assigneeData = [];
  for (const [assigneeId, count] of Object.entries(assigneeCounts)) {
    const user = await User.findById(assigneeId).select('name');
    if (user) {
      assigneeData.push({
        assigneeId,
        name: user.name,
        count,
      });
    }
  }
  
  // Calculate average time to resolution (for completed tickets)
  const completedTickets = tickets.filter(ticket => ticket.status === 'Done');
  let avgResolutionTime = 0;
  
  if (completedTickets.length > 0) {
    const totalResolutionTime = completedTickets.reduce((sum, ticket) => {
      const createdAt = new Date(ticket.createdAt);
      const updatedAt = new Date(ticket.updatedAt);
      return sum + (updatedAt - createdAt);
    }, 0);
    
    avgResolutionTime = totalResolutionTime / completedTickets.length / (1000 * 60 * 60 * 24); // in days
  }
  
  // Prepare report data
  const reportData = {
    projectId,
    projectName: project.title,
    totalTickets,
    statusBreakdown: statusCounts,
    priorityBreakdown: priorityCounts,
    typeBreakdown: typeCounts,
    assigneeBreakdown: assigneeData,
    avgResolutionTime: avgResolutionTime.toFixed(2), // in days, rounded to 2 decimal places
  };
  
  res.status(200).json(reportData);
});

// @desc    Generate user workload report
// @route   GET /api/reports/user/:userId
// @access  Private (Admin or self)
const getUserWorkloadReport = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Check authorization (only admin or the user themselves)
  if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
    return res.status(403).json({ message: 'Not authorized to access this report' });
  }
  
  // Get user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  // Get all tickets assigned to the user
  const assignedTickets = await Ticket.find({ assignee: userId })
    .populate('project', 'title');
  
  // Calculate statistics
  const totalAssigned = assignedTickets.length;
  
  // Status breakdown
  const statusCounts = {};
  assignedTickets.forEach(ticket => {
    statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
  });
  
  // Priority breakdown
  const priorityCounts = {};
  assignedTickets.forEach(ticket => {
    priorityCounts[ticket.priority] = (priorityCounts[ticket.priority] || 0) + 1;
  });
  
  // Project breakdown
  const projectCounts = {};
  assignedTickets.forEach(ticket => {
    const projectId = ticket.project._id.toString();
    const projectName = ticket.project.title;
    
    if (!projectCounts[projectId]) {
      projectCounts[projectId] = {
        name: projectName,
        count: 0,
      };
    }
    
    projectCounts[projectId].count++;
  });
  
  // Prepare report data
  const reportData = {
    userId,
    userName: user.name,
    totalAssigned,
    statusBreakdown: statusCounts,
    priorityBreakdown: priorityCounts,
    projectBreakdown: Object.values(projectCounts),
  };
  
  res.status(200).json(reportData);
});

// @desc    Export tickets as CSV
// @route   GET /api/reports/export/tickets/:projectId
// @access  Private
const exportTicketsCSV = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  
  // Check if user is a member of the project
  const isOwner = project.owner.toString() === req.user._id.toString();
  const isMember = project.teamMembers.some(member => member.toString() === req.user._id.toString());
  
  if (!isOwner && !isMember) {
    return res.status(403).json({ message: 'Not authorized to access this project' });
  }
  
  // Get all tickets for the project with populated fields
  const tickets = await Ticket.find({ project: projectId })
    .populate('assignee', 'name email')
    .populate('reporter', 'name email');
  
  // Create CSV header
  let csv = 'ID,Title,Description,Status,Priority,Type,Assignee,Reporter,Created At,Updated At\n';
  
  // Add ticket data
  tickets.forEach(ticket => {
    // Escape commas and quotes in text fields
    const escapeCSV = (text) => {
      if (!text) return '';
      const str = String(text).replace(/"/g, '""');
      return str.includes(',') ? `"${str}"` : str;
    };
    
    const row = [
      ticket._id,
      escapeCSV(ticket.title),
      escapeCSV(ticket.description),
      ticket.status,
      ticket.priority,
      ticket.type,
      ticket.assignee ? escapeCSV(ticket.assignee.name) : 'Unassigned',
      ticket.reporter ? escapeCSV(ticket.reporter.name) : 'Unknown',
      ticket.createdAt,
      ticket.updatedAt
    ];
    
    csv += row.join(',') + '\n';
  });
  
  // Set response headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="tickets-${projectId}.csv"`);
  
  res.status(200).send(csv);
});

module.exports = {
  getProjectReport,
  getUserWorkloadReport,
  exportTicketsCSV,
};