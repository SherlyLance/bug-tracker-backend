// In backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Assuming you have bcrypt for password hashing

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
    },
    role: { // Add this field
      type: String,
      enum: ['member', 'admin'], // Define possible roles
      default: 'member', // Default role for new users
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware (should already be there)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database (should already be there)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);