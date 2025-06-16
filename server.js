// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// --- CORS Configuration ---
const allowedOrigins = [
  "http://localhost:3000",                      // Local dev
  "https://bug-tracker-ofdj.vercel.app",        // Production frontend on Vercel
  "https://bug-tracker-ofdj-git-main-sherly-lance-hs-projects.vercel.app", // Git branch deployment on Vercel
  "https://bug-tracker-ofdj-sherly-lance-hs-projects.vercel.app"          // Additional Vercel deployment URL
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 🛠️ Handle preflight requests

// --- Middleware ---
app.use(express.json());

// --- MongoDB Connection (temporarily bypassed for testing) ---
console.log('MongoDB connection bypassed for testing purposes.');
// Set global flag for bypassed MongoDB connection
global.bypassMongoDB = true;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully!');
  })
  .catch((err) => {
     console.error('MongoDB connection error:', err);
    process.exit(1);
 });

// --- Import Routes ---
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const activityRoutes = require('./routes/activityRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');

// --- Route Bindings ---
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// --- Test Route ---
app.get('/', (req, res) => {
  res.send('Bug Tracker API is running...');
});

// --- Create Server and Attach Socket.io ---
const PORT = process.env.PORT || 5001;
const server = require('http').createServer(app);
const socketIO = require('./socket').init(server);

// --- Socket.io Logic ---
socketIO.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`Socket ${socket.id} joined project-${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// --- Start Server ---
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the backend at: http://localhost:${PORT}`);
});