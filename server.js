// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import routes
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const ticketRoutes = require('./routes/ticketRoutes'); // Import the new ticket routes
const activityRoutes = require('./routes/activityRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
dotenv.config();

const app = express();
app.use('/api/activities', activityRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully!');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Basic Route for testing the server
app.get('/', (req, res) => {
  res.send('Bug Tracker API is running...');
});

// --- Use Routes ---
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes); // Add the new ticket routes here

const PORT = process.env.PORT || 5001;

// Create HTTP server and initialize Socket.io
const server = require('http').createServer(app);
const socketIO = require('./socket').init(server);

// Socket.io connection handler
socketIO.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join project-specific rooms for targeted updates
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`Socket ${socket.id} joined project-${projectId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the backend at: http://localhost:${PORT}`);
});
