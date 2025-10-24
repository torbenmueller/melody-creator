const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	email: { type: String, required: true },
	password: { type: String, required: true },
	resetToken: String,
	resetTokenExpiration: Date,
	// Email verification fields
	isEmailVerified: { type: Boolean, default: false },
	emailVerificationToken: String,
	emailVerificationTokenExpiration: Date,
	plan: String,
	melodiesLeft: Number,
	freePlanUsed: Boolean,
	time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);