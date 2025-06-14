// In backend/controllers/userController.js (assuming asyncHandler is already imported)
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const jwt = require('jsonwebtoken'); // Assuming you have this
const Activity = require('../models/Activity'); // Assuming this is imported

// ... (existing registerUser, loginUser, getMe functions) ...

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Hash password (assuming bcrypt is handled by User model pre-save hook)
  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    // Log activity
    await Activity.create({
        user: user._id,
        action: 'registered as a new user',
        targetType: 'User',
        targetId: user._id,
        targetName: user.name,
        project: null,
    });

    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role, // Include role in response
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role, // Include role in response
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid credentials');
  }
});

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by the protect middleware and already contains the role
  res.status(200).json(req.user);
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password'); // Exclude password
  res.json(users);
});

// @desc    Update user role by ID
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  const { role } = req.body;

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Prevent admin from changing their own role via this endpoint
  if (user._id.toString() === req.user.id && role !== user.role) {
      res.status(400);
      throw new Error("Admins cannot change their own role through this interface.");
  }

  // Optional: Prevent demoting other admins without higher privilege (more complex)
  // For simplicity, we'll allow an admin to change another admin's role here,
  // but the above check prevents self-demotion.

  user.role = role || user.role; // Only allow 'role' to be updated via this endpoint. Ensure 'role' is passed in body.

  const updatedUser = await user.save();

  // Log activity
  await Activity.create({
      user: req.user.id,
      action: `changed role of ${updatedUser.name} to ${updatedUser.role}`,
      targetType: 'User',
      targetId: updatedUser._id,
      targetName: updatedUser.name,
      project: null,
  });

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
  });
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getUsers,
  updateUserRole,
};